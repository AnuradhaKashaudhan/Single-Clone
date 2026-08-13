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
      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-lg shadow-sm">
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
          className={`flex items-center p-2.5 mx-1.5 my-0.5 cursor-pointer transition-colors duration-150 rounded-lg ${
            selectedId === conv.id 
              ? 'bg-[#E5E7EB] dark:bg-[#2A2A2A]' 
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
              <span className="text-[11px] text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap ml-2">
                {formatTime(conv.last_message_timestamp)}
              </span>
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
