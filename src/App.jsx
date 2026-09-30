import React, { useEffect, useState } from 'react';
import { useAuthStore } from './store/useAuthStore.js';
import { useChatStore } from './store/useChatStore.js';
import { usePusher } from './hooks/usePusher.js';
import { useNotifications } from './hooks/useNotifications.js';

import Login from './components/auth/Login.jsx';
import Signup from './components/auth/Signup.jsx';
import VerifyOTP from './components/auth/VerifyOTP.jsx';
import ForgotPassword from './components/auth/ForgotPassword.jsx';

import Sidebar from './components/sidebar/Sidebar.jsx';
import ChatWindow from './components/chat/ChatWindow.jsx';
import ProfileModal from './components/modals/ProfileModal.jsx';
import GroupModal from './components/modals/GroupModal.jsx';
import GroupDetailsModal from './components/modals/GroupDetailsModal.jsx';
import { MessageSquare } from 'lucide-react';

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const selectConversation = useChatStore((state) => state.selectConversation);

  const [authView, setAuthView] = useState('login'); // 'login' | 'signup' | 'otp' | 'forgot'
  const [otpParams, setOtpParams] = useState({ userId: '', email: '', devOTP: '' });

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedGroupDetails, setSelectedGroupDetails] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  usePusher();
  useNotifications();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-400">
        <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mb-4 animate-pulse">
          <MessageSquare className="w-8 h-8" />
        </div>
        <span className="text-xs font-semibold tracking-wider text-slate-300">Loading PulseChat...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    if (authView === 'signup') {
      return (
        <Signup
          onSwitchToLogin={() => setAuthView('login')}
          onSignupSuccess={(params) => {
            setOtpParams(params);
            setAuthView('otp');
          }}
        />
      );
    }

    if (authView === 'otp') {
      return (
        <VerifyOTP
          userId={otpParams.userId}
          email={otpParams.email}
          devOTP={otpParams.devOTP}
          onBackToLogin={() => setAuthView('login')}
        />
      );
    }

    if (authView === 'forgot') {
      return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
    }

    return (
      <Login
        onSwitchToSignup={() => setAuthView('signup')}
        onSwitchToOTP={(params) => {
          setOtpParams(params);
          setAuthView('otp');
        }}
        onSwitchToForgotPassword={() => setAuthView('forgot')}
      />
    );
  }

  return (
    <div className="h-screen w-screen flex bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Sidebar: Shown full screen on mobile when no active chat, or fixed width on desktop */}
      <div className={`${activeConversationId ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 h-full flex-shrink-0`}>
        <Sidebar
          onOpenProfile={() => setIsProfileOpen(true)}
          onOpenCreateGroup={() => setIsGroupModalOpen(true)}
        />
      </div>

      {/* Main Chat Area: Shown full screen on mobile when active chat exists, or flexible on desktop */}
      <div className={`${activeConversationId ? 'flex' : 'hidden md:flex'} flex-1 h-full`}>
        <ChatWindow
          onBackToSidebar={() => selectConversation(null)}
          onOpenGroupDetails={(group) => setSelectedGroupDetails(group)}
        />
      </div>

      {/* Modals */}
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <GroupModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />

      <GroupDetailsModal
        group={selectedGroupDetails}
        isOpen={Boolean(selectedGroupDetails)}
        onClose={() => setSelectedGroupDetails(null)}
      />
    </div>
  );
}
