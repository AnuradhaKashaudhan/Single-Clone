'use client';

import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ConversationList from '@/components/ConversationList';
import ChatArea from '@/components/ChatArea';
import NewChatModal from '@/components/NewChatModal';
import { wsManager } from '@/lib/websocket';

export interface Conversation {
  id: number;
  type: string;
  name?: string;
  last_message_preview?: string;
  last_message_timestamp?: string;
  unread_count: number;
  participants: Array<{
    id: number;
    username: string;
    display_name: string;
    avatar_url?: string;
    status: string;
  }>;
}

export default function ConversationsPage() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [isNewChatModalOpen, setIsNewChatModalOpen] = useState(false);

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

  return (
    <div className="flex w-full h-full bg-white shadow-2xl rounded-xl overflow-hidden m-4 border border-gray-200/60 backdrop-blur-sm">
      <div className="w-1/3 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-4 bg-white border-b border-gray-100 flex items-center justify-between shadow-sm z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold shadow-md">
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Chats</h2>
          </div>
          <button 
            onClick={() => setIsNewChatModalOpen(true)}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
          </button>
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
          conversations={conversations} 
          selectedId={selectedConversationId} 
          onSelect={setSelectedConversationId} 
          loading={loading}
          currentUserId={user?.id}
        />
      </div>
      <div className="w-2/3 flex flex-col bg-white">
        {selectedConversation ? (
          <ChatArea 
            conversation={selectedConversation} 
            currentUserId={user?.id} 
            onMessageSent={fetchConversations}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center bg-gray-50/30">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">Signal Clone</h3>
            <p className="text-gray-500 text-sm">Select a conversation to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
}
