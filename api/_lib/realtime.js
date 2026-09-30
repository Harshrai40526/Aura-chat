import { EventEmitter } from 'events';

if (!global.realtimeBus) {
  global.realtimeBus = new EventEmitter();
  global.realtimeBus.setMaxListeners(500);
}

export const realtimeBus = global.realtimeBus;

export function broadcastRealtimeEvent(channel, event, data) {
  try {
    realtimeBus.emit('realtime_event', { channel, event, data });
  } catch (err) {
    console.error('Realtime EventBus Emit Error:', err);
  }
}
