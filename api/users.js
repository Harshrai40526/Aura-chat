import { connectToDatabase } from './_lib/mongodb.js';
import User from './_models/User.js';
import { requireAuth } from './_lib/auth.js';
import { successResponse, errorResponse } from './_lib/response.js';

export default async function handler(req, res) {
  const action = req.query.action || req.url.split('?')[0].split('/').pop();

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await connectToDatabase();

    // 1. SEARCH USERS
    if (action === 'search' || (!action && req.query.query)) {
      const { query } = req.query;
      if (!query || query.trim().length === 0) {
        return successResponse(res, { users: [] });
      }

      const searchTerm = query.trim();
      const isUniqueIdSearch = searchTerm.toUpperCase().startsWith('USR_');

      let searchFilter;
      if (isUniqueIdSearch) {
        searchFilter = { uniqueUserId: searchTerm.toUpperCase() };
      } else {
        const regex = new RegExp(searchTerm, 'i');
        searchFilter = {
          $or: [{ username: regex }, { name: regex }, { uniqueUserId: searchTerm.toUpperCase() }],
        };
      }

      const currentUser = await User.findById(auth.userId);
      const blockedIds = currentUser ? currentUser.blockedUsers : [];

      const users = await User.find({
        ...searchFilter,
        _id: { $ne: auth.userId, $nin: blockedIds },
        isVerified: true,
      })
        .select('name username uniqueUserId profilePicture bio lastSeen privacy publicKey')
        .limit(20);

      return successResponse(res, { users });
    }

    // 2. PROFILE
    if (action === 'profile') {
      if (req.method === 'GET') {
        const { id } = req.query;
        const targetId = id || auth.userId;
        const user = await User.findById(targetId).select('-passwordHash');
        if (!user) return errorResponse(res, 'User not found', 404);
        return successResponse(res, { user });
      }
      if (req.method === 'PUT') {
        const { name, bio, profilePicture, publicKey } = req.body;
        const user = await User.findById(auth.userId);
        if (!user) return errorResponse(res, 'User not found', 404);

        if (name) user.name = name.trim();
        if (bio !== undefined) user.bio = bio.trim();
        if (profilePicture !== undefined) user.profilePicture = profilePicture;
        if (publicKey !== undefined) user.publicKey = publicKey;

        await user.save();
        const updatedObj = user.toObject();
        delete updatedObj.passwordHash;
        return successResponse(res, { user: updatedObj }, 'Profile updated successfully');
      }
    }

    // 3. PRIVACY
    if (action === 'privacy') {
      const user = await User.findById(auth.userId);
      if (!user) return errorResponse(res, 'User not found', 404);
      if (req.method === 'GET') return successResponse(res, { privacy: user.privacy });
      if (req.method === 'PUT') {
        const { profilePicture, lastSeen, onlineStatus, readReceipts } = req.body;
        if (profilePicture) user.privacy.profilePicture = profilePicture;
        if (lastSeen) user.privacy.lastSeen = lastSeen;
        if (onlineStatus) user.privacy.onlineStatus = onlineStatus;
        if (readReceipts !== undefined) user.privacy.readReceipts = readReceipts;
        await user.save();
        return successResponse(res, { privacy: user.privacy }, 'Privacy settings updated');
      }
    }

    // 4. BLOCK / UNBLOCK
    if (action === 'block') {
      const user = await User.findById(auth.userId);
      if (req.method === 'GET') {
        const blockedUsers = await User.find({ _id: { $in: user.blockedUsers } }).select('name username uniqueUserId profilePicture');
        return successResponse(res, { blockedUsers });
      }
      if (req.method === 'POST') {
        const { targetUserId, action: blockAction } = req.body;
        if (!targetUserId) return errorResponse(res, 'Target user ID is required', 400);

        if (blockAction === 'block') {
          if (!user.blockedUsers.includes(targetUserId)) {
            user.blockedUsers.push(targetUserId);
            await user.save();
          }
          return successResponse(res, { blockedUsers: user.blockedUsers }, 'User blocked');
        } else if (blockAction === 'unblock') {
          user.blockedUsers = user.blockedUsers.filter(id => id.toString() !== targetUserId.toString());
          await user.save();
          return successResponse(res, { blockedUsers: user.blockedUsers }, 'User unblocked');
        }
      }
    }

    return errorResponse(res, 'Invalid Users Action', 404);
  } catch (err) {
    console.error('Users Module Error:', err);
    return errorResponse(res, err.message || 'Error processing users request', 500);
  }
}
