import React from 'react';
import { Conversation } from '@/app/conversations/page';

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  loading: boolean;
  currentUserId?: number;
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  loading,
  currentUserId,
}: ConversationListProps) {
  if (loading && conversations.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500 dark:text-gray-400">
        <p>No conversations yet.</p>
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
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
          {conv.name?.charAt(0).toUpperCase() || 'G'}
        </div>
      );
    }
    const otherParticipant = conv.participants.find(p => p.id !== currentUserId);
    const initial = otherParticipant ? otherParticipant.display_name.charAt(0).toUpperCase() : '?';
    
    if (otherParticipant?.avatar_url) {
      return <img src={otherParticipant.avatar_url} alt="avatar" className="w-12 h-12 rounded-full object-cover shadow-sm" />;
    }
    
    return (
      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shadow-sm">
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

  return (
    <div className="flex-1 overflow-y-auto">
      {conversations.map((conv) => (
        <div
          key={conv.id}
          onClick={() => onSelect(conv.id)}
          className={`flex items-center p-4 cursor-pointer transition-all duration-200 border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${
            selectedId === conv.id ? 'bg-indigo-50/80 dark:bg-indigo-900/30 border-l-4 border-l-indigo-600 dark:border-l-indigo-400' : 'hover:bg-gray-100/80 dark:hover:bg-gray-800/50 border-l-4 border-l-transparent'
          }`}
        >
          <div className="relative mr-4">
            {getConversationAvatar(conv)}
            {/* Status dot for direct messages */}
            {conv.type === 'direct' && (
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${
                conv.participants.find(p => p.id !== currentUserId)?.status === 'online' ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-600'
              }`}></div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="text-[15px] font-semibold text-gray-900 dark:text-white truncate">
                {getConversationName(conv)}
              </h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 font-medium whitespace-nowrap ml-2">
                {formatTime(conv.last_message_timestamp)}
              </span>
            </div>
            
            <div className="flex justify-between items-center">
              <p className={`text-sm truncate ${conv.unread_count > 0 ? 'text-gray-900 dark:text-gray-200 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {conv.last_message_preview || 'No messages yet'}
              </p>
              {conv.unread_count > 0 && (
                <span className="ml-2 bg-indigo-600 dark:bg-indigo-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
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
