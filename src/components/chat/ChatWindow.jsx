import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useChatStore } from '../../store/useChatStore.js';
import { usePusher } from '../../hooks/usePusher.js';
import MessageBubble from './MessageBubble.jsx';
import InputBar from './InputBar.jsx';
import { ShieldCheck, Lock, Info, Users, MessageSquare, ArrowLeft, Search, Pin, X, Send } from 'lucide-react';

export default function ChatWindow({ onBackToSidebar, onOpenGroupDetails }) {
  const user = useAuthStore((state) => state.user);

  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const messagesObj = useChatStore((state) => state.messages);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const sendTypingEvent = useChatStore((state) => state.sendTypingEvent);
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const isE2EEEnabled = useChatStore((state) => state.isE2EEEnabled);

  const { connectionStatus } = usePusher();

  const [replyingTo, setReplyingTo] = useState(null);
  const [forwardMessage, setForwardMessage] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [imageCaption, setImageCaption] = useState('');

  const messagesEndRef = useRef(null);

  const activeConv = conversations.find((c) => c._id.toString() === activeConversationId?.toString());
  const messages = messagesObj[activeConversationId] || [];

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeConversationId]);

  if (!activeConv) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-slate-950 p-8 text-center text-slate-500 select-none">
        <div className="w-20 h-20 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mb-4 text-indigo-500 shadow-2xl">
          <MessageSquare className="w-10 h-10 stroke-1" />
        </div>
        <h2 className="text-xl font-bold text-slate-200">No Chat Selected</h2>
        <p className="text-xs max-w-sm mt-1 text-slate-400">
          Select a conversation from the sidebar or search for a Unique User ID to begin real-time messaging.
        </p>
      </div>
    );
  }

  const isGroup = activeConv.type === 'group';
  let title = '';
  let avatar = '';
  let targetUserId = null;
  let recipientPublicKey = null;
  let uniqueId = '';

  if (isGroup) {
    title = activeConv.group?.name || 'Group Chat';
    avatar = activeConv.group?.profilePicture || `https://api.dicebear.com/7.x/identicon/svg?seed=${title}`;
    uniqueId = activeConv.group?.uniqueGroupId || '';
  } else {
    const otherUser = activeConv.participants.find((p) => p._id !== user?._id);
    title = otherUser ? otherUser.name : 'Private Chat';
    avatar = otherUser?.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser?.username}`;
    targetUserId = otherUser?._id;
    recipientPublicKey = otherUser?.publicKey;
    uniqueId = otherUser?.uniqueUserId || '';
  }

  const isOnline = targetUserId ? Boolean(onlineUsers[targetUserId]) : false;
  const convTypingUsers = typingUsers[activeConversationId];
  const typingText = convTypingUsers && Object.keys(convTypingUsers).length > 0
    ? `${Object.values(convTypingUsers).join(', ')} is typing...`
    : null;

  // Filter messages by search keyword
  const filteredMessages = searchKeyword.trim()
    ? messages.filter((m) => m.content?.toLowerCase().includes(searchKeyword.toLowerCase().trim()))
    : messages;

  const pinnedMessages = messages.filter((m) => m.pinned);

  const handleForwardSend = async (targetConvId) => {
    if (!forwardMessage) return;
    try {
      await sendMessage({
        conversationId: targetConvId,
        content: forwardMessage.content,
        messageType: forwardMessage.messageType,
        attachments: forwardMessage.attachments,
      });
      setForwardMessage(null);
    } catch (e) {
      alert('Failed to forward message');
    }
  };

  const handleSendImageWithCaption = async () => {
    if (!imagePreview) return;
    try {
      await sendMessage({
        conversationId: activeConversationId,
        content: imageCaption || '📷 Photo',
        messageType: 'image',
        attachments: [{ url: imagePreview, fileType: 'image' }],
        recipientPublicKey,
      });
      setImagePreview(null);
      setImageCaption('');
    } catch (e) {
      alert('Failed to send image');
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative">
      {/* Header */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBackToSidebar}
            className="md:hidden p-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            title="Back to Conversations"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img src={avatar} alt="Avatar" className="w-11 h-11 rounded-full object-cover bg-slate-800 border border-slate-700" />
            {!isGroup && isOnline && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
            )}
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <h2 className="font-bold text-slate-100 text-sm truncate max-w-[150px] sm:max-w-xs">{title}</h2>
              {isE2EEEnabled && (
                <span className="inline-flex items-center space-x-1 text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded-full font-mono">
                  <Lock className="w-2.5 h-2.5" />
                  <span>E2EE</span>
                </span>
              )}
            </div>
            <div className="text-xs text-slate-400 flex items-center space-x-2">
              {typingText ? (
                <span className="text-indigo-400 font-medium animate-pulse">{typingText}</span>
              ) : isGroup ? (
                <span>{activeConv.group?.members?.length || activeConv.participants.length} Members • {uniqueId}</span>
              ) : (
                <span>{isOnline ? '🟢 Online' : 'Offline'} • {uniqueId}</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Connection Status Badge */}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            connectionStatus === 'Connected'
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : connectionStatus === 'Reconnecting'
              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}>
            {connectionStatus}
          </span>

          {/* Search inside current conversation */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Search Messages"
          >
            <Search className="w-4 h-4" />
          </button>

          {isGroup && (
            <button
              onClick={() => onOpenGroupDetails(activeConv.group || activeConv._id)}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
              title="Group Details"
            >
              <Info className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Message Search Bar */}
      {showSearch && (
        <div className="p-2.5 bg-slate-900 border-b border-slate-800 flex items-center space-x-2">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            placeholder="Search inside this conversation (e.g. interview)..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
          />
          <button onClick={() => { setSearchKeyword(''); setShowSearch(false); }} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Pinned Messages Banner */}
      {pinnedMessages.length > 0 && (
        <div className="p-2 bg-indigo-950/40 border-b border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300 px-4">
          <div className="flex items-center space-x-2 truncate">
            <Pin className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
            <span className="font-semibold text-[11px]">Pinned:</span>
            <span className="truncate text-slate-200">{pinnedMessages[0].content}</span>
          </div>
          <span className="text-[10px] text-slate-400">{pinnedMessages.length} Pinned</span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-slate-500">
            <ShieldCheck className="w-12 h-12 mb-2 opacity-40 text-indigo-400" />
            <p className="text-xs">End-to-End Serverless Encrypted Chat</p>
            <p className="text-[11px] text-slate-600 mt-1">Send a message to start conversing securely.</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              onReply={(m) => setReplyingTo(m)}
              onForward={(m) => setForwardMessage(m)}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <InputBar
        onSendMessage={(data) => sendMessage({ ...data, recipientPublicKey })}
        onSendTyping={(isTyping) => sendTypingEvent(activeConversationId, isTyping)}
        replyingTo={replyingTo}
        onClearReply={() => setReplyingTo(null)}
        onSelectImagePreview={(url) => setImagePreview(url)}
      />

      {/* Image Preview Modal Before Send */}
      {imagePreview && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-3">
              <span className="text-xs font-bold text-slate-200">Image Preview</span>
              <button onClick={() => setImagePreview(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <img src={imagePreview} alt="Preview" className="max-h-72 object-contain rounded-2xl mb-4 border border-slate-800" />
            <div className="w-full flex items-center space-x-2">
              <input
                type="text"
                value={imageCaption}
                onChange={(e) => setImageCaption(e.target.value)}
                placeholder="Add caption (optional)..."
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendImageWithCaption}
                className="p-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-600/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Forward Message Modal */}
      {forwardMessage && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-4 flex flex-col">
            <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-200">Forward Message To</span>
              <button onClick={() => setForwardMessage(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conversations.map((c) => {
                const title = c.type === 'group' ? c.group?.name : c.participants.find((p) => p._id !== user?._id)?.name;
                return (
                  <div
                    key={c._id}
                    onClick={() => handleForwardSend(c._id)}
                    className="flex items-center justify-between p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl cursor-pointer text-xs"
                  >
                    <span className="font-semibold text-slate-200">{title}</span>
                    <Send className="w-3.5 h-3.5 text-indigo-400" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
