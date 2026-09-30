import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import apiClient from '../../services/apiClient.js';
import { X, User, Camera, Copy, Check, Shield, Lock, Eye, Ban, Save } from 'lucide-react';

export default function ProfileModal({ isOpen, onClose }) {
  const user = useAuthStore((state) => state.user);
  const updateProfile = useAuthStore((state) => state.updateProfile);

  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePicture, setProfilePicture] = useState('');
  const [privacy, setPrivacy] = useState({
    profilePicture: 'everyone',
    lastSeen: 'everyone',
    onlineStatus: 'everyone',
    readReceipts: true,
  });
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' | 'privacy' | 'blocked'

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setProfilePicture(user.profilePicture || '');
      if (user.privacy) setPrivacy(user.privacy);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && activeTab === 'blocked') {
      apiClient.get('/users/block').then((res) => {
        if (res.success) setBlockedUsers(res.data.blockedUsers);
      }).catch((e) => console.error(e));
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const copyUniqueId = () => {
    if (user?.uniqueUserId) {
      navigator.clipboard.writeText(user.uniqueUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile({ name, bio, profilePicture });
      await apiClient.put('/users/privacy', privacy);
      onClose();
    } catch (err) {
      alert(err.message || 'Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblock = async (targetId) => {
    try {
      const res = await apiClient.post('/users/block', { targetUserId: targetId, action: 'unblock' });
      if (res.success) {
        setBlockedUsers((prev) => prev.filter((u) => u._id !== targetId));
      }
    } catch (e) {
      alert('Failed to unblock user');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/80">
          <h3 className="font-bold text-slate-100 text-lg">Settings & Profile</h3>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'profile' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'
            }`}
          >
            Profile Info
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'privacy' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'
            }`}
          >
            Privacy Settings
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition ${
              activeTab === 'blocked' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400'
            }`}
          >
            Blocked Users
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Profile Picture */}
              <div className="flex flex-col items-center mb-4">
                <div className="relative group cursor-pointer">
                  <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-indigo-500/40 flex items-center justify-center overflow-hidden">
                    {profilePicture ? (
                      <img src={profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-12 h-12 text-slate-500" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 text-white cursor-pointer shadow-lg hover:bg-indigo-500 transition">
                    <Camera className="w-4 h-4" />
                    <input type="file" accept="image/*" onChange={handleAvatarSelect} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Unique ID Box */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex justify-between items-center">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Your Unique User ID</span>
                  <span className="text-sm font-mono font-bold text-indigo-400">{user?.uniqueUserId}</span>
                </div>
                <button
                  type="button"
                  onClick={copyUniqueId}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center space-x-1"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">About / Bio</label>
                <textarea
                  rows={3}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
              >
                {loading ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : <Save className="w-4 h-4" />}
                <span>Save Profile Changes</span>
              </button>
            </form>
          )}

          {activeTab === 'privacy' && (
            <div className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Who can see my profile picture?</label>
                <select
                  value={privacy.profilePicture}
                  onChange={(e) => setPrivacy({ ...privacy, profilePicture: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Who can see my last seen timestamp?</label>
                <select
                  value={privacy.lastSeen}
                  onChange={(e) => setPrivacy({ ...privacy, lastSeen: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-slate-200"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts Only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div>
                  <span className="font-semibold text-slate-200 block">Read Receipts</span>
                  <span className="text-[11px] text-slate-400">If disabled, message double ticks (✓✓) won't turn blue when read</span>
                </div>
                <input
                  type="checkbox"
                  checked={privacy.readReceipts}
                  onChange={(e) => setPrivacy({ ...privacy, readReceipts: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-700 bg-slate-800 text-indigo-600"
                />
              </div>
            </div>
          )}

          {activeTab === 'blocked' && (
            <div className="space-y-2">
              {blockedUsers.length === 0 ? (
                <div className="text-center text-xs text-slate-500 py-8">No blocked users</div>
              ) : (
                blockedUsers.map((u) => (
                  <div key={u._id} className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                    <div className="flex items-center space-x-3">
                      <img src={u.profilePicture || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`} className="w-9 h-9 rounded-full object-cover" />
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{u.name}</div>
                        <div className="text-[10px] text-slate-400">@{u.username}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleUnblock(u._id)}
                      className="px-3 py-1 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white text-xs font-semibold rounded-xl transition"
                    >
                      Unblock
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
