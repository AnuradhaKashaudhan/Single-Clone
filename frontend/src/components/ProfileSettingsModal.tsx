import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { X, User as UserIcon, Settings, Bell, Lock, Smartphone, Monitor, Video, Phone, Check, Loader2, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onProfileUpdated: (user: any) => void;
}

export default function ProfileSettingsModal({ isOpen, onClose, currentUser, onProfileUpdated }: ProfileSettingsModalProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
  const [displayName, setDisplayName] = useState(currentUser?.display_name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [darkMode, setDarkMode] = useState(typeof window !== 'undefined' ? document.documentElement.classList.contains('dark') : false);

  if (!isOpen) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);
    try {
      const updatedUser = await apiClient.updateProfile({
        display_name: displayName,
        avatar_url: avatarUrl,
      });
      onProfileUpdated(updatedUser);
      setSaved(true);
      toast.success('Profile updated successfully!');
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error('Failed to update profile', err);
      toast.error('Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  const toggleDarkMode = () => {
    const newDark = !darkMode;
    setDarkMode(newDark);
    if (newDark) {
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl shadow-2xl flex max-h-[90vh] overflow-hidden transition-colors">
        
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 hidden md:flex flex-col">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 px-2">Settings</h2>
          
          <nav className="space-y-1 flex-1">
            <button
              onClick={() => setActiveTab('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'profile' 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <UserIcon className="w-5 h-5" /> Profile
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'settings' 
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200' 
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Settings className="w-5 h-5" /> Preferences
            </button>
          </nav>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" /> Log out
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex-1 overflow-y-auto p-6 md:p-8">
            {/* Mobile Tab Switcher */}
            <div className="flex space-x-2 mb-6 md:hidden">
              <button
                onClick={() => setActiveTab('profile')}
                className={`px-4 py-2 text-sm font-medium rounded-full ${activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-sm font-medium rounded-full ${activeTab === 'settings' ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
              >
                Settings
              </button>
            </div>

            {activeTab === 'profile' && (
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Edit Profile</h3>
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="flex justify-center mb-6">
                    <div className="relative group">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-md" />
                      ) : (
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white dark:border-gray-800 shadow-md">
                          {displayName?.charAt(0).toUpperCase() || '?'}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={displayName}
                      onChange={e => setDisplayName(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Avatar URL (Optional)</label>
                    <input
                      type="url"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={avatarUrl}
                      onChange={e => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Username</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                      value={`@${currentUser?.username}`}
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Username cannot be changed.</p>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg flex items-center justify-center transition-colors disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <><Check className="w-5 h-5 mr-2" /> Saved</> : 'Save Profile'}
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="max-w-md mx-auto">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Preferences</h3>
                
                <div className="space-y-6">
                  {/* Appearance */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Appearance</h4>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Monitor className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white font-medium">Dark Mode</span>
                      </div>
                      <button 
                        onClick={toggleDarkMode}
                        className={`w-11 h-6 rounded-full relative transition-colors ${darkMode ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                      >
                        <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${darkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Placeholders */}
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-4">Coming Soon</h4>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                          <Phone className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-900 dark:text-white font-medium">Voice Calls</span>
                        </div>
                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">Soon</span>
                      </div>
                      
                      <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                          <Video className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-900 dark:text-white font-medium">Video Calls</span>
                        </div>
                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">Soon</span>
                      </div>
                      
                      <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                          <Lock className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-900 dark:text-white font-medium">E2EE Setup</span>
                        </div>
                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">Soon</span>
                      </div>

                      <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                          <Bell className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-900 dark:text-white font-medium">Notifications</span>
                        </div>
                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">Soon</span>
                      </div>
                      
                      <div className="flex items-center justify-between opacity-50 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                          <Smartphone className="w-5 h-5 text-gray-500" />
                          <span className="text-gray-900 dark:text-white font-medium">Linked Devices</span>
                        </div>
                        <span className="text-xs font-semibold bg-gray-200 dark:bg-gray-700 text-gray-500 px-2 py-1 rounded">Soon</span>
                      </div>
                    </div>
                  </div>
                  
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
