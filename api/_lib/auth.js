import jwt from 'jsonwebtoken';
import { parse, serialize } from 'cookie';
import { errorResponse } from './response.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_key_12345';
const COOKIE_NAME = 'auth_token';

export function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function setAuthCookie(res, token) {
  const cookieHeader = serialize(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
  });

  res.setHeader('Set-Cookie', cookieHeader);
}

export function clearAuthCookie(res) {
  const cookieHeader = serialize(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  res.setHeader('Set-Cookie', cookieHeader);
}

export function extractToken(req) {
  // Check cookie header first
  if (req.headers.cookie) {
    const cookies = parse(req.headers.cookie);
    if (cookies[COOKIE_NAME]) {
      return cookies[COOKIE_NAME];
    }
  }

  // Fallback to Bearer token header
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1];
  }

  return null;
}

export async function requireAuth(req, res) {
  const token = extractToken(req);
  if (!token) {
    errorResponse(res, 'Authentication token missing', 401);
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    errorResponse(res, 'Invalid or expired authentication token', 401);
    return null;
  }

  return decoded; // Returns { userId, username, ... }
}
