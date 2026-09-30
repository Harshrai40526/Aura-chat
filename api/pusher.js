import { getPusherServer } from './_lib/pusher.js';
import { requireAuth } from './_lib/auth.js';
import { errorResponse } from './_lib/response.js';
import User from './_models/User.js';
import { connectToDatabase } from './_lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return errorResponse(res, 'Method not allowed', 405);
  }

  try {
    const auth = await requireAuth(req, res);
    if (!auth) return;

    await connectToDatabase();
    const user = await User.findById(auth.userId).select('name username profilePicture');

    const socketId = req.body.socket_id;
    const channelName = req.body.channel_name;

    if (!socketId || !channelName) {
      return errorResponse(res, 'socket_id and channel_name are required', 400);
    }

    const pusher = getPusherServer();

    let authResponse;
    if (channelName.startsWith('presence-')) {
      const channelData = {
        user_id: auth.userId,
        user_info: {
          name: user ? user.name : auth.username,
          username: auth.username,
          profilePicture: user ? user.profilePicture : '',
        },
      };
      authResponse = pusher.authenticate(socketId, channelName, channelData);
    } else {
      authResponse = pusher.authenticate(socketId, channelName);
    }

    return res.send(authResponse);

  } catch (err) {
    console.error('Pusher Auth Error:', err);
    return errorResponse(res, err.message || 'Error authenticating Pusher channel', 500);
  }
}
