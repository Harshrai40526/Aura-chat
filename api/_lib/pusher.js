import Pusher from 'pusher';
import { broadcastRealtimeEvent } from './realtime.js';

let pusherInstance = null;

export function getPusherServer() {
  if (pusherInstance) return pusherInstance;

  const appId = process.env.PUSHER_APP_ID;
  const key = process.env.PUSHER_KEY || process.env.VITE_PUSHER_APP_KEY;
  const secret = process.env.PUSHER_SECRET;
  const cluster = process.env.PUSHER_CLUSTER || process.env.VITE_PUSHER_APP_CLUSTER || 'mt1';

  if (appId && key && secret) {
    pusherInstance = new Pusher({
      appId,
      key,
      secret,
      cluster,
      useTLS: true,
    });
  } else {
    // Mock pusher server for dev when credentials are missing
    pusherInstance = {
      trigger: async (channel, event, data) => {
        // Handled by SSE EventBus
      },
      authenticate: (socketId, channelData) => {
        return { auth: 'mock_auth' };
      }
    };
  }

  return pusherInstance;
}

export async function triggerPusherEvent(channel, event, data) {
  try {
    // 1. Broadcast over SSE EventBus
    broadcastRealtimeEvent(channel, event, data);

    // 2. Trigger over Pusher Channels if configured
    const pusher = getPusherServer();
    await pusher.trigger(channel, event, data);
  } catch (err) {
    console.error('❌ Realtime Event Trigger Error:', err.message);
  }
}
