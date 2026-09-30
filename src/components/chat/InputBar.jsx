import React, { useState, useEffect, useRef } from 'react';
import EmojiPicker from 'emoji-picker-react';
import apiClient from '../../services/apiClient.js';
import { useVoiceRecorder } from '../../hooks/useVoiceRecorder.js';
import { Smile, Paperclip, Mic, Send, X, Image as ImageIcon, FileText, Square, StopCircle } from 'lucide-react';

export default function InputBar({ onSendMessage, onSendTyping, replyingTo, onClearReply }) {
  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [stickerPacks, setStickerPacks] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const { isRecording, recordingTime, startRecording, stopRecording, resetRecording, getAudioBase64 } = useVoiceRecorder();

  useEffect(() => {
    // Fetch dynamic sticker packs from cloud API
    apiClient.get('/stickers').then((res) => {
      if (res.success) setStickerPacks(res.data.stickerPacks);
    }).catch((e) => console.error(e));
  }, []);

  const handleTextChange = (e) => {
    setText(e.target.value);
    onSendTyping(true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000);
  };

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const fileType = file.type.startsWith('image/') ? 'image' : 'file';
        setSelectedFile({
          fileString: reader.result,
          fileName: file.name,
          fileType,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendSticker = async (stickerUrl) => {
    try {
      await onSendMessage({
        content: '🎨 Sticker',
        messageType: 'sticker',
        attachments: [{ url: stickerUrl, fileType: 'image' }],
        replyTo: replyingTo?._id,
      });
      setShowStickerDrawer(false);
      if (onClearReply) onClearReply();
    } catch (e) {
      alert('Failed to send sticker');
    }
  };

  const handleSendVoiceNote = async () => {
    stopRecording();
    setTimeout(async () => {
      const audioBase64 = await getAudioBase64();
      if (audioBase64) {
        setUploading(true);
        try {
          const res = await apiClient.post('/upload', {
            file: audioBase64,
            folder: 'voice_notes',
            fileType: 'audio',
          });
          if (res.success) {
            await onSendMessage({
              content: '🎤 Voice Message',
              messageType: 'voice',
              attachments: [{ url: res.data.url, fileType: 'audio', duration: recordingTime }],
              replyTo: replyingTo?._id,
            });
            resetRecording();
            if (onClearReply) onClearReply();
          }
        } catch (e) {
          alert('Failed to upload voice message');
        } finally {
          setUploading(false);
        }
      }
    }, 500);
  };

  const handleSend = async (e) => {
    if (e) e.preventDefault();
    if (!text.trim() && !selectedFile) return;

    onSendTyping(false);
    setUploading(true);

    try {
      let attachments = [];
      let messageType = 'text';

      if (selectedFile) {
        const uploadRes = await apiClient.post('/upload', {
          file: selectedFile.fileString,
          fileName: selectedFile.fileName,
          fileType: selectedFile.fileType,
        });
        if (uploadRes.success) {
          attachments = [{
            url: uploadRes.data.url,
            fileName: selectedFile.fileName,
            fileType: selectedFile.fileType,
          }];
          messageType = selectedFile.fileType;
        }
      }

      await onSendMessage({
        content: text.trim(),
        messageType,
        attachments,
        replyTo: replyingTo?._id,
      });

      setText('');
      setSelectedFile(null);
      setShowEmojiPicker(false);
      setShowStickerDrawer(false);
      if (onClearReply) onClearReply();
    } catch (err) {
      alert(err.message || 'Error sending message');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-3 bg-slate-900 border-t border-slate-800 relative">
      {/* Reply Banner */}
      {replyingTo && (
        <div className="flex items-center justify-between p-2 mb-2 bg-slate-800/80 border border-slate-700/60 rounded-xl text-xs">
          <div className="min-w-0 pr-2">
            <span className="font-semibold text-indigo-400 block">Replying to {replyingTo.senderId?.name || 'User'}</span>
            <p className="text-slate-300 truncate">{replyingTo.content}</p>
          </div>
          <button onClick={onClearReply} className="p-1 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Selected Attachment Preview */}
      {selectedFile && (
        <div className="flex items-center justify-between p-2 mb-2 bg-slate-800 border border-slate-700 rounded-xl text-xs">
          <div className="flex items-center space-x-2 truncate">
            {selectedFile.fileType === 'image' ? <ImageIcon className="w-4 h-4 text-indigo-400" /> : <FileText className="w-4 h-4 text-indigo-400" />}
            <span className="truncate text-slate-200">{selectedFile.fileName}</span>
          </div>
          <button onClick={() => setSelectedFile(null)} className="p-1 text-slate-400 hover:text-red-400">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Picker Modal */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-50 shadow-2xl">
          <EmojiPicker onEmojiClick={handleEmojiClick} theme="dark" width={320} height={380} />
        </div>
      )}

      {/* Dynamic Sticker Drawer */}
      {showStickerDrawer && (
        <div className="absolute bottom-16 left-12 bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-2xl z-50 w-80 max-h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-800">
            <h4 className="text-xs font-bold text-slate-200 uppercase">Dynamic Stickers</h4>
            <button onClick={() => setShowStickerDrawer(false)} className="text-slate-400 hover:text-slate-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          {stickerPacks.map((pack) => (
            <div key={pack.id} className="mb-3">
              <span className="text-[11px] font-semibold text-indigo-400 block mb-1.5">{pack.name}</span>
              <div className="grid grid-cols-4 gap-2">
                {pack.stickers.map((sticker) => (
                  <img
                    key={sticker.id}
                    src={sticker.url}
                    alt={sticker.name}
                    onClick={() => handleSendSticker(sticker.url)}
                    className="w-14 h-14 object-cover rounded-xl cursor-pointer hover:scale-105 transition border border-slate-800"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Controls */}
      <form onSubmit={handleSend} className="flex items-center space-x-2">
        {/* Hidden File Input */}
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

        <div className="flex items-center space-x-1 text-slate-400">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="p-2 hover:text-amber-400 rounded-xl hover:bg-slate-800 transition"
            title="Emoji Picker"
          >
            <Smile className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 hover:text-indigo-400 rounded-xl hover:bg-slate-800 transition"
            title="Attach File or Image"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => setShowStickerDrawer(!showStickerDrawer)}
            className="p-2 hover:text-purple-400 rounded-xl hover:bg-slate-800 text-xs font-bold transition"
            title="Stickers"
          >
            🎨
          </button>
        </div>

        {/* Text Input / Voice Recorder Active View */}
        {isRecording ? (
          <div className="flex-1 flex items-center justify-between bg-slate-950 border border-red-500/40 rounded-2xl px-4 py-2 text-xs text-red-400 animate-pulse">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
              <span>Recording Voice Note... ({recordingTime}s)</span>
            </div>
            <div className="flex items-center space-x-2">
              <button type="button" onClick={resetRecording} className="text-slate-400 hover:text-slate-200">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendVoiceNote}
                className="p-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 transition"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <input
            type="text"
            value={text}
            onChange={handleTextChange}
            placeholder="Type a message..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 transition"
          />
        )}

        {/* Mic or Send Button */}
        {!text.trim() && !selectedFile && !isRecording ? (
          <button
            type="button"
            onClick={startRecording}
            className="p-3 bg-slate-800 text-slate-300 hover:bg-slate-700 rounded-2xl transition"
            title="Record Voice Note"
          >
            <Mic className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="submit"
            disabled={uploading}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {uploading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin block"></span>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        )}
      </form>
    </div>
  );
}
