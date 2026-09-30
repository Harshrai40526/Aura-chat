import mongoose from 'mongoose';

const ConversationSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ['private', 'group'], default: 'private', required: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    lastMessage: {
      text: { type: String, default: '' },
      senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      createdAt: { type: Date },
      messageType: { type: String, default: 'text' },
    },
  },
  { timestamps: true }
);

export default mongoose.models.Conversation || mongoose.model('Conversation', ConversationSchema);
