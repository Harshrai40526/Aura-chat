import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import { decryptE2EEMessage } from '../../services/crypto.js';
import apiClient from '../../services/apiClient.js';
import { Check, CheckCheck, FileText, Download, Play, Pause, CornerUpLeft, Smile, Edit2, Trash2, Lock, Share2, Pin, Copy } from 'lucide-react';

export default function MessageBubble({ message, onReply, onForward }) {
  const user = useAuthStore((state) => state.user);
  const privateKey = useAuthStore((state) => state.privateKey);

  const isMe = message.senderId?._id === user?._id || message.senderId === user?._id;
  const [decryptedText, setDecryptedText] = useState(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioObj, setAudioObj] = useState(null);
  const [showReactionsMenu, setShowReactionsMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    if (message.isEncrypted && message.encryptedContent) {
      decryptE2EEMessage(message.encryptedContent, privateKey).then((text) => {
        setDecryptedText(text || message.content);
      });
    } else {
      setDecryptedText(message.content);
    }
  }, [message, privateKey]);

  const toggleAudio = (url) => {
    if (!audioObj) {
      const audio = new Audio(url);
      audio.onended = () => setIsPlayingAudio(false);
      setAudioObj(audio);
      audio.play();
      setIsPlayingAudio(true);
    } else {
      if (isPlayingAudio) {
        audioObj.pause();
        setIsPlayingAudio(false);
      } else {
        audioObj.play();
        setIsPlayingAudio(true);
      }
    }
  };

  const handleToggleReaction = async (emoji) => {
    try {
      await apiClient.post('/messages/react', { messageId: message._id, emoji });
      setShowReactionsMenu(false);
    } catch (e) {
      console.error('Reaction error:', e);
    }
  };

  const handleSaveEdit = async () => {
    if (!editText.trim()) return;
    try {
      await apiClient.put(`/messages/${message._id}`, { content: editText.trim() });
      setIsEditing(false);
    } catch (e) {
      alert('Failed to edit message');
    }
  };

  const handleDeleteMessage = async () => {
    if (confirm('Delete this message for everyone?')) {
      try {
        await apiClient.delete(`/messages/${message._id}`);
      } catch (e) {
        alert(e.message || 'Unable to delete message');
      }
    }
  };

  const handleCopyText = () => {
    navigator.clipboard.writeText(decryptedText || message.content);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isRead = message.readBy && message.readBy.length > 1;
  const isDelivered = message.deliveredTo && message.deliveredTo.length > 1;

  const quickReactions = ['❤️', '😂', '👍', '😍', '😢', '😡', '🎉'];

  return (
    <div className={`flex flex-col mb-3 group relative ${isMe ? 'items-end' : 'items-start'}`}>
      {/* Sender Name for Groups */}
      {!isMe && (
        <span className="text-[10px] font-semibold text-slate-400 mb-1 ml-1">
          {message.senderId?.name || 'User'}
        </span>
      )}

      <div className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl p-3 shadow-md ${
        isMe
          ? 'bg-indigo-600 text-white rounded-br-none'
          : 'bg-slate-800/90 text-slate-100 rounded-bl-none border border-slate-700/60'
      }`}>

        {/* Pinned Icon Indicator */}
        {message.pinned && (
          <div className="flex items-center space-x-1 text-[10px] text-amber-400 mb-1 font-semibold">
            <Pin className="w-3 h-3 fill-current" />
            <span>Pinned</span>
          </div>
        )}

        {/* Reply To Preview */}
        {message.replyTo && (
          <div className={`text-xs p-2 mb-2 rounded-lg border-l-2 ${
            isMe ? 'bg-indigo-700/50 border-indigo-300 text-indigo-100' : 'bg-slate-900/60 border-indigo-500 text-slate-300'
          }`}>
            <span className="font-semibold text-[10px] block">{message.replyTo.senderId?.name || 'User'}</span>
            <p className="truncate">{message.replyTo.content}</p>
          </div>
        )}

        {/* Image Attachment */}
        {message.messageType === 'image' && message.attachments?.[0]?.url && (
          <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
            <img src={message.attachments[0].url} alt="Shared Image" className="w-full object-cover max-h-72" />
          </div>
        )}

        {/* File Attachment */}
        {message.messageType === 'file' && message.attachments?.[0]?.url && (
          <a
            href={message.attachments[0].url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center space-x-3 p-2.5 rounded-xl border mb-2 transition ${
              isMe ? 'bg-indigo-700/50 border-indigo-500/50 text-white' : 'bg-slate-900/60 border-slate-700 text-slate-200'
            }`}
          >
            <FileText className="w-6 h-6 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold truncate">{message.attachments[0].fileName || 'Document'}</p>
              <p className="text-[10px] opacity-75">{message.attachments[0].fileType || 'File'}</p>
            </div>
            <Download className="w-4 h-4 flex-shrink-0" />
          </a>
        )}

        {/* Voice Message Attachment */}
        {message.messageType === 'voice' && message.attachments?.[0]?.url && (
          <div className="flex items-center space-x-3 py-1 px-2">
            <button
              onClick={() => toggleAudio(message.attachments[0].url)}
              className={`p-2 rounded-full flex-shrink-0 ${
                isMe ? 'bg-white text-indigo-600' : 'bg-indigo-600 text-white'
              }`}
            >
              {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <div className="flex-1 flex items-center space-x-1">
              <span className="w-1.5 h-4 bg-current rounded-full animate-wave"></span>
              <span className="w-1.5 h-6 bg-current rounded-full animate-wave" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-1.5 h-3 bg-current rounded-full animate-wave" style={{ animationDelay: '0.4s' }}></span>
              <span className="w-1.5 h-5 bg-current rounded-full animate-wave" style={{ animationDelay: '0.1s' }}></span>
            </div>
            <span className="text-[10px] font-mono opacity-80">Voice Note</span>
          </div>
        )}

        {/* Sticker Attachment */}
        {message.messageType === 'sticker' && message.attachments?.[0]?.url && (
          <div className="w-32 h-32 my-1">
            <img src={message.attachments[0].url} alt="Sticker" className="w-full h-full object-contain" />
          </div>
        )}

        {/* Text / Editing Mode */}
        {isEditing ? (
          <div className="flex items-center space-x-2 my-1">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
            />
            <button onClick={handleSaveEdit} className="text-xs bg-emerald-600 px-2 py-1 rounded text-white font-bold">Save</button>
            <button onClick={() => setIsEditing(false)} className="text-xs bg-slate-700 px-2 py-1 rounded text-white">Cancel</button>
          </div>
        ) : (
          message.messageType === 'text' && (
            <div className="text-sm leading-relaxed break-words flex items-start space-x-1">
              {message.isEncrypted && <Lock className="w-3.5 h-3.5 mt-1 text-emerald-400 flex-shrink-0" />}
              <span>{decryptedText}</span>
            </div>
          )
        )}

        {/* Timestamp & Receipts */}
        <div className={`flex items-center justify-end space-x-1 mt-1 text-[10px] ${
          isMe ? 'text-indigo-200' : 'text-slate-400'
        }`}>
          <span>{formatTime(message.createdAt)}</span>
          {message.editedAt && <span>(edited)</span>}
          {isMe && (
            <span>
              {isRead ? (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-300" title="Read" />
              ) : isDelivered ? (
                <CheckCheck className="w-3.5 h-3.5 text-indigo-200" title="Delivered" />
              ) : (
                <Check className="w-3.5 h-3.5 text-indigo-300" title="Sent" />
              )}
            </span>
          )}
        </div>

        {/* Hover Action Menu */}
        <div className={`absolute top-1/2 -translate-y-1/2 hidden group-hover:flex items-center space-x-1 p-1 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-20 ${
          isMe ? '-left-32' : '-right-32'
        }`}>
          <button onClick={() => onReply(message)} className="p-1 text-slate-400 hover:text-indigo-400" title="Reply">
            <CornerUpLeft className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setShowReactionsMenu(!showReactionsMenu)} className="p-1 text-slate-400 hover:text-amber-400" title="React">
            <Smile className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onForward(message)} className="p-1 text-slate-400 hover:text-teal-400" title="Forward">
            <Share2 className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleCopyText} className="p-1 text-slate-400 hover:text-cyan-400" title="Copy">
            <Copy className="w-3.5 h-3.5" />
          </button>
          {isMe && (
            <>
              <button onClick={() => { setIsEditing(true); setEditText(decryptedText || message.content); }} className="p-1 text-slate-400 hover:text-emerald-400" title="Edit">
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button onClick={handleDeleteMessage} className="p-1 text-slate-400 hover:text-red-400" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>

        {/* Emoji Reactions Picker Popup */}
        {showReactionsMenu && (
          <div className="absolute -top-10 left-0 bg-slate-900 border border-slate-700 rounded-2xl p-1.5 shadow-2xl flex space-x-1 z-30">
            {quickReactions.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleToggleReaction(emoji)}
                className="w-7 h-7 flex items-center justify-center hover:bg-slate-800 rounded-lg text-sm transition"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Applied Emoji Reactions Badges */}
      {message.reactions && message.reactions.length > 0 && (
        <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
          {message.reactions.map((r, idx) => (
            <span
              key={idx}
              onClick={() => handleToggleReaction(r.emoji)}
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-xs cursor-pointer hover:bg-slate-700 transition"
            >
              {r.emoji}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
