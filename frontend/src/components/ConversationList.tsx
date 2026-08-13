import React from 'react';
import { Conversation } from '@/app/conversations/page';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading?: boolean;
  currentUserId?: number;
  searchQuery?: string;
  filterUnread?: boolean;
  onClearFilter?: () => void;
  showArchived?: boolean;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  currentUserId,
  searchQuery = '',
  filterUnread = false,
  onClearFilter,
  showArchived = false,
}: ConversationListProps) {
  if (loading && conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const filteredConversations = conversations.filter(conv => {
    if (filterUnread && conv.unread_count === 0) return false;
    if (searchQuery) {
      const name = conv.type === 'group' ? conv.name : conv.participants.find(p => p.id !== currentUserId)?.display_name;
      if (name && !name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    }
    return true;
  });

  if (filteredConversations.length === 0) {
    if (filterUnread) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center mt-10">
          <h3 className="text-gray-900 dark:text-gray-100 font-semibold mb-6">Filtered by unread</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 text-sm">No unread chats</p>
          <button 
            onClick={onClearFilter} 
            className="text-gray-900 dark:text-gray-100 font-semibold hover:underline text-sm"
          >
            Clear filter
          </button>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-gray-400">
        <p>No conversations found.</p>
      </div>
    );
  }

  const getConversationName = (conv: Conversation) => {
    if (conv.type === 'group' && conv.name) return conv.name;
    const otherParticipant = conv.participants.find(p => p.id !== currentUserId);
    return otherParticipant ? otherParticipant.display_name : 'Unknown';
  };

  const getConversationAvatar = (conv: Conversation) => {
    if (conv.type === 'group') {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-lg shadow-sm">
          {conv.name?.charAt(0).toUpperCase() || 'G'}
        </div>
      );
    }
    const otherParticipant = conv.participants.find(p => p.id !== currentUserId);
    const initial = otherParticipant ? otherParticipant.display_name.charAt(0).toUpperCase() : '?';
    
    if (otherParticipant?.avatar_url) {
      return <img src={otherParticipant.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover shadow-sm" />;
    }
    
    return (
      <div className="w-10 h-10 rounded-full bg-[#E8F0FE] dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold text-lg shadow-sm">
        {initial}
      </div>
    );
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const visibleConversations = filteredConversations
    .filter(c => showArchived ? c.settings?.is_archived : !c.settings?.is_archived)
    .sort((a, b) => {
      const aPinned = a.settings?.is_pinned ? 1 : 0;
      const bPinned = b.settings?.is_pinned ? 1 : 0;
      if (aPinned !== bPinned) {
        return bPinned - aPinned;
      }
      return 0; // maintain default updated_at sort from backend
    });

  if (visibleConversations.length === 0 && conversations.length > 0) {
    if (showArchived) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-gray-400">
          <p>No archived conversations.</p>
        </div>
      );
    }
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-gray-400">
        <p>All conversations are archived.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {visibleConversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`flex items-center p-2.5 mx-1.5 my-0.5 cursor-pointer transition-colors duration-150 rounded-lg ${
            selectedId === conv.id 
              ? 'bg-[#E3EAF2] dark:bg-[#2A3441]' 
              : 'hover:bg-[#F3F4F6] dark:hover:bg-[#2A2A2A]/60'
          }`}
        >
          <div className="relative mr-3">
            {getConversationAvatar(conv)}
            {/* Status dot for direct messages */}
            {conv.type === 'direct' && (
              <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-[#1E1E1E] ${
                conv.participants.find(p => p.id !== currentUserId)?.status === 'online' ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
              }`}></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-0.5">
              <h3 className="text-[14px] font-semibold text-gray-900 dark:text-gray-100 truncate">
                {getConversationName(conv)}
              </h3>
              <div className="flex items-center gap-1 ml-2">
                {conv.settings?.is_pinned && (
                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                  </svg>
                )}
                {conv.settings?.muted_until && new Date(conv.settings.muted_until) > new Date() && (
                  <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                )}
                <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap ml-1">
                  {formatTime(conv.last_message_timestamp)}
                </span>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <p className={`text-[13px] truncate ${conv.unread_count > 0 ? 'text-gray-900 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {conv.last_message_preview || 'No messages yet'}
              </p>
              {conv.unread_count > 0 && (
                <span className="ml-2 bg-blue-500 dark:bg-blue-600 text-white text-[10px] font-bold px-1.5 py-[1px] rounded-full min-w-[18px] text-center">
                  {conv.unread_count}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
