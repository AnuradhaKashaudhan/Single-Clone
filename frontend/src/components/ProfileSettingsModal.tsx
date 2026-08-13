'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import {
  X, User as UserIcon, Settings, Bell, Lock, Smartphone,
  Monitor, Check, Loader2, LogOut, Users, MessageSquare, Phone
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface UserProfile {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
}

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile | null | undefined;
  onProfileUpdated: (user: UserProfile) => void;
}

type Tab = 'profile' | 'general' | 'appearance' | 'chats' | 'calls' | 'notifications' | 'privacy' | 'data';

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: ProfileSettingsModalProps) {
  const router = useRouter();

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<Tab>('profile');

  // ── Profile form state ─────────────────────────────────────────────────────
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ── Appearance state ───────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(
    typeof window !== 'undefined'
      ? document.documentElement.classList.contains('dark')
      : false
  );

  // Keep profile form in sync when modal opens or currentUser changes
  useEffect(() => {
    if (isOpen) {
      setDisplayName(currentUser?.display_name || '');
      setAvatarUrl(currentUser?.avatar_url || '');
    }
  }, [isOpen, currentUser]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    try {
      const updatedUser = await apiClient.updateProfile({
        display_name: displayName,
        avatar_url: avatarUrl,
      });
      onProfileUpdated(updatedUser as UserProfile);
      setSaved(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  const toggleDarkMode = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    router.push('/login');
  };

  if (!isOpen) return null;

  // ── Nav items ──────────────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'profile',       label: 'Profile',       icon: <UserIcon className="w-4 h-4" /> },
    { id: 'general',       label: 'General',        icon: <Settings className="w-4 h-4" /> },
    { id: 'appearance',    label: 'Appearance',     icon: <Monitor className="w-4 h-4" /> },
    { id: 'chats',         label: 'Chats',          icon: <Smartphone className="w-4 h-4" /> },
    { id: 'calls',         label: 'Calls',          icon: <Phone className="w-4 h-4" /> },
    { id: 'notifications', label: 'Notifications',  icon: <Bell className="w-4 h-4" /> },
    { id: 'privacy',       label: 'Privacy',        icon: <Lock className="w-4 h-4" /> },
    { id: 'data',          label: 'Data Usage',     icon: <Check className="w-4 h-4" /> },
  ];

  // ── Tab content renderer ───────────────────────────────────────────────────
  const renderContent = () => {
    switch (activeTab) {

      // ── PROFILE ────────────────────────────────────────────────────────────
      case 'profile':
        return (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Edit Profile</h3>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar */}
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 text-3xl font-bold shadow-sm relative overflow-hidden group cursor-pointer">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    displayName?.charAt(0).toUpperCase() || 'U'
                  )}
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-white text-xs font-medium">Change</span>
                  </div>
                </div>
              </div>

              {/* Display Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>

              {/* Avatar URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Avatar URL <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                />
              </div>

              {/* Username (read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  value={`@${currentUser?.username ?? ''}`}
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">Username cannot be changed.</p>
              </div>

              {/* Save button */}
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saved ? (
                  <><Check className="w-5 h-5 mr-2" /> Saved</>
                ) : (
                  'Save Profile'
                )}
              </button>
            </form>
          </div>
        );

      // ── GENERAL ─────────────────────────────────────────────────────────────
      case 'general':
        return (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">General</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Keyboard Shortcuts</h4>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Focus Search</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">Ctrl/Cmd</kbd>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">K</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">New Chat</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">Ctrl/Cmd</kbd>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">Shift</kbd>
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">N</kbd>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Cancel Reply / Close Attachment</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono text-gray-600 dark:text-gray-400">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      // ── APPEARANCE ──────────────────────────────────────────────────────────
      case 'appearance':
        return (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Appearance</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {/* Dark Mode toggle */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium block text-sm">Dark Mode</span>
                    <span className="text-xs text-gray-500">Switch between light and dark themes</span>
                  </div>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`w-11 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                  aria-label="Toggle dark mode"
                >
                  <div
                    className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
              </div>
              {/* System theme placeholder */}
              <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <Monitor className="w-5 h-5 text-gray-500" />
                  <div>
                    <span className="text-gray-900 dark:text-white font-medium block text-sm">System Theme</span>
                    <span className="text-xs text-gray-500">Follow system dark/light preference</span>
                  </div>
                </div>
                <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">Soon</span>
              </div>
            </div>
          </div>
        );

      // ── CHATS ───────────────────────────────────────────────────────────────
      case 'chats':
        return <ComingSoonPanel title="Chats" icon={<Smartphone className="w-8 h-8 text-gray-400" />} />;

      // ── CALLS ───────────────────────────────────────────────────────────────
      case 'calls':
        return <ComingSoonPanel title="Calls" icon={<Phone className="w-8 h-8 text-gray-400" />} />;

      // ── NOTIFICATIONS ───────────────────────────────────────────────────────
      case 'notifications':
        return (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Notifications</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              <PlaceholderRow icon={<Bell className="w-5 h-5 text-gray-500" />} label="Message Notifications" description="Show alerts for new messages" />
              <PlaceholderRow icon={<Users className="w-5 h-5 text-gray-500" />} label="Group Notifications" description="Show alerts for group messages" />
              <PlaceholderRow icon={<MessageSquare className="w-5 h-5 text-gray-500" />} label="Mention Notifications" description="Notify when you are mentioned" />
            </div>
          </div>
        );

      // ── PRIVACY ─────────────────────────────────────────────────────────────
      case 'privacy':
        return (
          <div className="max-w-md mx-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Privacy</h3>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              <PlaceholderRow icon={<Check className="w-5 h-5 text-gray-500" />} label="Read Receipts" description="Let others know when you read their messages" />
              <PlaceholderRow icon={<MessageSquare className="w-5 h-5 text-gray-500" />} label="Typing Indicators" description="Let others see when you are typing" />
              <PlaceholderRow icon={<UserIcon className="w-5 h-5 text-gray-500" />} label="Online Status" description="Let others see when you are online" />
            </div>
          </div>
        );

      // ── DATA USAGE ──────────────────────────────────────────────────────────
      case 'data':
        return <ComingSoonPanel title="Data Usage" icon={<Check className="w-8 h-8 text-gray-400" />} />;

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl shadow-2xl flex max-h-[90vh] overflow-hidden transition-colors">

        {/* Left sidebar nav */}
        <div className="w-52 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 hidden md:flex flex-col flex-shrink-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 px-2">Settings</h2>

          <nav className="space-y-0.5 flex-1">
            {navItems.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {icon}
                {label}
              </button>
            ))}
          </nav>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors mt-2"
          >
            <LogOut className="w-4 h-4" /> Log out
          </button>
        </div>

        {/* Right content area */}
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Mobile tab bar */}
          <div className="flex space-x-2 p-4 pb-0 md:hidden overflow-x-auto shrink-0">
            {navItems.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  activeTab === id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Small reusable sub-components ─────────────────────────────────────────────

function ComingSoonPanel({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">{title}</h3>
      <div className="flex flex-col items-center justify-center p-10 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-center">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
          {icon}
        </div>
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-1">Coming Soon</h4>
        <p className="text-sm text-gray-500">This feature is not yet available.</p>
      </div>
    </div>
  );
}

function PlaceholderRow({
  icon,
  label,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 opacity-50 cursor-not-allowed">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <span className="text-gray-900 dark:text-white font-medium block text-sm">{label}</span>
          <span className="text-xs text-gray-500">{description}</span>
        </div>
      </div>
      <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded flex-shrink-0">
        Soon
      </span>
    </div>
  );
}
