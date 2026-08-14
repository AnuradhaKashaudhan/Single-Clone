'use client';

import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import ConversationList from '@/components/ConversationList';
import ChatArea from '@/components/ChatArea';
import NewChatModal from '@/components/NewChatModal';
import ProfileSettingsModal from '@/components/ProfileSettingsModal';
import { wsManager } from '@/lib/websocket';
import { MessageCircle, Phone, Aperture, Settings as SettingsIcon, Menu, Edit, MoreHorizontal, Filter, Link2Off, Link, Search, Plus, Layers, Copy, Archive, FolderPlus, Moon, ChevronRight } from 'lucide-react';

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
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isNotifSubMenuOpen, setIsNotifSubMenuOpen] = useState(false);
  const [filterUnread, setFilterUnread] = useState(false);
  const [viewingArchive, setViewingArchive] = useState(false);
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
            const newMsg = message.message as any;
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

  const toggleNav = () => {
    setIsNavExpanded(!isNavExpanded);
  };


  return (
    <div className="flex flex-1 bg-white dark:bg-gray-900 overflow-hidden transition-colors">
      
      {/* Left Navigation Rail (Desktop) */}
      <div className={`${isNavExpanded ? 'hidden md:flex' : 'hidden'} w-14 bg-gray-50 dark:bg-[#1E1E1E] border-r border-gray-200 dark:border-gray-800 flex-col items-center pt-3 pb-4 justify-between z-20 transition-colors`}>
        <div className="flex flex-col gap-3 w-full items-center">
          <div className="flex items-center justify-center w-full shrink-0 pb-1 relative group">
            <button 
              onClick={toggleNav}
              className="p-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all" 
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              Toggle Nav
            </div>
          </div>
          <div className="relative group w-full flex justify-center">
            <button 
              onClick={() => { setActiveTab('chats'); setIsProfileModalOpen(false); }}
              className={`p-2.5 rounded-xl transition-all ${activeTab === 'chats' ? 'bg-blue-100 dark:bg-blue-900/40 text-black dark:text-white' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            >
              <MessageCircle strokeWidth={activeTab === 'chats' ? 2.5 : 2} className="w-[22px] h-[22px] shrink-0" fill={activeTab === 'chats' ? "currentColor" : "none"} />
            </button>
            <div className="absolute left-full ml-3 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              Chats
            </div>
          </div>
          
          <div className="relative group w-full flex justify-center">
            <button 
              onClick={() => { setActiveTab('calls'); setIsProfileModalOpen(false); }}
              className={`p-2.5 rounded-xl transition-all ${activeTab === 'calls' ? 'bg-blue-100 dark:bg-blue-900/40 text-black dark:text-white' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            >
              <Phone strokeWidth={activeTab === 'calls' ? 2.5 : 2} className="w-[22px] h-[22px] shrink-0" fill={activeTab === 'calls' ? "currentColor" : "none"} />
            </button>
            <div className="absolute left-full ml-3 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              Calls
            </div>
          </div>

          <div className="relative group w-full flex justify-center">
            <button 
              onClick={() => { setActiveTab('stories'); setIsProfileModalOpen(false); }}
              className={`p-2.5 rounded-xl transition-all ${activeTab === 'stories' ? 'bg-blue-100 dark:bg-blue-900/40 text-black dark:text-white' : 'text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50'}`}
            >
              <Copy strokeWidth={activeTab === 'stories' ? 2.5 : 2} className="w-[22px] h-[22px] shrink-0" />
            </button>
            <div className="absolute left-full ml-3 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              Stories
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full items-center">
          <div className="relative group w-full flex justify-center">
            <button 
              onClick={() => setIsProfileModalOpen(true)}
              className="p-2.5 text-gray-500 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all"
            >
              <SettingsIcon className="w-[22px] h-[22px] shrink-0" />
            </button>
            <div className="absolute left-full ml-3 px-2 py-1.5 bg-gray-900 dark:bg-gray-700 text-white text-xs font-medium rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 whitespace-nowrap z-50 pointer-events-none">
              Settings
            </div>
          </div>
        </div>
      </div>

      <div className={`w-full md:w-[280px] lg:w-[320px] flex-shrink-0 border-r border-gray-100 dark:border-gray-800 flex flex-col bg-white dark:bg-[#1E1E1E] ${selectedConversationId || activeTab !== 'chats' ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 shrink-0">
          <div className="flex items-center gap-3">
            {!isNavExpanded && (
              <button 
                onClick={toggleNav}
                className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200/50 dark:hover:bg-gray-800/50 rounded-xl transition-all" 
                title="Toggle Nav"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}
            {viewingArchive ? (
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setViewingArchive(false)}
                  className="p-1 -ml-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">Archived Chats</h1>
              </div>
            ) : (
              <h1 className="text-xl font-bold text-gray-900 dark:text-white capitalize">{activeTab}</h1>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setIsNewChatModalOpen(true)}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <Edit className="w-4 h-4" />
            </button>
            <div className="relative">
              <button 
                onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                className={`p-2 rounded-lg transition-colors ${isMoreMenuOpen ? 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>

              {isMoreMenuOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40"
                    onClick={() => { setIsMoreMenuOpen(false); setIsNotifSubMenuOpen(false); }}
                  />
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-100">
                    <button 
                      onClick={() => { setIsMoreMenuOpen(false); setIsNotifSubMenuOpen(false); setViewingArchive(true); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <Archive className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                      <span className="text-[14px] text-gray-900 dark:text-gray-100">View Archive</span>
                    </button>
                    <button 
                      onClick={() => { setIsMoreMenuOpen(false); setIsNotifSubMenuOpen(false); }}
                      className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                    >
                      <FolderPlus className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                      <span className="text-[14px] text-gray-900 dark:text-gray-100">Add chat folder</span>
                    </button>
                    <div className="relative">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setIsNotifSubMenuOpen(!isNotifSubMenuOpen); }}
                        className={`w-full px-4 py-2.5 flex items-center justify-between transition-colors text-left ${isNotifSubMenuOpen ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                      >
                        <div className="flex items-center gap-3">
                          <Moon className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                          <span className="text-[14px] text-gray-900 dark:text-gray-100">Notification profile</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </button>
                      
                      {isNotifSubMenuOpen && (
                        <div className="absolute left-full top-0 ml-1 w-56 bg-white dark:bg-[#2C2C2E] rounded-xl shadow-xl border border-gray-100 dark:border-gray-700 py-1.5 z-50 animate-in fade-in slide-in-from-left-2 duration-100">
                          <div className="px-4 py-2 mb-1">
                            <span className="text-[14px] font-semibold text-gray-900 dark:text-gray-100">Notification Profile</span>
                          </div>
                          <button 
                            onClick={() => { 
                              setIsMoreMenuOpen(false); 
                              setIsNotifSubMenuOpen(false); 
                              setIsProfileModalOpen(true);
                            }}
                            className="w-full px-4 py-2.5 flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left"
                          >
                            <SettingsIcon className="w-[18px] h-[18px] text-gray-500 dark:text-gray-400" />
                            <span className="text-[14px] text-gray-900 dark:text-gray-100">Settings</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {activeTab === 'chats' && (
          <>
            {/* Search Bar */}
            <div className="px-3 pb-2 bg-white dark:bg-[#1E1E1E] transition-colors flex items-center gap-2">
              <div className="relative flex-1 flex items-center bg-gray-100 dark:bg-[#2C2C2E] rounded-lg">
                <div className="pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder={filterUnread ? "Search unread chats" : "Search"}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full pl-2 pr-3 py-1.5 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none sm:text-sm transition-colors"
                />
              </div>
              <button 
                onClick={() => setFilterUnread(!filterUnread)}
                className={`flex items-center justify-center w-7 h-7 rounded-full transition-colors flex-shrink-0 focus:outline-none shadow-sm ${filterUnread ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'}`}
              >
                <Filter className={`w-3.5 h-3.5 ${filterUnread ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`} />
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
              searchQuery={searchQuery}
              filterUnread={filterUnread}
              showArchived={viewingArchive}
              onClearFilter={() => {
                setFilterUnread(false);
                setSearchQuery('');
              }}
            />
          </>
        )}

        {activeTab === 'calls' && (
          <div className="flex-1 flex flex-col bg-white dark:bg-[#1E1E1E]">
            <div className="px-4 py-3 mt-1 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-4">
               <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
                 <Link className="w-5 h-5" />
               </div>
               <span className="text-[15px] font-medium text-gray-900 dark:text-gray-100">Create a Call Link</span>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center -mt-20">
               <div className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">No calls</div>
               <div className="text-[13px] text-gray-500">Recent calls will appear here.</div>
            </div>
          </div>
        )}

        {activeTab === 'stories' && (
          <div className="flex-1 flex flex-col bg-white dark:bg-[#1E1E1E]">
            <div className="px-3 pb-3 pt-2 bg-white dark:bg-[#1E1E1E]">
              <div className="relative flex items-center bg-gray-100 dark:bg-[#2C2C2E] rounded-lg">
                <div className="pl-3 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Search"
                  className="block w-full pl-2 pr-2 py-1.5 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 focus:outline-none sm:text-sm"
                />
              </div>
            </div>
            <div className="px-3 py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center gap-3">
               <div className="relative w-12 h-12 rounded-full bg-[#E8F0FE] dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-medium">
                 {user?.display_name?.charAt(0).toUpperCase() || 'M'}
                 <div className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full bg-blue-600 border-2 border-white dark:border-[#1E1E1E] flex items-center justify-center">
                   <Plus className="w-3 h-3 text-white" />
                 </div>
               </div>
               <div className="flex flex-col">
                 <span className="text-[15px] font-semibold text-gray-900 dark:text-gray-100">My Story</span>
                 <span className="text-[13px] text-gray-500">Add a story</span>
               </div>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center -mt-20">
               <div className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 mb-1">No stories</div>
               <div className="text-[13px] text-gray-500">New updates will appear here.</div>
            </div>
          </div>
        )}
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
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-950">
            <Phone className="h-8 w-8 text-gray-400 mb-4" strokeWidth={1.5} />
            <p className="text-gray-400 text-[13px] flex items-center">Click <Phone className="w-3.5 h-3.5 inline mx-1.5" strokeWidth={2} /> to start a new voice or video call.</p>
          </div>
        ) : activeTab === 'stories' ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[#f0f2f5] dark:bg-gray-950">
            <Copy className="h-8 w-8 text-gray-400 mb-4" strokeWidth={1.5} />
            <p className="text-gray-400 text-[13px] flex items-center">Click <Plus className="w-4 h-4 inline mx-1 text-gray-400" strokeWidth={2} /> to add an update.</p>
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
