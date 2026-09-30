import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useChatStore } from '../../store/useChatStore.js';
import apiClient from '../../services/apiClient.js';
import { Search, UserPlus, Users, Settings, LogOut, Copy, Check, Lock, MessageSquare } from 'lucide-react';

export default function Sidebar({ onOpenProfile, onOpenCreateGroup }) {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const selectConversation = useChatStore((state) => state.selectConversation);
  const startPrivateChat = useChatStore((state) => state.startPrivateChat);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const onlineUsers = useChatStore((state) => state.onlineUsers);
  const typingUsers = useChatStore((state) => state.typingUsers);
  const isE2EEEnabled = useChatStore((state) => state.isE2EEEnabled);
  const toggleE2EE = useChatStore((state) => state.toggleE2EE);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Live user search debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get(`/users/search?query=${encodeURIComponent(searchQuery.trim())}`);
        if (res.success) {
          setSearchResults(res.data.users);
        }
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const copyUniqueId = () => {
    if (user?.uniqueUserId) {
      navigator.clipboard.writeText(user.uniqueUserId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const handleStartChat = async (targetUser) => {
    try {
      await startPrivateChat(targetUser._id);
      setSearchQuery('');
      setSearchResults([]);
    } catch (err) {
      alert(err.message || 'Unable to start chat');
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="w-full md:w-80 lg:w-96 bg-slate-900 border-r border-slate-800 flex flex-col h-full select-none">
      {/* Header Profile Bar */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onOpenProfile}>
          <div className="relative">
            <img
              src={user?.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.username}`}
              alt="Profile"
              className="w-10 h-10 rounded-full object-cover border border-slate-700 bg-slate-800"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
          </div>
          <div>
            <div className="font-semibold text-slate-100 text-sm leading-tight">{user?.name}</div>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  copyUniqueId();
                }}
                className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-mono text-indigo-400 border border-slate-700/60 transition"
                title="Click to copy Unique User ID"
              >
                <span>{user?.uniqueUserId}</span>
                {copiedId ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* E2EE Toggle */}
          <button
            onClick={toggleE2EE}
            className={`p-2 rounded-xl border transition ${
              isE2EEEnabled
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
            title={isE2EEEnabled ? 'E2EE Encryption Active' : 'Enable E2EE Encryption'}
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* New Group */}
          <button
            onClick={onOpenCreateGroup}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition"
            title="Create Group Chat"
          >
            <Users className="w-4 h-4" />
          </button>

          {/* Settings */}
          <button
            onClick={onOpenProfile}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 transition"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Logout */}
          <button
            onClick={logout}
            className="p-2 rounded-xl bg-slate-800/60 hover:bg-red-500/20 hover:text-red-400 border border-slate-700/60 text-slate-400 transition"
            title="Log Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Search Bar */}
      <div className="p-3 border-b border-slate-800/60 relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search USR_ID, username, name..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-slate-200 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500/80 transition"
          />
        </div>

        {/* Live Search Results Popup */}
        {searchQuery.trim().length > 0 && (
          <div className="absolute left-3 right-3 top-full mt-1 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 max-h-72 overflow-y-auto p-2 divide-y divide-slate-800/60">
            {isSearching ? (
              <div className="p-4 text-center text-xs text-slate-500">Searching users...</div>
            ) : searchResults.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-500">No users found matching query</div>
            ) : (
              searchResults.map((searchUser) => {
                const isOnline = Boolean(onlineUsers[searchUser._id]);
                return (
                  <div
                    key={searchUser._id}
                    onClick={() => handleStartChat(searchUser)}
                    className="flex items-center justify-between p-2.5 hover:bg-slate-800/80 rounded-xl cursor-pointer transition"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <img
                          src={searchUser.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${searchUser.username}`}
                          alt="Avatar"
                          className="w-9 h-9 rounded-full object-cover"
                        />
                        {isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{searchUser.name}</div>
                        <div className="text-[11px] text-slate-400">@{searchUser.username} • {searchUser.uniqueUserId}</div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChat(searchUser);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center space-x-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>Message</span>
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {conversations.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
            <Users className="w-10 h-10 mb-2 stroke-1 opacity-50" />
            <p className="text-xs">No conversations yet.</p>
            <p className="text-[11px] mt-1 text-slate-600">Search a Unique User ID above to start chatting!</p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isSelected = conv._id.toString() === activeConversationId?.toString();
            const isGroup = conv.type === 'group';

            let title = '';
            let avatar = '';
            let targetUserId = null;

            if (isGroup) {
              title = conv.group?.name || 'Group Chat';
              avatar = conv.group?.profilePicture || `https://api.dicebear.com/7.x/identicon/svg?seed=${title}`;
            } else {
              const otherUser = conv.participants.find((p) => p._id !== user?._id);
              title = otherUser ? otherUser.name : 'Private Chat';
              avatar = otherUser?.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${otherUser?.username}`;
              targetUserId = otherUser?._id;
            }

            const isOnline = targetUserId ? Boolean(onlineUsers[targetUserId]) : false;
            const convTypingUsers = typingUsers[conv._id];
            const typingText = convTypingUsers && Object.keys(convTypingUsers).length > 0
              ? `${Object.values(convTypingUsers).join(', ')} is typing...`
              : null;

            return (
              <div
                key={conv._id}
                onClick={() => selectConversation(conv._id)}
                className={`flex items-center space-x-3 p-3 rounded-2xl cursor-pointer transition ${
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/30'
                    : 'hover:bg-slate-800/60 border border-transparent'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img src={avatar} alt="Avatar" className="w-12 h-12 rounded-full object-cover bg-slate-800" />
                  {!isGroup && isOnline && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className="text-sm font-semibold text-slate-100 truncate">{title}</h3>
                    {conv.lastMessage?.createdAt && (
                      <span className="text-[10px] text-slate-500 flex-shrink-0">
                        {formatTimestamp(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="flex justify-between items-center text-xs">
                    <p className="text-slate-400 truncate">
                      {typingText ? (
                        <span className="text-indigo-400 font-medium animate-pulse">{typingText}</span>
                      ) : (
                        conv.lastMessage?.text || 'No messages yet'
                      )}
                    </p>

                    {conv.unreadCount > 0 && (
                      <span className="ml-2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
