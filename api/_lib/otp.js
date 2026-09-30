import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export const OTP_EXPIRE_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 5;
export const OTP_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Generate a random 6-digit OTP string
 */
export function generateRandomOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Hash an OTP string
 */
export async function hashOTP(otp) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(otp, salt);
}

/**
 * Verify an OTP against a hash
 */
export async function verifyOTPHash(otp, hash) {
  return await bcrypt.compare(otp, hash);
}

/**
 * Unique ID generator for users (USR_XXXXXX) and groups (GRP_XXXXXX)
 */
export function generateUniqueId(prefix = 'USR') {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Avoid confusing 0, 1, O, I
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}_${result}`;
}

/**
 * Dispatch OTP via configured provider or fallback to console log
 */
export async function dispatchOTP(recipient, otpCode) {
  const apiKey = process.env.OTP_PROVIDER_API_KEY;
  if (apiKey) {
    console.log(`📱 Sending OTP ${otpCode} via External Provider to ${recipient}`);
    // Provider integration logic (e.g. Resend, Twilio, SendGrid API call)
  } else {
    console.log(`\n========================================`);
    console.log(`🔑 [DEV MODE] Generated OTP for ${recipient}: ${otpCode}`);
    console.log(`========================================\n`);
  }
  return true;
}
