'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ConversationList from '@/components/ConversationList';
import ChatArea from '@/components/ChatArea';
import NewChatModal from '@/components/NewChatModal';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import { wsManager } from '@/lib/websocket';

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
          if (message.type === 'message' || message.type === 'read_receipt' || message.type === 'user_status' || message.type === 'delivery_receipt') {
             fetchConversations();
          }
        });
        
        return () => {
          unsubscribe();
        };
      }
    }
  }, [user]);

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
      <div className={`w-full md:w-1/3 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-gray-50/50 dark:bg-gray-900/50 ${selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between shadow-sm z-10 transition-colors">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md hover:bg-indigo-700 transition-colors overflow-hidden"
            >
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.display_name?.charAt(0).toUpperCase() || 'U'
              )}
            </button>
            <h2 className="text-xl font-bold text-gray-800 dark:text-white tracking-tight">Chats</h2>
          </div>
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            className="p-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 transition-colors">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Search conversations"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg leading-5 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none focus:bg-white dark:focus:bg-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-colors"
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
      <div className={`w-full md:w-2/3 flex flex-col bg-white dark:bg-gray-900 transition-colors ${!selectedConversationId ? 'hidden md:flex' : 'flex'}`}>
        {selectedConversation ? (
          <ChatArea 
            conversation={selectedConversation} 
            currentUserId={user?.id} 
            onMessageSent={fetchConversations}
            onBack={() => setSelectedConversationId(null)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30 dark:bg-gray-900/30">
            <div className="w-24 h-24 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">Signal Clone</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
