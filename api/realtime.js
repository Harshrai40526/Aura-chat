import { realtimeBus } from './_lib/realtime.js';

export default async function handler(req, res) {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const onEvent = ({ channel, event, data }) => {
    try {
      res.write(`data: ${JSON.stringify({ channel, event, data })}\n\n`);
    } catch (e) {
      // Stream closed
    }
  };

  realtimeBus.on('realtime_event', onEvent);

  // Send initial ping to confirm SSE connection
  res.write(`data: ${JSON.stringify({ event: 'connected', timestamp: Date.now() })}\n\n`);

  // Heartbeat ping every 15 seconds to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ event: 'ping', timestamp: Date.now() })}\n\n`);
    } catch (e) {
      clearInterval(pingInterval);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    realtimeBus.off('realtime_event', onEvent);
  });
}
