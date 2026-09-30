import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    uniqueUserId: { type: String, unique: true, sparse: true, index: true },
    name: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    phone: { type: String, unique: true, sparse: true, trim: true },
    passwordHash: { type: String, required: true },
    profilePicture: { type: String, default: '' },
    bio: { type: String, default: 'Hey there! I am using PulseChat.' },
    isVerified: { type: Boolean, default: false },
    publicKey: { type: String, default: '' }, // E2EE Public Key (JWK/PEM string)
    lastSeen: { type: Date, default: Date.now },
    privacy: {
      profilePicture: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      lastSeen: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      onlineStatus: { type: String, enum: ['everyone', 'contacts', 'nobody'], default: 'everyone' },
      readReceipts: { type: Boolean, default: true },
    },
    blockedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model('User', UserSchema);
