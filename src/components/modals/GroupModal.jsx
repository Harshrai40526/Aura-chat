import React, { useState } from 'react';
import { useChatStore } from '../../store/useChatStore.js';
import { useAuthStore } from '../../store/useAuthStore.js';
import apiClient from '../../services/apiClient.js';
import { X, Users, Camera, Plus, Check } from 'lucide-react';

export default function GroupModal({ isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  const conversations = useChatStore((state) => state.conversations);
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  const selectConversation = useChatStore((state) => state.selectConversation);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  // Extract direct chat participants
  const contacts = conversations
    .filter((c) => c.type === 'private')
    .map((c) => c.participants.find((p) => p._id !== user?._id))
    .filter(Boolean);

  const handleAvatarSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicture(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!name.trim()) return alert('Group name is required');

    setLoading(true);
    try {
      const res = await apiClient.post('/groups', {
        name,
        description,
        profilePicture,
        memberIds: selectedMembers,
      });

      if (res.success) {
        await fetchConversations();
        selectConversation(res.data.group.conversationId._id || res.data.group.conversationId);
        onClose();
      }
    } catch (err) {
      alert(err.message || 'Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <h3 className="font-bold text-slate-100 text-lg flex items-center space-x-2">
            <Users className="w-5 h-5 text-indigo-400" />
            <span>Create New Group</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreateGroup} className="p-6 overflow-y-auto space-y-4">
          <div className="flex justify-center mb-2">
            <div className="relative group cursor-pointer">
              <div className="w-20 h-20 rounded-2xl bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center overflow-hidden">
                {profilePicture ? (
                  <img src={profilePicture} alt="Group Avatar" className="w-full h-full object-cover" />
                ) : (
                  <Users className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-1.5 rounded-full bg-indigo-600 text-white cursor-pointer shadow-lg hover:bg-indigo-500 transition">
                <Camera className="w-3.5 h-3.5" />
                <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Group Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Engineers"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">Group Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this group about?"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-2">Select Members</label>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {contacts.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-4">No recent contacts to add</div>
              ) : (
                contacts.map((contact) => {
                  const isSelected = selectedMembers.includes(contact._id);
                  return (
                    <div
                      key={contact._id}
                      onClick={() => toggleMember(contact._id)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isSelected
                          ? 'bg-indigo-600/20 border-indigo-500/40'
                          : 'bg-slate-950 border-slate-800 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={contact.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${contact.username}`}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                        <div className="text-xs">
                          <div className="font-semibold text-slate-200">{contact.name}</div>
                          <div className="text-[10px] text-slate-400">@{contact.username}</div>
                        </div>
                      </div>
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center border ${
                        isSelected ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700'
                      }`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>Create Group (GRP_...)</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
