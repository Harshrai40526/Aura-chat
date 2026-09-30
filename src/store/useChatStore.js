import { create } from 'zustand';
import apiClient from '../services/apiClient.js';
import { encryptE2EEMessage } from '../services/crypto.js';

export const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversationId: null,
  messages: {}, // { [conversationId]: [Message] }
  onlineUsers: {}, // { [userId]: { name, username, profilePicture } }
  typingUsers: {}, // { [conversationId]: { [userId]: userName } }
  isLoadingConversations: false,
  isLoadingMessages: false,
  isE2EEEnabled: false,

  toggleE2EE: () => set((state) => ({ isE2EEEnabled: !state.isE2EEEnabled })),

  // Restore activeConversationId from URL hash or sessionStorage on initial load / refresh
  initActiveConversationFromUrl: (conversationsList) => {
    let savedId = null;

    // Check hash URL e.g. #/chat/CONVERSATION_ID
    const hash = window.location.hash;
    if (hash && hash.includes('/chat/')) {
      savedId = hash.split('/chat/')[1];
    } else {
      savedId = sessionStorage.getItem('activeConversationId');
    }

    if (savedId && conversationsList.some((c) => c._id.toString() === savedId.toString())) {
      get().selectConversation(savedId);
    }
  },

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const res = await apiClient.get('/conversations');
      if (res.success) {
        const convList = res.data.conversations.map((c) => ({
          ...c,
          _id: c._id.toString(),
        }));

        set({ conversations: convList, isLoadingConversations: false });
        get().initActiveConversationFromUrl(convList);
      }
    } catch (err) {
      console.error('Fetch conversations error:', err);
      set({ isLoadingConversations: false });
    }
  },

  selectConversation: async (id) => {
    if (!id || id === 'undefined' || id === 'null') {
      set({ activeConversationId: null });
      sessionStorage.removeItem('activeConversationId');
      window.location.hash = '';
      return;
    }

    const conversationId = id.toString();
    set({ activeConversationId: conversationId });
    sessionStorage.setItem('activeConversationId', conversationId);
    window.location.hash = `#/chat/${conversationId}`;

    await get().fetchMessages(conversationId);
    await get().markAsRead(conversationId);
  },

  // Start or get existing private conversation by target userId
  startPrivateChat: async (targetUserId) => {
    if (!targetUserId) {
      throw new Error('Target user ID is required');
    }

    try {
      const res = await apiClient.post('/conversations/private', { userId: targetUserId });
      if (res.success && res.data.conversation) {
        const conversation = res.data.conversation;
        const conversationId = conversation._id.toString();

        // Update conversations list in state
        set((state) => {
          const exists = state.conversations.some((c) => c._id === conversationId);
          if (exists) {
            return {
              conversations: state.conversations.map((c) => (c._id === conversationId ? conversation : c)),
            };
          } else {
            return {
              conversations: [conversation, ...state.conversations],
            };
          }
        });

        // Set single source of truth activeConversationId & fetch messages
        await get().selectConversation(conversationId);
        return conversation;
      } else {
        throw new Error(res.message || 'Failed to start conversation');
      }
    } catch (err) {
      console.error('startPrivateChat error:', err);
      throw err;
    }
  },

  fetchMessages: async (conversationId) => {
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') {
      return;
    }
    const convId = conversationId.toString();
    set({ isLoadingMessages: true });
    try {
      const res = await apiClient.get(`/messages?conversationId=${convId}`);
      if (res.success) {
        set((state) => ({
          messages: {
            ...state.messages,
            [convId]: res.data.messages,
          },
          isLoadingMessages: false,
        }));
      }
    } catch (err) {
      console.error('Fetch messages error:', err);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async ({ conversationId, content, messageType = 'text', attachments = [], replyTo, recipientPublicKey }) => {
    // Single source of truth activeConversationId validation
    const targetConvId = conversationId || get().activeConversationId;

    if (!targetConvId || targetConvId === 'undefined' || targetConvId === 'null') {
      throw new Error('Please select a chat/conversation first');
    }

    const finalConvId = targetConvId.toString();
    const isE2EE = get().isE2EEEnabled;

    let payload = {
      conversationId: finalConvId,
      messageType,
      content,
      attachments,
      replyTo,
    };

    if (isE2EE && recipientPublicKey && messageType === 'text') {
      const encrypted = await encryptE2EEMessage(content, recipientPublicKey);
      if (encrypted.isEncrypted) {
        payload.isEncrypted = true;
        payload.encryptedContent = encrypted.encryptedContent;
        payload.content = encrypted.content;
      }
    }

    try {
      const res = await apiClient.post('/messages', payload);
      if (res.success) {
        get().addMessage(finalConvId, res.data.message);
        get().fetchConversations();
      }
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  addMessage: (conversationId, message) => {
    if (!conversationId) return;
    const convId = conversationId.toString();
    set((state) => {
      const currentMsgs = state.messages[convId] || [];
      if (currentMsgs.some((m) => m._id === message._id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [convId]: [...currentMsgs, message],
        },
      };
    });
  },

  updateMessage: (conversationId, updatedMsg) => {
    if (!conversationId) return;
    const convId = conversationId.toString();
    set((state) => {
      const currentMsgs = state.messages[convId] || [];
      const newMsgs = currentMsgs.map((m) => (m._id === updatedMsg._id ? updatedMsg : m));
      return {
        messages: {
          ...state.messages,
          [convId]: newMsgs,
        },
      };
    });
  },

  deleteMessage: (conversationId, messageId) => {
    if (!conversationId) return;
    const convId = conversationId.toString();
    set((state) => {
      const currentMsgs = state.messages[convId] || [];
      const newMsgs = currentMsgs.map((m) =>
        m._id === messageId ? { ...m, content: 'This message was deleted', deletedAt: new Date() } : m
      );
      return {
        messages: {
          ...state.messages,
          [convId]: newMsgs,
        },
      };
    });
  },

  markAsRead: async (conversationId) => {
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') return;
    const convId = conversationId.toString();
    try {
      await apiClient.post('/messages/read', { conversationId: convId });
      set((state) => ({
        conversations: state.conversations.map((c) =>
          c._id === convId ? { ...c, unreadCount: 0 } : c
        ),
      }));
    } catch (e) {
      // Non-blocking read error
    }
  },

  setTypingUser: (conversationId, userId, userName, isTyping) => {
    if (!conversationId) return;
    const convId = conversationId.toString();
    set((state) => {
      const currentConvTyping = { ...(state.typingUsers[convId] || {}) };
      if (isTyping) {
        currentConvTyping[userId] = userName;
      } else {
        delete currentConvTyping[userId];
      }
      return {
        typingUsers: {
          ...state.typingUsers,
          [convId]: currentConvTyping,
        },
      };
    });
  },

  sendTypingEvent: async (conversationId, isTyping) => {
    if (!conversationId || conversationId === 'undefined' || conversationId === 'null') return;
    const convId = conversationId.toString();
    try {
      await apiClient.post('/messages/typing', { conversationId: convId, isTyping });
    } catch (e) {
      // Non-blocking typing error
    }
  },

  setPresenceMembers: (members) => {
    set({ onlineUsers: members });
  },

  userJoinedPresence: (userId, userInfo) => {
    set((state) => ({
      onlineUsers: {
        ...state.onlineUsers,
        [userId]: userInfo,
      },
    }));
  },

  userLeftPresence: (userId) => {
    set((state) => {
      const copy = { ...state.onlineUsers };
      delete copy[userId];
      return { onlineUsers: copy };
    });
  },
}));
