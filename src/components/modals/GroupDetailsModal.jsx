import React, { useState } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { useChatStore } from '../../store/useChatStore.js';
import apiClient from '../../services/apiClient.js';
import { X, Users, ShieldAlert, UserPlus, LogOut, Crown, Shield } from 'lucide-react';

export default function GroupDetailsModal({ group, isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const selectConversation = useChatStore((state) => state.selectConversation);

  const [searchMemberQuery, setSearchMemberQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !group) return null;

  const isAdmin = group.admins?.some((a) => (a._id || a) === user?._id);

  const handleLeaveGroup = async () => {
    if (confirm('Are you sure you want to leave this group?')) {
      try {
        await apiClient.delete(`/groups/${group._id}`);
        await fetchConversations();
        selectConversation(null);
        onClose();
      } catch (err) {
        alert(err.message || 'Failed to leave group');
      }
    }
  };

  const handlePromoteAdmin = async (memberId) => {
    try {
      await apiClient.put(`/groups/${group._id}`, { promoteAdmin: [memberId] });
      await fetchConversations();
    } catch (e) {
      alert('Failed to promote admin');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (confirm('Remove this member from the group?')) {
      try {
        await apiClient.put(`/groups/${group._id}`, { removeMembers: [memberId] });
        await fetchConversations();
      } catch (e) {
        alert('Failed to remove member');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <h3 className="font-bold text-slate-100 text-lg">Group Info</h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Header Avatar & Name */}
          <div className="flex flex-col items-center text-center">
            <img
              src={group.profilePicture || `https://api.dicebear.com/7.x/identicon/svg?seed=${group.name}`}
              alt="Group Avatar"
              className="w-20 h-20 rounded-2xl object-cover bg-slate-800 border-2 border-indigo-500/40 mb-3"
            />
            <h2 className="text-lg font-bold text-slate-100">{group.name}</h2>
            <span className="text-xs font-mono font-semibold text-indigo-400 mt-0.5">{group.uniqueGroupId}</span>
            {group.description && <p className="text-xs text-slate-400 mt-2">{group.description}</p>}
          </div>

          {/* Members Section */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Members ({group.members?.length || 0})
              </h4>
            </div>

            <div className="space-y-2">
              {group.members?.map((member) => {
                const memberId = member._id || member;
                const isMemberAdmin = group.admins?.some((a) => (a._id || a) === memberId);
                const isCreator = (group.creatorId?._id || group.creatorId) === memberId;

                return (
                  <div key={memberId} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800/80 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <img
                        src={member.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${member.username}`}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-xs font-semibold text-slate-200 flex items-center space-x-1">
                          <span>{member.name || 'Member'}</span>
                          {isCreator && <Crown className="w-3 h-3 text-amber-400" title="Creator" />}
                          {isMemberAdmin && !isCreator && <Shield className="w-3 h-3 text-indigo-400" title="Admin" />}
                        </div>
                        <div className="text-[10px] text-slate-400">@{member.username || member.uniqueUserId}</div>
                      </div>
                    </div>

                    {isAdmin && memberId !== user?._id && (
                      <div className="flex items-center space-x-1">
                        {!isMemberAdmin && (
                          <button
                            onClick={() => handlePromoteAdmin(memberId)}
                            className="p-1 text-[10px] bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600 hover:text-white transition"
                            title="Make Admin"
                          >
                            Make Admin
                          </button>
                        )}
                        <button
                          onClick={() => handleRemoveMember(memberId)}
                          className="p-1 text-[10px] bg-red-500/10 text-red-400 rounded-lg hover:bg-red-600 hover:text-white transition"
                          title="Remove"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={handleLeaveGroup}
            className="w-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white font-semibold py-3 rounded-xl transition flex items-center justify-center space-x-2 text-xs"
          >
            <LogOut className="w-4 h-4" />
            <span>Leave Group</span>
          </button>
        </div>
      </div>
    </div>
  );
}
