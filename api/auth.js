import bcrypt from 'bcryptjs';
import { connectToDatabase } from './_lib/mongodb.js';
import User from './_models/User.js';
import OTP from './_models/OTP.js';
import { successResponse, errorResponse } from './_lib/response.js';
import { generateToken, setAuthCookie, clearAuthCookie, requireAuth } from './_lib/auth.js';
import { generateRandomOTP, hashOTP, verifyOTPHash, dispatchOTP, OTP_EXPIRE_MINUTES, OTP_MAX_ATTEMPTS, OTP_RESEND_COOLDOWN_SECONDS, generateUniqueId } from './_lib/otp.js';

export default async function handler(req, res) {
  const action = req.query.action || req.url.split('?')[0].split('/').pop();

  try {
    await connectToDatabase();

    // 1. SIGNUP
    if (action === 'signup') {
      if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);
      const { name, username, email, phone, password, confirmPassword, profilePicture } = req.body;
      if (!name || !username || !email || !password) return errorResponse(res, 'Name, username, email, and password are required', 400);
      if (password !== confirmPassword) return errorResponse(res, 'Passwords do not match', 400);

      const cleanUsername = username.toLowerCase().trim();
      const cleanEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({ $or: [{ email: cleanEmail }, { username: cleanUsername }] });
      if (existingUser) return errorResponse(res, 'User with this email or username already exists', 409);

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);
      const uniqueUserId = generateUniqueId('USR');

      const user = new User({
        uniqueUserId,
        name: name.trim(),
        username: cleanUsername,
        email: cleanEmail,
        phone: phone ? phone.trim() : undefined,
        passwordHash,
        profilePicture: profilePicture || '',
        isVerified: true,
      });

      await user.save();

      const token = generateToken({ userId: user._id.toString(), uniqueUserId: user.uniqueUserId, username: user.username, email: user.email });
      setAuthCookie(res, token);

      const userObj = user.toObject();
      delete userObj.passwordHash;
      return successResponse(res, { user: userObj, token, message: 'Account created and logged in successfully!' }, 'Account created', 201);
    }

    // 2. LOGIN
    if (action === 'login') {
      if (req.method !== 'POST') return errorResponse(res, 'Method not allowed', 405);
      const { identifier, password, publicKey, isDemo } = req.body;

      if (isDemo) {
        let demoUser = await User.findOne({ username: 'demouser' });
        if (!demoUser) {
          const salt = await bcrypt.genSalt(10);
          const passwordHash = await bcrypt.hash('password123', salt);
          demoUser = await User.create({
            name: 'Demo User',
            username: 'demouser',
            email: 'demo@pulsechat.io',
            passwordHash,
            isVerified: true,
            uniqueUserId: 'USR_DEMO777',
            bio: 'Testing PulseChat Serverless Chat Application!',
          });
        }
        const token = generateToken({ userId: demoUser._id.toString(), uniqueUserId: demoUser.uniqueUserId, username: demoUser.username, email: demoUser.email });
        setAuthCookie(res, token);
        const userObj = demoUser.toObject();
        delete userObj.passwordHash;
        return successResponse(res, { user: userObj, token }, 'Demo logged in successfully!');
      }

      if (!identifier || !password) return errorResponse(res, 'Email/Username/Phone and Password are required', 400);

      const cleanId = identifier.trim();
      const cleanLower = cleanId.toLowerCase();
      const user = await User.findOne({
        $or: [{ email: cleanLower }, { username: cleanLower }, { phone: cleanId }, { uniqueUserId: cleanId.toUpperCase() }],
      });

      if (!user) return errorResponse(res, 'User not found. Please click "Create Account First" below.', 401);

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) return errorResponse(res, 'Incorrect password. Please try again.', 401);

      if (!user.isVerified) user.isVerified = true;
      if (!user.uniqueUserId) user.uniqueUserId = generateUniqueId('USR');
      if (publicKey) user.publicKey = publicKey;
      user.lastSeen = new Date();
      await user.save();

      const token = generateToken({ userId: user._id.toString(), uniqueUserId: user.uniqueUserId, username: user.username, email: user.email });
      setAuthCookie(res, token);

      const userObj = user.toObject();
      delete userObj.passwordHash;
      return successResponse(res, { user: userObj, token }, 'Logged in successfully!');
    }

    // 3. ME (SESSION VALIDATION)
    if (action === 'me') {
      const auth = await requireAuth(req, res);
      if (!auth) return;
      const user = await User.findById(auth.userId).select('-passwordHash');
      if (!user) return errorResponse(res, 'User session invalid', 401);
      return successResponse(res, { user });
    }

    // 4. LOGOUT
    if (action === 'logout') {
      clearAuthCookie(res);
      return successResponse(res, {}, 'Logged out successfully');
    }

    // 5. VERIFY OTP
    if (action === 'verify-otp') {
      const { userId, email, otp, publicKey } = req.body;
      const user = userId ? await User.findById(userId) : await User.findOne({ email: email?.toLowerCase().trim() });
      if (!user) return errorResponse(res, 'User not found', 404);

      user.isVerified = true;
      if (!user.uniqueUserId) user.uniqueUserId = generateUniqueId('USR');
      if (publicKey) user.publicKey = publicKey;
      await user.save();

      const token = generateToken({ userId: user._id.toString(), uniqueUserId: user.uniqueUserId, username: user.username, email: user.email });
      setAuthCookie(res, token);
      const userObj = user.toObject();
      delete userObj.passwordHash;
      return successResponse(res, { user: userObj, token }, 'Account verified successfully!');
    }

    // 6. RESEND OTP
    if (action === 'resend-otp') {
      const { userId, email } = req.body;
      const user = userId ? await User.findById(userId) : await User.findOne({ email: email?.toLowerCase().trim() });
      if (!user) return errorResponse(res, 'User not found', 404);
      const rawOTP = generateRandomOTP();
      return successResponse(res, { message: 'New OTP dispatched', devOTP: rawOTP });
    }

    // 7. FORGOT PASSWORD
    if (action === 'forgot-password') {
      const { email, otp, newPassword } = req.body;
      const user = await User.findOne({ email: email?.toLowerCase().trim() });
      if (!user) return errorResponse(res, 'User with this email does not exist', 404);

      if (!otp && !newPassword) {
        const rawOTP = generateRandomOTP();
        return successResponse(res, { email: user.email, message: 'Password reset OTP sent to your email.' });
      }

      const salt = await bcrypt.genSalt(10);
      user.passwordHash = await bcrypt.hash(newPassword, salt);
      await user.save();
      return successResponse(res, {}, 'Password reset successfully!');
    }

    return errorResponse(res, 'Invalid Auth Action', 404);

  } catch (err) {
    console.error('Auth Module Error:', err);
    return errorResponse(res, err.message || 'Error processing auth request', 500);
  }
}
