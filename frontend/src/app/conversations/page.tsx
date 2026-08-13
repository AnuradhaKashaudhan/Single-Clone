'use client';

import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ConversationList from '@/components/ConversationList';
import ChatArea from '@/components/ChatArea';
import NewChatModal from '@/components/NewChatModal';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import { wsManager } from '@/lib/websocket';
import { MessageCircle, Phone, Aperture, Settings as SettingsIcon, Menu, Edit, MoreHorizontal, Filter, Link2Off } from 'lucide-react';

export interface Participant {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: string;
  role?: 'admin' | 'member';
}

export interface ConversationSettings {
  is_pinned?: boolean;
  is_archived?: boolean;
  muted_until?: string | null;
  cleared_at?: string | null;
}

export interface Conversation {
  id: number;
  type: string;
  name?: string;
  last_message_preview?: string;
  last_message_timestamp?: string;
  unread_count: number;
  disappearing_messages_seconds?: number;
  settings?: ConversationSettings;
  participants: Participant[];
}

export default function ConversationsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavExpanded, setIsNavExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'calls' | 'stories'>('chats');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const selectedConversationIdRef = useRef<number | null>(null);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setIsNewChatModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const fetchConversations = async () => {
    try {
      const data: any = await apiClient.listConversations();
      setConversations(data);
    } catch (error) {
      console.error('Failed to fetch conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      const token = apiClient.getToken();
      if (token) {
        wsManager.connect(token).catch(err => console.warn('Failed to connect WS:', err));
        
        const unsubscribe = wsManager.subscribe((message) => {
          if (message.type === 'message') {
            const newMsg = message.message;
            const convId = newMsg.conversation_id;
            
            setConversations(prev => {
              const idx = prev.findIndex(c => c.id === convId);
              if (idx === -1) {
                // New conversation not in list, fallback to fetch
                fetchConversations();
                return prev;
              }
              
              const updatedConv = { ...prev[idx] };
              updatedConv.last_message_preview = newMsg.content.substring(0, 50);
              updatedConv.last_message_timestamp = newMsg.created_at;
              
              // Increment unread count if we are not the sender and the chat isn't currently open
              if (newMsg.sender_id !== user.id && selectedConversationIdRef.current !== convId) {
                updatedConv.unread_count += 1;
              }
              
              // Move to top
              const next = [...prev];
              next.splice(idx, 1);
              next.unshift(updatedConv);
              return next;
            });
          } else if (message.type === 'read_receipt') {
             if (message.reader_id === user.id) {
               const convId = message.conversation_id;
               setConversations(prev => 
                 prev.map(c => c.id === convId ? { ...c, unread_count: 0 } : c)
               );
             }
          } else if (
            message.type === 'user_status' || 
            message.type === 'delivery_receipt' ||
            message.type === 'settings_updated'
          ) {
             if (message.type === 'settings_updated') {
               // If conversation is deleted or history cleared, refetch or remove
               if (message.action === 'deleted') {
                 setConversations((prev) => prev.filter(c => c.id !== message.conversation_id));
                 if (selectedConversationIdRef.current === message.conversation_id) {
                   setSelectedConversationId(null);
                 }
               } else {
                 // Refetch conversations to get the updated settings (or just update the local one)
                 // A full refetch is safest for all setting changes like pinning/unpinning, clearing history
                 fetchConversations();
               }
             }
          }
        });
        
        return () => {
          unsubscribe();
        };
      }
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversationId) {
      // Immediately clear local unread count when a conversation is opened
      setConversations(prev => 
        prev.map(c => c.id === selectedConversationId ? { ...c, unread_count: 0 } : c)
      );
    }
  }, [selectedConversationId]);

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId) || null;

  useEffect(() => {
    // Apply saved theme on initial load
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      }
    }
  }, []);

  const toggleFullScreenAndNav = () => {
    setIsNavExpanded(!isNavExpanded);
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error attempting to enable fullscreen:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    if (conv.type === 'group' && conv.name) {
      return conv.name.toLowerCase().includes(q);
    }
    const otherParticipant = conv.participants.find(p => p.id !== user?.id);
    if (otherParticipant) {
      return otherParticipant.display_name.toLowerCase().includes(q) || otherParticipant.username.toLowerCase().includes(q);
    }
    return false;
  });

  return (
    <div className="flex w-full h-full bg-white dark:bg-gray-900 shadow-2xl rounded-xl overflow-hidden m-0 md:m-4 md:border border-gray-200/60 dark:border-gray-800 backdrop-blur-sm transition-colors">
      
      {/* Left Navigation Rail (Desktop) */}
      <div className={`${isNavExpanded ? 'hidden md:flex' : 'hidden'} w-14 bg-gray-50 dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 flex-col items-center pb-4 justify-between z-20 transition-colors`}>
        <div className="flex flex-col gap-3 w-full items-center">
          <div className="h-14 flex items-center justify-center w-full shrink-0">
            <button 
              onClick={toggleFullScreenAndNav}
              className="p-2 text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all" 
              title="Toggle Full Screen & Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          
          <button 
            onClick={() => { setActiveTab('chats'); setIsProfileModalOpen(false); }}
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'chats' ? 'bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            title="Chats"
          >
            <MessageCircle strokeWidth={activeTab === 'chats' ? 2.5 : 2} className="w-[22px] h-[22px]" />
          </button>
          
          <button 
            onClick={() => { setActiveTab('calls'); setIsProfileModalOpen(false); }}
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'calls' ? 'bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            title="Calls"
          >
            <Phone strokeWidth={activeTab === 'calls' ? 2.5 : 2} className="w-[22px] h-[22px]" />
          </button>

          <button 
            onClick={() => { setActiveTab('stories'); setIsProfileModalOpen(false); }}
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'stories' ? 'bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            title="Stories"
          >
            <Aperture strokeWidth={activeTab === 'stories' ? 2.5 : 2} className="w-[22px] h-[22px]" />
          </button>
        </div>

        <div className="flex flex-col gap-3 w-full items-center">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
            title="Settings"
          >
            <SettingsIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className={`w-full md:w-[280px] lg:w-[320px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#1E1E1E] ${selectedConversationId || activeTab !== 'chats' ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-2">
            {!isNavExpanded && (
              <button 
                onClick={toggleFullScreenAndNav}
                className="p-2 -ml-2 text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all" 
                title="Restore Nav"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{activeTab}</h1>
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button 
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2 bg-white dark:bg-[#1E1E1E] transition-colors">
          <div className="relative flex items-center bg-gray-100 dark:bg-[#2C2C2E] rounded-lg">
            <div className="pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-2 pr-2 py-1.5 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none sm:text-sm transition-colors"
            />
            <button className="pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Unlinked Banner Removed */}
        
        <NewChatModal 
          isOpen={isNewChatModalOpen}
          onClose={() => setIsNewChatModalOpen(false)}
          onChatCreated={(conv) => {
            setIsNewChatModalOpen(false);
            setConversations([conv, ...conversations.filter(c => c.id !== conv.id)]);
            setSelectedConversationId(conv.id);
          }}
          existingConversations={conversations as any[]}
        />
        <ConversationList 
          conversations={filteredConversations} 
          selectedId={selectedConversationId} 
          onSelect={setSelectedConversationId} 
          loading={loading}
          currentUserId={user?.id}
        />
        <ProfileSettingsModal 
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          currentUser={user}
          onProfileUpdated={(updatedUser) => {
            // Wait for next reload or context update to reflect globally
            // The context should ideally be updated here
            window.location.reload();
          }}
        />
      </div>
      <div className={`flex-1 flex flex-col bg-white dark:bg-gray-900 transition-colors ${!selectedConversationId && activeTab === 'chats' ? 'hidden md:flex' : 'flex'}`}>
        {activeTab === 'calls' ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-950">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6">
              <Phone className="h-10 w-10 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Calls</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Voice and video calls are coming soon.</p>
          </div>
        ) : activeTab === 'stories' ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-950">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6">
              <Aperture className="h-10 w-10 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Stories</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Share disappearing moments with your contacts. Coming soon.</p>
          </div>
        ) : selectedConversation ? (
          <ChatArea 
            conversation={selectedConversation} 
            currentUserId={user?.id} 
            onMessageSent={fetchConversations}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-950">
            <div className="flex items-center justify-center mb-6">
              <svg width="120" height="120" viewBox="0 0 120 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Outer dashed path */}
                <path d="M60 15C35 15 15 35 15 60C15 70 19 79 26 86L15 105l21-6c7 4 15 7 24 7C85 106 105 85 105 60C105 35 85 15 60 15Z" 
                      stroke="#3b82f6" strokeWidth="2.5" strokeDasharray="7 6" strokeLinecap="round" />
                
                {/* Inner filled path (scaled down) */}
                <path d="M60 23C42 23 27 36 27 55C27 63 30 70 35 75L27 91l16-4.5C48 89 54 90 60 90C78 90 93 77 93 55C93 33 78 23 60 23Z" 
                      fill="#3b82f6" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-900 dark:text-gray-200 mb-2">Welcome to Signal</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              See <span className="text-blue-500 hover:underline cursor-pointer">what's new</span> in this update
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
