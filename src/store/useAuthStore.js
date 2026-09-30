import { create } from 'zustand';
import apiClient from '../services/apiClient.js';
import { generateE2EEKeyPair, storePrivateKey, getStoredPrivateKey } from '../services/crypto.js';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  privateKey: null,

  // Initialize E2EE Keys for user
  initE2EEKeys: async (userObj) => {
    if (!userObj) return;

    let localPrivKey = getStoredPrivateKey(userObj._id);
    if (!localPrivKey) {
      const keys = await generateE2EEKeyPair();
      if (keys) {
        storePrivateKey(userObj._id, keys.privateKey);
        localPrivKey = keys.privateKey;
        // Sync public key with backend
        try {
          await apiClient.put('/users/profile', { publicKey: keys.publicKey });
        } catch (e) {
          console.error('Failed to sync public key:', e);
        }
      }
    }
    set({ privateKey: localPrivKey });
  },

  checkAuth: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.get('/auth/me');
      if (res.success && res.data.user) {
        set({ user: res.data.user, isAuthenticated: true, isLoading: false });
        await get().initE2EEKeys(res.data.user);
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch (err) {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const keys = await generateE2EEKeyPair();
      const payload = { ...credentials };
      if (keys) payload.publicKey = keys.publicKey;

      const res = await apiClient.post('/auth/login', payload);
      if (res.success) {
        if (res.data.user) {
          if (keys) storePrivateKey(res.data.user._id, keys.privateKey);
          set({ user: res.data.user, isAuthenticated: true, isLoading: false, privateKey: keys?.privateKey });
        }
        return res.data;
      }
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  signup: async (formData) => {
    set({ isLoading: true, error: null });
    try {
      const res = await apiClient.post('/auth/signup', formData);
      set({ isLoading: false });
      return res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  verifyOTP: async (verifyData) => {
    set({ isLoading: true, error: null });
    try {
      const keys = await generateE2EEKeyPair();
      const payload = { ...verifyData };
      if (keys) payload.publicKey = keys.publicKey;

      const res = await apiClient.post('/auth/verify-otp', payload);
      if (res.success && res.data.user) {
        if (keys) storePrivateKey(res.data.user._id, keys.privateKey);
        set({ user: res.data.user, isAuthenticated: true, isLoading: false, privateKey: keys?.privateKey });
      }
      return res.data;
    } catch (err) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.error('Logout error:', e);
    } finally {
      set({ user: null, isAuthenticated: false, privateKey: null });
    }
  },

  updateProfile: async (updates) => {
    try {
      const res = await apiClient.put('/users/profile', updates);
      if (res.success) {
        set({ user: res.data.user });
      }
      return res.data;
    } catch (err) {
      throw err;
    }
  },
}));
