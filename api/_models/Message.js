import mongoose from 'mongoose';

const AttachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  fileType: { type: String, required: true }, // image, pdf, doc, audio, zip
  fileName: { type: String, default: 'file' },
  fileSize: { type: Number, default: 0 },
  duration: { type: Number, default: 0 }, // audio duration in seconds
});

const ReactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  emoji: { type: String, required: true },
});

const ReadStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  readAt: { type: Date, default: Date.now },
});

const DeliveredStatusSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  deliveredAt: { type: Date, default: Date.now },
});

const MessageSchema = new mongoose.Schema(
  {
    conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    messageType: { type: String, enum: ['text', 'image', 'file', 'voice', 'sticker'], default: 'text', required: true },
    content: { type: String, default: '' },
    encryptedContent: { type: String, default: '' }, // E2EE payload
    isEncrypted: { type: Boolean, default: false },
    attachments: [AttachmentSchema],
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },
    reactions: [ReactionSchema],
    readBy: [ReadStatusSchema],
    deliveredTo: [DeliveredStatusSchema],
    pinned: { type: Boolean, default: false },
    editedAt: { type: Date },
    deletedAt: { type: Date }, // Soft delete
  },
  { timestamps: true }
);

export default mongoose.models.Message || mongoose.model('Message', MessageSchema);
