import { connectToDatabase } from './_lib/mongodb.js';
import Conversation from './_models/Conversation.js';
import Group from './_models/Group.js';
import User from './_models/User.js';
import Message from './_models/Message.js';
import { requireAuth } from './_lib/auth.js';
import { successResponse, errorResponse } from './_lib/response.js';

export default async function handler(req, res) {
  const action = req.query.action || req.url.split('?')[0].split('/').pop();

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await connectToDatabase();

    // 1. GET: List all conversations
    if (req.method === 'GET') {
      const conversations = await Conversation.find({ participants: auth.userId })
        .populate('participants', 'name username uniqueUserId profilePicture lastSeen privacy publicKey')
        .sort({ updatedAt: -1 });

      const conversationList = await Promise.all(
        conversations.map(async (conv) => {
          const convObj = conv.toObject();
          convObj._id = convObj._id.toString();

          if (conv.type === 'group') {
            const groupInfo = await Group.findOne({ conversationId: conv._id })
              .populate('members admins creatorId', 'name username profilePicture uniqueUserId');
            convObj.group = groupInfo;
          }

          const unreadCount = await Message.countDocuments({
            conversationId: conv._id,
            senderId: { $ne: auth.userId },
            'readBy.userId': { $ne: auth.userId },
            deletedAt: { $exists: false },
          });
          convObj.unreadCount = unreadCount;
          return convObj;
        })
      );

      return successResponse(res, { conversations: conversationList });
    }

    // 2. POST: Create or fetch private conversation
    if (req.method === 'POST') {
      const { recipientId, userId } = req.body;
      const targetUserId = recipientId || userId;

      if (!targetUserId) return errorResponse(res, 'Target User ID is required', 400);
      if (targetUserId.toString() === auth.userId.toString()) return errorResponse(res, 'Cannot start conversation with yourself', 400);

      const recipient = await User.findById(targetUserId);
      if (!recipient) return errorResponse(res, 'Recipient user not found', 404);

      let conversation = await Conversation.findOne({
        type: 'private',
        participants: { $all: [auth.userId, targetUserId], $size: 2 },
      }).populate('participants', 'name username uniqueUserId profilePicture lastSeen privacy publicKey');

      if (!conversation) {
        conversation = await Conversation.create({
          type: 'private',
          participants: [auth.userId, targetUserId],
        });
        conversation = await Conversation.findById(conversation._id)
          .populate('participants', 'name username uniqueUserId profilePicture lastSeen privacy publicKey');
      }

      const convObj = conversation.toObject();
      convObj._id = convObj._id.toString();
      return successResponse(res, { conversation: convObj }, 'Conversation retrieved', 200);
    }

    return errorResponse(res, 'Method not allowed', 405);
  } catch (err) {
    console.error('Conversations Module Error:', err);
    return errorResponse(res, err.message || 'Error processing conversation', 500);
  }
}
