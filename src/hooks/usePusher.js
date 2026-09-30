import { useEffect, useRef, useState } from 'react';
import Pusher from 'pusher-js';
import { useAuthStore } from '../store/useAuthStore.js';
import { useChatStore } from '../store/useChatStore.js';
import { playNotificationSound } from './useNotifications.js';

const PUSHER_KEY = import.meta.env.VITE_PUSHER_APP_KEY || 'mock_pusher_key';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'mt1';
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function usePusher() {
  const user = useAuthStore((state) => state.user);
  const activeConversationId = useChatStore((state) => state.activeConversationId);

  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const deleteMessage = useChatStore((state) => state.deleteMessage);
  const setTypingUser = useChatStore((state) => state.setTypingUser);
  const setPresenceMembers = useChatStore((state) => state.setPresenceMembers);
  const userJoinedPresence = useChatStore((state) => state.userJoinedPresence);
  const userLeftPresence = useChatStore((state) => state.userLeftPresence);
  const fetchConversations = useChatStore((state) => state.fetchConversations);

  const [connectionStatus, setConnectionStatus] = useState('Connected');
  const pusherRef = useRef(null);

  // Connection Online/Offline detector
  useEffect(() => {
    const handleOnline = () => setConnectionStatus('Connected');
    const handleOffline = () => setConnectionStatus('Offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // 1. Dual-Engine Realtime Subscription (Pusher Channels + SSE Stream Fallback)
  useEffect(() => {
    if (!user) return;

    // --- Engine A: SSE Realtime EventSource Stream ---
    const sseUrl = `${API_BASE_URL}/api/realtime/stream?userId=${user._id}`;
    let sseSource = new EventSource(sseUrl);

    sseSource.onopen = () => {
      console.log('[Realtime] Connection established: Connected (SSE Stream)');
      setConnectionStatus('Connected');
    };

    sseSource.onerror = () => {
      setConnectionStatus('Reconnecting');
    };

    sseSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (!payload || !payload.channel) return;

        const { channel, event, data } = payload;
        const currentActiveId = useChatStore.getState().activeConversationId;

        // Check if event targets active conversation (e.g. conversation:ID or private-conversation-ID)
        const isConvChannel = channel === `conversation:${currentActiveId}` || channel === `private-conversation-${currentActiveId}`;
        const isUserChannel = channel === `user:${user._id}` || channel === `private-user-${user._id}`;

        if (isConvChannel) {
          if (event === 'new_message' && data.message) {
            console.log('[Realtime] Message received:', data.message._id, 'on conversation:', currentActiveId);
            addMessage(currentActiveId, data.message);
          } else if (event === 'message_updated' && data.message) {
            updateMessage(currentActiveId, data.message);
          } else if (event === 'message_deleted' && data.messageId) {
            deleteMessage(currentActiveId, data.messageId);
          } else if (event === 'reaction_updated') {
            fetchConversations();
          } else if (event === 'typing_started' && data.userId !== user._id) {
            setTypingUser(currentActiveId, data.userId, data.name, true);
          } else if (event === 'typing_stopped' && data.userId !== user._id) {
            setTypingUser(currentActiveId, data.userId, data.name, false);
          }
        }

        if (isUserChannel && event === 'notification') {
          playNotificationSound();
          fetchConversations();
        }
      } catch (err) {
        // SSE parse error
      }
    };

    // --- Engine B: Pusher Channels Client ---
    const pusher = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: `${API_BASE_URL}/api/pusher/auth`,
    });

    pusherRef.current = pusher;

    // Presence Channel
    const presenceChannel = pusher.subscribe('presence-chat-app');
    presenceChannel.bind('pusher:subscription_succeeded', (members) => {
      const onlineObj = {};
      members.each((m) => { onlineObj[m.id] = m.info; });
      setPresenceMembers(onlineObj);
    });
    presenceChannel.bind('pusher:member_added', (m) => userJoinedPresence(m.id, m.info));
    presenceChannel.bind('pusher:member_removed', (m) => userLeftPresence(m.id));

    return () => {
      sseSource.close();
      pusher.unsubscribe('presence-chat-app');
      pusher.disconnect();
    };
  }, [user]);

  // 2. Active Conversation Subscription
  useEffect(() => {
    if (!user || !activeConversationId || !pusherRef.current) return;

    console.log('[Realtime] Subscribed to conversation:', activeConversationId);

    const chName = `conversation:${activeConversationId}`;
    const pChName = `private-conversation-${activeConversationId}`;

    const channel = pusherRef.current.subscribe(chName);
    const pChannel = pusherRef.current.subscribe(pChName);

    const handleNewMessage = (data) => {
      if (data.message) {
        console.log('[Realtime] Message received:', data.message._id, 'on conversation:', activeConversationId);
        addMessage(activeConversationId, data.message);
      }
    };

    channel.bind('new_message', handleNewMessage);
    pChannel.bind('new_message', handleNewMessage);

    return () => {
      channel.unbind_all();
      pChannel.unbind_all();
      pusherRef.current?.unsubscribe(chName);
      pusherRef.current?.unsubscribe(pChName);
    };
  }, [user, activeConversationId]);

  return { connectionStatus };
}
