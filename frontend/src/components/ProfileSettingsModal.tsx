'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import {
  X, User as UserIcon, Settings, Bell, Lock, Smartphone,
  Monitor, Check, Loader2, LogOut, Users, MessageSquare, Phone,
  MessageCircle, PieChart, History, Heart, Globe, Image as ImageIcon,
  FolderPlus, Download, UploadCloud, ChevronDown
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useScreenSecurity } from '@/lib/ScreenSecurityContext';

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

type Tab = 'profile' | 'general' | 'appearance' | 'chats' | 'calls' | 'notifications' | 'privacy' | 'data' | 'backups' | 'donate';

export default function ProfileSettingsModal({
  isOpen,
  onClose,
  currentUser,
  onProfileUpdated,
}: ProfileSettingsModalProps) {
  const router = useRouter();
  const { isSecurityEnabled, setIsSecurityEnabled } = useScreenSecurity();

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDisplayName(currentUser?.display_name || '');
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (!isOpen) return null;

  // ── Nav items ──────────────────────────────────────────────────────────────
  const navItems: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'general',       label: 'General',        icon: <Settings className="w-5 h-5" /> },
    { id: 'appearance',    label: 'Appearance',     icon: <Monitor className="w-5 h-5" /> },
    { id: 'chats',         label: 'Chats',          icon: <MessageCircle className="w-5 h-5" /> },
    { id: 'calls',         label: 'Calls',          icon: <Phone className="w-5 h-5" /> },
    { id: 'notifications', label: 'Notifications',  icon: <Bell className="w-5 h-5" /> },
    { id: 'privacy',       label: 'Privacy',        icon: <Lock className="w-5 h-5" /> },
    { id: 'data',          label: 'Data usage',     icon: <PieChart className="w-5 h-5" /> },
    { id: 'backups',       label: 'Backups',        icon: <History className="w-5 h-5" /> },
    { id: 'donate',        label: 'Donate to Signal',icon: <Heart className="w-5 h-5" /> },
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
          <div className="w-full max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6 text-center">General</h3>
            
            <div className="space-y-6">
              {/* Profile Details */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-900 dark:text-gray-100">Phone Number</span>
                  <span className="text-sm text-gray-500">+91 73981 31445</span>
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900 dark:text-gray-100">Device Name</span>
                    <span className="text-[11px] text-gray-500 mt-1">To change the name of this device, open Signal on your phone and navigate to Settings &gt; Linked devices</span>
                  </div>
                  <span className="text-sm text-gray-500">Windows</span>
                </div>
              </div>
              
              {/* System */}
              <div className="pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">System</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Open at computer login</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Hide menu bar</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Minimize to system tray</span>
                  </label>
                </div>
              </div>

              {/* Permissions */}
              <div className="pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Permissions</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Allow access to the microphone</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Allow access to the camera</span>
                  </label>
                </div>
              </div>

              {/* Updates */}
              <div className="pt-4">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Updates</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Automatically download updates</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      // ── APPEARANCE ──────────────────────────────────────────────────────────
      case 'appearance':
        return (
          <div className="w-full max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6 text-center">Appearance</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 text-gray-500">
                  <Globe className="w-4 h-4" />
                  <span className="text-sm text-gray-900 dark:text-gray-100">Language</span>
                </div>
                <div className="relative">
                  <select className="appearance-none bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg pl-3 pr-8 py-1.5 outline-none cursor-pointer">
                    <option>System Language</option>
                    <option>English</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-gray-100 ml-7">Theme</span>
                <div className="relative">
                  <select 
                    value={darkMode ? 'Dark' : 'System'} 
                    onChange={(e) => {
                      if (e.target.value === 'Dark' && !darkMode) toggleDarkMode();
                      if (e.target.value === 'System' && darkMode) toggleDarkMode();
                    }}
                    className="appearance-none bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg pl-3 pr-8 py-1.5 outline-none cursor-pointer"
                  >
                    <option>System</option>
                    <option>Light</option>
                    <option>Dark</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-2 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-gray-100 ml-7">Chat color</span>
                <div className="w-4 h-4 rounded-full bg-blue-600 mr-2"></div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-gray-100 ml-7">Zoom level</span>
                <div className="relative">
                  <select className="appearance-none bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg pl-3 pr-8 py-1.5 outline-none cursor-pointer">
                    <option>100%</option>
                    <option>125%</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-2 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        );

      // ── CHATS ───────────────────────────────────────────────────────────────
      case 'chats':
        return (
          <div className="w-full max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6 text-center">Chats</h3>
            
            <div className="space-y-8">
              {/* Chats Checkboxes */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Chats</h4>
                <div className="space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Spell check text entered in message composition box</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Show text formatting popover when text is selected</span>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Generate link previews</span>
                      <span className="text-[11px] text-gray-500 mt-0.5">Retrieve link previews directly from websites for messages you send.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Use address book photos</span>
                      <span className="text-[11px] text-gray-500 mt-0.5">Display contact photos from your address book if available.</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Convert typed emoticons to emoji</span>
                      <span className="text-[11px] text-gray-500 mt-0.5">For example, :-) will be converted to 🙂</span>
                    </div>
                  </label>
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Keep muted chats archived</span>
                      <span className="text-[11px] text-gray-500 mt-0.5">Muted chats that are archived will remain archived when a new message arrives.</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Emoji Skin Tone */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-900 dark:text-gray-100">Emoji skin tone</span>
                <div className="flex gap-2">
                  <span className="cursor-pointer">👋</span>
                  <span className="cursor-pointer">👋🏻</span>
                  <span className="cursor-pointer">👋🏼</span>
                  <span className="cursor-pointer">👋🏽</span>
                  <span className="cursor-pointer">👋🏾</span>
                  <span className="cursor-pointer">👋🏿</span>
                </div>
              </div>

              {/* Chat Folders */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Chat folders</h4>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-900 dark:text-gray-100">Add a chat folder</span>
                    <span className="text-[11px] text-blue-500">Organize your chats into folders and quickly switch between them on your chat list.</span>
                  </div>
                  <button className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                    Set up
                  </button>
                </div>
              </div>

              {/* Export/Import */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col pr-8">
                    <span className="text-sm text-gray-900 dark:text-gray-100">Export chat history</span>
                    <span className="text-[11px] text-blue-500">Export a machine-readable JSON copy of all your chats. Disappearing messages will not be exported.</span>
                  </div>
                  <button className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">
                    Export
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col pr-8">
                    <span className="text-sm text-gray-900 dark:text-gray-100">Import contacts</span>
                    <span className="text-[11px] text-blue-500">Import all Signal groups and contacts from your mobile device. Last import at 8/13/2026 10:42 PM</span>
                  </div>
                  <button className="bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shrink-0">
                    Import now
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      // ── CALLS ───────────────────────────────────────────────────────────────
      case 'calls':
        return (
          <div className="w-full max-w-2xl mx-auto">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-6 text-center">Calls</h3>
            
            <div className="space-y-8">
              {/* Calling */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Calling</h4>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Enable incoming calls</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Play calling sounds</span>
                  </label>
                </div>
              </div>

              {/* Devices */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Devices</h4>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-900 dark:text-gray-100">Video</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer">
                        <option>HP TrueVision HD Camera (04f2:b6f1)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-900 dark:text-gray-100">Microphone</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer">
                        <option>Communication - Microphone Array (Intel® Smart Sound Technology)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-gray-900 dark:text-gray-100">Speakers</label>
                    <div className="relative">
                      <select className="w-full appearance-none bg-gray-100 dark:bg-[#2C2C2E] border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 text-sm rounded-lg pl-3 pr-8 py-2 outline-none cursor-pointer">
                        <option>Communication - Speaker (Realtek(R) Audio)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-500 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Advanced */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Advanced</h4>
                <label className="flex items-start gap-3 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 mt-0.5" />
                  <div className="flex flex-col">
                    <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">Always relay calls</span>
                    <span className="text-[11px] text-gray-500 mt-0.5 leading-tight">Relay all calls through the Signal server to avoid revealing your IP address to your contact. Enabling will reduce call quality.</span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        );

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
            
            <div className="mb-6">
              <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white mb-4">App Security</h4>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-4">
                <label className="flex items-start justify-between cursor-pointer group">
                  <div className="flex flex-col pr-4">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Screen Security</span>
                    <span className="text-xs text-gray-500 mt-1">Best-effort web protection. Hides chat content when app loses focus and prevents printing. Cannot prevent OS-level screenshots.</span>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={isSecurityEnabled}
                      onChange={(e) => setIsSecurityEnabled(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </div>
                </label>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              <PlaceholderRow icon={<Check className="w-5 h-5 text-gray-500" />} label="Read Receipts" description="Let others know when you read their messages" />
              <PlaceholderRow icon={<MessageSquare className="w-5 h-5 text-gray-500" />} label="Typing Indicators" description="Let others see when you are typing" />
              <PlaceholderRow icon={<UserIcon className="w-5 h-5 text-gray-500" />} label="Online Status" description="Let others see when you are online" />
            </div>
          </div>
        );

      // ── DATA USAGE ──────────────────────────────────────────────────────────
      case 'data':
        return (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-8">Data usage</h3>
            
            <div className="mb-8">
              <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white mb-4">Media auto-download</h4>
              <div className="space-y-3 mb-2">
                {['Photos', 'Videos', 'Audio', 'Documents'].map((item) => (
                  <label key={item} className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" defaultChecked className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500" />
                    <span className="text-[14px] text-gray-900 dark:text-gray-100">{item}</span>
                  </label>
                ))}
              </div>
              <p className="text-[13px] text-gray-500">Voice messages and stickers are always auto-downloaded.</p>
            </div>

            <hr className="border-gray-200 dark:border-gray-800 my-8" />

            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-[14px] font-medium text-gray-900 dark:text-white mb-1">Sent media quality</h4>
                <p className="text-[13px] text-gray-500">Sending high quality media will use more data.</p>
              </div>
              <div className="relative">
                <select className="appearance-none bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white text-[13px] px-4 py-1.5 pr-8 rounded-md outline-none cursor-pointer">
                  <option>Standard</option>
                  <option>High</option>
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          </div>
        );

      // ── BACKUPS ─────────────────────────────────────────────────────────────
      case 'backups':
        return (
          <div className="max-w-2xl mx-auto">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 text-center">Backups</h3>
            <p className="text-[13px] text-gray-700 dark:text-gray-300 mb-8 text-center max-w-lg mx-auto">
              Back up your message history so you never lose data when you get a new phone or reinstall Signal.
            </p>

            <div className="flex gap-4 mb-10">
              <History className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-[14px] font-medium text-gray-900 dark:text-white mb-1">Signal Secure Backups</h4>
                <p className="text-[13px] text-gray-500">
                  Automatic backups with Signal's secure, end-to-end encrypted storage service. Get started on your phone. <a href="#" className="text-blue-600 hover:underline">Learn more.</a>
                </p>
              </div>
            </div>

            <h4 className="text-[13px] font-semibold text-gray-900 dark:text-white mb-4">Other ways to back up</h4>
            
            <div className="flex gap-4 items-start justify-between">
              <div className="flex gap-4">
                <svg className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div>
                  <h4 className="text-[14px] font-medium text-gray-900 dark:text-white mb-1">Desktop backups</h4>
                  <p className="text-[13px] text-gray-500 max-w-sm">
                    Create an end-to-end encrypted backup that you can restore on your phone.
                  </p>
                </div>
              </div>
              <button className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white text-[13px] font-medium rounded-full transition-colors">
                Set up
              </button>
            </div>
          </div>
        );

      // ── DONATE TO SIGNAL ────────────────────────────────────────────────────
      case 'donate':
        return (
          <div className="max-w-2xl mx-auto flex flex-col items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-12 self-start">Donate to Signal</h3>
            
            <div className="w-20 h-20 rounded-full bg-[#8299B2] flex items-center justify-center text-white text-3xl font-medium shadow-sm mb-6">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
              ) : (
                currentUser?.display_name?.charAt(0).toLowerCase() || 'u'
              )}
            </div>

            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Proudly nonprofit</h2>
            <p className="text-[13px] text-gray-600 dark:text-gray-400 text-center max-w-md mb-6 leading-relaxed">
              Donate to support private messaging. Keep Signal independent and ad-free. <a href="#" className="text-blue-600 hover:underline">Read more</a>
            </p>
            
            <button className="px-6 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-medium rounded-full transition-colors mb-12">
              Donate
            </button>

            <div className="w-full max-w-lg">
              <hr className="border-gray-200 dark:border-gray-800 mb-6" />
              
              <a href="#" className="flex items-center justify-between group cursor-pointer mb-6">
                <div className="flex items-center gap-3 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                  <div className="w-5 h-5 rounded-full border border-current flex items-center justify-center">
                    <span className="text-xs font-medium">?</span>
                  </div>
                  <span className="text-[14px] font-medium">Donor FAQs</span>
                </div>
                <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>

              <p className="text-[12px] text-gray-500">
                Badges and monthly donations can be managed on your mobile device.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 md:left-14 bg-white dark:bg-[#1C1C1E] z-50 flex overflow-hidden transition-colors shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.3)]">
      <div className="w-full h-full flex">

        {/* Left sidebar nav */}
        <div className="w-[280px] bg-gray-50 dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 p-0 hidden md:flex flex-col flex-shrink-0">
          <div className="px-5 pt-8 pb-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#8299B2] flex items-center justify-center text-white text-lg font-medium shadow-sm">
              {currentUser?.avatar_url ? (
                <img src={currentUser.avatar_url} alt="Profile" className="w-full h-full object-cover rounded-full" />
              ) : (
                currentUser?.display_name?.charAt(0).toLowerCase() || 'u'
              )}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{currentUser?.display_name || 'User'}</span>
              <span className="text-[11px] text-gray-500">+91 73981 31445</span>
            </div>
          </div>

          <nav className="space-y-0.5 flex-1 px-3">
            {navItems.map(({ id, label, icon }, i) => (
              <button
                key={`${id}-${i}`}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                  activeTab === id && i < 7
                    ? 'bg-gray-200/70 text-black dark:bg-gray-700/50 dark:text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                }`}
              >
                <div className="text-gray-500">{icon}</div>
                {label}
              </button>
            ))}
          </nav>
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
          <div className="flex-1 overflow-y-auto px-10 py-12 bg-white dark:bg-[#1C1C1E]">
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
