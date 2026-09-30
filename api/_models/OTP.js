import mongoose from 'mongoose';

const OTPSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } }, // TTL index
    attempts: { type: Number, default: 0 },
    cooldownUntil: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.OTP || mongoose.model('OTP', OTPSchema);
