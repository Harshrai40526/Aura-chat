import { connectToDatabase } from './_lib/mongodb.js';
import Conversation from './_models/Conversation.js';
import Group from './_models/Group.js';
import { requireAuth } from './_lib/auth.js';
import { successResponse, errorResponse } from './_lib/response.js';
import { generateUniqueId } from './_lib/otp.js';
import { triggerPusherEvent } from './_lib/pusher.js';

export default async function handler(req, res) {
  const action = req.query.action || req.url.split('?')[0].split('/').pop();

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await connectToDatabase();

    // 1. GET USER GROUPS
    if (req.method === 'GET' && !action) {
      const groups = await Group.find({ members: auth.userId })
        .populate('conversationId')
        .populate('members admins creatorId', 'name username profilePicture uniqueUserId');
      return successResponse(res, { groups });
    }

    // 2. CREATE GROUP
    if (req.method === 'POST') {
      const { name, description, profilePicture, memberIds = [] } = req.body;
      if (!name || name.trim().length === 0) return errorResponse(res, 'Group name is required', 400);

      const allMembers = Array.from(new Set([auth.userId, ...memberIds]));
      const conversation = await Conversation.create({
        type: 'group',
        participants: allMembers,
        lastMessage: { text: `Group "${name.trim()}" created`, senderId: auth.userId, createdAt: new Date() },
      });

      const uniqueGroupId = generateUniqueId('GRP');
      const group = await Group.create({
        conversationId: conversation._id,
        uniqueGroupId,
        name: name.trim(),
        description: description ? description.trim() : '',
        profilePicture: profilePicture || '',
        creatorId: auth.userId,
        admins: [auth.userId],
        members: allMembers,
      });

      const populated = await Group.findById(group._id)
        .populate('conversationId')
        .populate('members admins creatorId', 'name username profilePicture uniqueUserId');

      for (const mId of allMembers) {
        await triggerPusherEvent(`user:${mId.toString()}`, 'notification', { type: 'group_created', group: populated });
      }

      return successResponse(res, { group: populated }, 'Group created', 201);
    }

    // 3. GET / EDIT / LEAVE INDIVIDUAL GROUP
    if (action || req.query.id) {
      const targetId = action || req.query.id;
      let group = await Group.findOne({
        $or: [{ _id: targetId }, { conversationId: targetId }, { uniqueGroupId: targetId }],
      }).populate('members admins creatorId', 'name username profilePicture uniqueUserId');

      if (!group) return errorResponse(res, 'Group not found', 404);

      if (req.method === 'GET') return successResponse(res, { group });

      const isAdmin = group.admins.some(a => (a._id || a).toString() === auth.userId);

      if (req.method === 'PUT') {
        const { name, description, profilePicture, addMembers, removeMembers, promoteAdmin, demoteAdmin } = req.body;
        if (name || description !== undefined || profilePicture !== undefined) {
          if (!isAdmin) return errorResponse(res, 'Only admins can edit group settings', 403);
          if (name) group.name = name.trim();
          if (description !== undefined) group.description = description.trim();
          if (profilePicture !== undefined) group.profilePicture = profilePicture;
        }

        if (addMembers && Array.isArray(addMembers)) {
          if (!isAdmin) return errorResponse(res, 'Only admins can add members', 403);
          const newMembers = addMembers.filter(mId => !group.members.some(m => (m._id || m).toString() === mId));
          group.members.push(...newMembers);
        }

        if (removeMembers && Array.isArray(removeMembers)) {
          if (!isAdmin) return errorResponse(res, 'Only admins can remove members', 403);
          group.members = group.members.filter(m => !removeMembers.includes((m._id || m).toString()));
          group.admins = group.admins.filter(a => !removeMembers.includes((a._id || a).toString()));
        }

        if (promoteAdmin && Array.isArray(promoteAdmin)) {
          if (!isAdmin) return errorResponse(res, 'Only admins can promote members', 403);
          const newAdmins = promoteAdmin.filter(aId => !group.admins.some(a => (a._id || a).toString() === aId));
          group.admins.push(...newAdmins);
        }

        if (demoteAdmin && Array.isArray(demoteAdmin)) {
          if (!isAdmin) return errorResponse(res, 'Only admins can demote members', 403);
          group.admins = group.admins.filter(a => !demoteAdmin.includes((a._id || a).toString()));
        }

        await group.save();
        await Conversation.findByIdAndUpdate(group.conversationId, { participants: group.members.map(m => m._id || m) });

        const updated = await Group.findById(group._id).populate('members admins creatorId', 'name username profilePicture uniqueUserId');
        await triggerPusherEvent(`conversation:${group.conversationId}`, 'group_updated', { group: updated });
        return successResponse(res, { group: updated }, 'Group updated');
      }

      if (req.method === 'DELETE') {
        group.members = group.members.filter(m => (m._id || m).toString() !== auth.userId);
        group.admins = group.admins.filter(a => (a._id || a).toString() !== auth.userId);
        await group.save();
        await Conversation.findByIdAndUpdate(group.conversationId, { participants: group.members.map(m => m._id || m) });
        await triggerPusherEvent(`conversation:${group.conversationId}`, 'user_left_group', { userId: auth.userId, conversationId: group.conversationId });
        return successResponse(res, {}, 'Left group successfully');
      }
    }

    return errorResponse(res, 'Invalid Groups Action', 404);
  } catch (err) {
    console.error('Groups Module Error:', err);
    return errorResponse(res, err.message || 'Error processing group request', 500);
  }
}
