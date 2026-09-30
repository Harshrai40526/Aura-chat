import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/useAuthStore.js';
import apiClient from '../../services/apiClient.js';
import { ShieldCheck, RotateCw, ArrowLeft, Key } from 'lucide-react';

export default function VerifyOTP({ userId, email, devOTP, onBackToLogin }) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(60);
  const [expiresIn, setExpiresIn] = useState(300);
  const [activeDevOTP, setActiveDevOTP] = useState(devOTP || '');

  const inputRefs = useRef([]);
  const verifyOTP = useAuthStore((state) => state.verifyOTP);

  // Auto-fill dev OTP if available
  useEffect(() => {
    if (activeDevOTP && activeDevOTP.length === 6) {
      setOtp(activeDevOTP.split(''));
    }
  }, [activeDevOTP]);

  useEffect(() => {
    const cdTimer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const expTimer = setInterval(() => {
      setExpiresIn((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => {
      clearInterval(cdTimer);
      clearInterval(expTimer);
    };
  }, []);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    try {
      const res = await apiClient.post('/auth/resend-otp', { userId, email });
      if (res.success) {
        setResendCooldown(res.data.cooldownSeconds || 60);
        setExpiresIn(300);
        if (res.data.devOTP) {
          setActiveDevOTP(res.data.devOTP);
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      return setError('Please enter a 6-digit OTP code');
    }

    setError('');
    setLoading(true);

    try {
      await verifyOTP({ userId, email, otp: otpCode });
    } catch (err) {
      setError(err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
        <button
          onClick={onBackToLogin}
          className="flex items-center space-x-2 text-xs text-slate-400 hover:text-slate-200 mb-6 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Verify One-Time Password</h1>
          <p className="text-slate-400 text-xs mt-1">
            Enter the 6-digit verification code sent to{' '}
            <span className="text-slate-200 font-medium">{email || 'your email'}</span>
          </p>
        </div>

        {/* Dev Mode Visual OTP Banner */}
        {activeDevOTP && (
          <div className="mb-6 p-4 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-between text-indigo-300">
            <div className="flex items-center space-x-2">
              <Key className="w-5 h-5 text-indigo-400" />
              <div className="text-xs">
                <span className="font-bold block text-indigo-200">Dev Mode OTP Code</span>
                <span>Auto-filled for local testing</span>
              </div>
            </div>
            <span className="font-mono text-xl font-bold tracking-widest text-white bg-indigo-600 px-3 py-1 rounded-xl shadow-md">
              {activeDevOTP}
            </span>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-between space-x-2">
            {otp.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                className="w-12 h-14 bg-slate-800/80 border border-slate-700 rounded-xl text-center text-xl font-bold text-indigo-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 transition"
              />
            ))}
          </div>

          <div className="flex justify-between items-center text-xs text-slate-400">
            <span>
              Expires in:{' '}
              <strong className={expiresIn < 60 ? 'text-red-400' : 'text-slate-200'}>
                {formatTime(expiresIn)}
              </strong>
            </span>

            <button
              type="button"
              onClick={handleResend}
              disabled={resendCooldown > 0}
              className="flex items-center space-x-1 text-indigo-400 disabled:text-slate-600 hover:underline cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Code'}
              </span>
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-xl transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <span>Verify & Activate Account</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
