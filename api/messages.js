import { connectToDatabase } from './_lib/mongodb.js';
import Conversation from './_models/Conversation.js';
import Message from './_models/Message.js';
import User from './_models/User.js';
import { requireAuth } from './_lib/auth.js';
import { successResponse, errorResponse } from './_lib/response.js';
import { triggerPusherEvent } from './_lib/pusher.js';

export default async function handler(req, res) {
  const action = req.query.action || req.url.split('?')[0].split('/').pop();

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await connectToDatabase();

    // 1. REACT TO MESSAGE
    if (action === 'react') {
      const { messageId, emoji } = req.body;
      if (!messageId || !emoji) return errorResponse(res, 'Message ID and emoji required', 400);
      const message = await Message.findById(messageId);
      if (!message) return errorResponse(res, 'Message not found', 404);

      const existingIdx = message.reactions.findIndex(r => r.userId.toString() === auth.userId && r.emoji === emoji);
      if (existingIdx > -1) {
        message.reactions.splice(existingIdx, 1);
      } else {
        message.reactions = message.reactions.filter(r => r.userId.toString() !== auth.userId);
        message.reactions.push({ userId: auth.userId, emoji });
      }
      await message.save();

      const populated = await Message.findById(message._id).populate('senderId', 'name username profilePicture uniqueUserId').populate('replyTo');
      await triggerPusherEvent(`conversation:${message.conversationId}`, 'reaction_updated', { messageId: message._id, reactions: populated.reactions, conversationId: message.conversationId });
      return successResponse(res, { message: populated });
    }

    // 2. TYPING INDICATOR
    if (action === 'typing') {
      const { conversationId, isTyping } = req.body;
      if (!conversationId) return errorResponse(res, 'Conversation ID required', 400);
      const user = await User.findById(auth.userId).select('name username profilePicture');
      const eventName = isTyping ? 'typing_started' : 'typing_stopped';
      await triggerPusherEvent(`conversation:${conversationId}`, eventName, { conversationId, userId: auth.userId, name: user ? user.name : auth.username });
      return successResponse(res, { status: 'event_broadcasted' });
    }

    // 3. READ RECEIPTS
    if (action === 'read') {
      const { conversationId } = req.body;
      if (!conversationId) return errorResponse(res, 'Conversation ID required', 400);
      await Message.updateMany(
        { conversationId, senderId: { $ne: auth.userId }, 'readBy.userId': { $ne: auth.userId } },
        { $push: { readBy: { userId: auth.userId, readAt: new Date() } } }
      );
      await triggerPusherEvent(`conversation:${conversationId}`, 'message_read', { conversationId, userId: auth.userId, readAt: new Date() });
      return successResponse(res, { conversationId }, 'Read status updated');
    }

    // 4. GET MESSAGES HISTORY
    if (req.method === 'GET') {
      const { conversationId, page = 1, limit = 50 } = req.query;
      if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
        return successResponse(res, { messages: [], page: 1, hasMore: false });
      }

      const conversation = await Conversation.findOne({ _id: conversationId, participants: auth.userId });
      if (!conversation) return successResponse(res, { messages: [], page: 1, hasMore: false });

      const skip = (parseInt(page) - 1) * parseInt(limit);
      const messages = await Message.find({ conversationId, deletedAt: { $exists: false } })
        .populate('senderId', 'name username profilePicture uniqueUserId')
        .populate('replyTo')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

      return successResponse(res, { messages: messages.reverse(), page: parseInt(page), hasMore: messages.length === parseInt(limit) });
    }

    // 5. POST NEW MESSAGE
    if (req.method === 'POST') {
      const { conversationId, messageType = 'text', content = '', encryptedContent = '', isEncrypted = false, attachments = [], replyTo } = req.body;
      if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
        return errorResponse(res, 'Please select a chat/conversation first', 400);
      }

      const conversation = await Conversation.findOne({ _id: conversationId, participants: auth.userId });
      if (!conversation) return errorResponse(res, 'Conversation not found or access denied', 404);

      const newMessage = new Message({
        conversationId,
        senderId: auth.userId,
        messageType,
        content,
        encryptedContent,
        isEncrypted: Boolean(isEncrypted),
        attachments,
        replyTo: replyTo || undefined,
        readBy: [{ userId: auth.userId, readAt: new Date() }],
        deliveredTo: conversation.participants.map(p => ({ userId: p, deliveredAt: new Date() })),
      });

      await newMessage.save();
      const populatedMessage = await Message.findById(newMessage._id).populate('senderId', 'name username profilePicture uniqueUserId').populate('replyTo');
      const msgObj = populatedMessage.toObject();
      msgObj._id = msgObj._id.toString();
      msgObj.conversationId = msgObj.conversationId.toString();

      let lastTextSnippet = content;
      if (isEncrypted) lastTextSnippet = '🔒 Encrypted Message';
      else if (messageType === 'image') lastTextSnippet = '📷 Photo';
      else if (messageType === 'voice') lastTextSnippet = '🎤 Voice Message';
      else if (messageType === 'file') lastTextSnippet = '📄 Attachment';
      else if (messageType === 'sticker') lastTextSnippet = '🎨 Sticker';

      conversation.lastMessage = { text: lastTextSnippet, senderId: auth.userId, createdAt: newMessage.createdAt, messageType };
      await conversation.save();

      const payload = { message: msgObj, conversationId: msgObj.conversationId };
      await triggerPusherEvent(`conversation:${msgObj.conversationId}`, 'new_message', payload);
      await triggerPusherEvent(`private-conversation-${msgObj.conversationId}`, 'new_message', payload);

      const otherParticipants = conversation.participants.filter(p => p.toString() !== auth.userId);
      for (const pId of otherParticipants) {
        const notifPayload = { type: 'new_message', message: msgObj, conversationId: msgObj.conversationId };
        await triggerPusherEvent(`user:${pId.toString()}`, 'notification', notifPayload);
        await triggerPusherEvent(`private-user-${pId.toString()}`, 'notification', notifPayload);
      }

      return successResponse(res, { message: msgObj }, 'Message sent', 201);
    }

    // 6. EDIT OR DELETE MESSAGE
    if (req.method === 'PUT' || req.method === 'DELETE') {
      const { id } = req.query;
      const message = await Message.findById(id);
      if (!message) return errorResponse(res, 'Message not found', 404);
      if (message.senderId.toString() !== auth.userId) return errorResponse(res, 'Unauthorized', 403);

      if (req.method === 'PUT') {
        const { content, encryptedContent } = req.body;
        if (content !== undefined) message.content = content;
        if (encryptedContent !== undefined) message.encryptedContent = encryptedContent;
        message.editedAt = new Date();
        await message.save();

        const populated = await Message.findById(message._id).populate('senderId', 'name username profilePicture uniqueUserId').populate('replyTo');
        await triggerPusherEvent(`conversation:${message.conversationId}`, 'message_updated', { message: populated });
        return successResponse(res, { message: populated }, 'Message updated');
      }

      if (req.method === 'DELETE') {
        message.deletedAt = new Date();
        message.content = 'This message was deleted';
        await message.save();
        await triggerPusherEvent(`conversation:${message.conversationId}`, 'message_deleted', { messageId: message._id, conversationId: message.conversationId });
        return successResponse(res, { messageId: message._id }, 'Message deleted');
      }
    }

    return errorResponse(res, 'Method not allowed', 405);
  } catch (err) {
    console.error('Messages Module Error:', err);
    return errorResponse(res, err.message || 'Error processing message', 500);
  }
}
