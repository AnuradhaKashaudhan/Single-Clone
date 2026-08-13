'use client';

import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ConversationList from '@/components/ConversationList';
import ChatArea from '@/components/ChatArea';
import NewChatModal from '@/components/NewChatModal';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import { wsManager } from '@/lib/websocket';
import { MessageCircle, Phone, Aperture, Settings as SettingsIcon } from 'lucide-react';

export interface Participant {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: string;
  role?: 'admin' | 'member';
}

export interface Conversation {
  id: number;
  type: string;
  name?: string;
  last_message_preview?: string;
  last_message_timestamp?: string;
  unread_count: number;
  disappearing_messages_seconds?: number;
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
             // For these less critical events, we can just refetch in the background or ignore.
             // Usually, delivery_receipt doesn't affect the sidebar. user_status updates online status, 
             // but refetching on every user status change is too heavy. Let's only refetch for settings_updated.
             if (message.type === 'settings_updated') {
               fetchConversations();
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
      <div className="hidden md:flex w-14 bg-gray-50 dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 flex-col items-center py-4 justify-between z-20 transition-colors">
        <div className="flex flex-col gap-3 w-full items-center">
          <button 
            onClick={() => setActiveTab('chats')}
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'chats' ? 'bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            title="Chats"
          >
            <MessageCircle strokeWidth={activeTab === 'chats' ? 2.5 : 2} className="w-[22px] h-[22px]" />
          </button>
          
          <button 
            onClick={() => setActiveTab('calls')}
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'calls' ? 'bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            title="Calls"
          >
            <Phone strokeWidth={activeTab === 'calls' ? 2.5 : 2} className="w-[22px] h-[22px]" />
          </button>

          <button 
            onClick={() => setActiveTab('stories')}
            className={`p-2.5 rounded-xl transition-all ${activeTab === 'stories' ? 'bg-gray-200 dark:bg-gray-800 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            title="Stories"
          >
            <Aperture strokeWidth={activeTab === 'stories' ? 2.5 : 2} className="w-[22px] h-[22px]" />
          </button>
        </div>

        <div className="flex flex-col gap-3 w-full items-center">
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="p-2.5 text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
            title="Settings"
          >
            <SettingsIcon className="w-[22px] h-[22px]" />
          </button>
          <button 
            onClick={() => setIsProfileModalOpen(true)}
            className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm hover:shadow-md transition-all overflow-hidden border-2 border-transparent hover:border-blue-400"
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              user?.display_name?.charAt(0).toUpperCase() || 'U'
            )}
          </button>
        </div>
      </div>

      <div className={`w-full md:w-[280px] lg:w-[320px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#1E1E1E] ${selectedConversationId || activeTab !== 'chats' ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-3 h-14 bg-white dark:bg-[#1E1E1E] flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-3">
            <h2 className="text-[20px] font-bold text-gray-900 dark:text-white tracking-tight">Chats</h2>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-3 pb-2 bg-white dark:bg-[#1E1E1E] transition-colors">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
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
              className="block w-full pl-9 pr-3 py-1.5 border border-transparent dark:border-transparent rounded-lg leading-5 bg-gray-100 dark:bg-[#2C2C2E] text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-[#2C2C2E] focus:ring-1 focus:ring-blue-500 sm:text-sm transition-colors"
            />
          </div>
        </div>
        
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
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-950">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-900 rounded-full flex items-center justify-center mb-6">
              <MessageCircle className="h-10 w-10 text-gray-400 dark:text-gray-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Signal Clone</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
