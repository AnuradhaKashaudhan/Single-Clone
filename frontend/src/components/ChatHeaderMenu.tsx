'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Conversation } from '@/app/conversations/page';
import apiClient from '@/lib/api';
import toast from 'react-hot-toast';

interface ChatHeaderMenuProps {
  conversation: Conversation;
  currentUserId?: number;
  onShowGroupInfo: () => void;
  onOpenSettings: () => void;
}

export default function ChatHeaderMenu({ conversation, currentUserId, onShowGroupInfo, onOpenSettings }: ChatHeaderMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Determine if it's a direct chat or group
  const isGroup = conversation.type === 'group';

  // Find the other user if direct
  const otherUser = !isGroup 
    ? conversation.participants.find(p => p.id !== currentUserId)
    : null;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [open]);

  const toggleOpen = () => setOpen(!open);

  const handleAction = async (action: string) => {
    setOpen(false);
    try {
      switch (action) {
        case 'group_info':
          onShowGroupInfo();
          break;
        case 'mark_unread':
          await apiClient.markMessagesUnread(conversation.id);
          toast.success('Marked as unread');
          break;
        case 'pin':
        case 'unpin': {
          const isPinned = !conversation.settings?.is_pinned;
          await apiClient.updateConversationSettings(conversation.id, { is_pinned: isPinned });
          toast.success(isPinned ? 'Conversation pinned' : 'Conversation unpinned');
          break;
        }
        case 'archive':
        case 'unarchive': {
          const isArchived = !conversation.settings?.is_archived;
          await apiClient.updateConversationSettings(conversation.id, { is_archived: isArchived });
          toast.success(isArchived ? 'Conversation archived' : 'Conversation unarchived');
          break;
        }
        case 'mute': {
          const isMuted = !!conversation.settings?.muted_until;
          // Mute for 8 hours or unmute
          const mutedUntil = isMuted 
            ? null 
            : new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
          await apiClient.updateConversationSettings(conversation.id, { muted_until: mutedUntil });
          toast.success(isMuted ? 'Notifications unmuted' : 'Muted for 8 hours');
          break;
        }
        case 'clear_history':
          if (confirm('Are you sure you want to clear chat history for yourself?')) {
            await apiClient.clearChatHistory(conversation.id);
            toast.success('Chat history cleared');
            // Hard reload for now, or rely on WebSocket/state reload
            window.location.reload();
          }
          break;
        case 'delete_chat':
          if (confirm('Are you sure you want to delete this conversation?')) {
            await apiClient.deleteConversation(conversation.id);
            toast.success('Conversation deleted');
          }
          break;
        case 'block':
        case 'unblock':
          if (otherUser) {
            // We need a way to check block status. For now we just call block.
            // A more robust implementation would track blocked users in state.
            // Let's assume we just call block or unblock.
            if (confirm(`Are you sure you want to ${action} ${otherUser.display_name}?`)) {
              if (action === 'block') {
                await apiClient.blockUser(otherUser.id);
                toast.success('User blocked');
              } else {
                await apiClient.unblockUser(otherUser.id);
                toast.success('User unblocked');
              }
            }
          }
          break;
        case 'chat_settings':
          onOpenSettings();
          break;
      }
    } catch (e: any) {
      console.error(e);
      toast.error('Failed to perform action');
    }
  };

  const MenuItem = ({ label, onClick, className = '', rightIcon }: { label: string, onClick?: () => void, className?: string, rightIcon?: React.ReactNode }) => (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-1.5 text-[13px] hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors ${className}`}
    >
      <span>{label}</span>
      {rightIcon && <span className="text-gray-400">{rightIcon}</span>}
    </button>
  );

  const isPinned = conversation.settings?.is_pinned;
  const isArchived = conversation.settings?.is_archived;
  const isMuted = !!conversation.settings?.muted_until;
  const [showMuteSubmenu, setShowMuteSubmenu] = useState(false);
  const [showDisappearingSubmenu, setShowDisappearingSubmenu] = useState(false);

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={toggleOpen}
        className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors focus:outline-none"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1.5 text-gray-800 dark:text-gray-200">
          <div 
            className="relative"
            onMouseEnter={() => setShowDisappearingSubmenu(true)}
            onMouseLeave={() => setShowDisappearingSubmenu(false)}
          >
            <MenuItem 
              label="Disappearing messages" 
              rightIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>} 
            />
            
            {showDisappearingSubmenu && (
              <div className="absolute top-0 right-full mr-1 w-48 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1.5 z-50">
                <MenuItem label="✓ Off" />
                <MenuItem label="4 weeks" />
                <MenuItem label="1 week" />
                <MenuItem label="1 day" />
                <MenuItem label="8 hours" />
                <MenuItem label="1 hour" />
                <MenuItem label="5 minutes" />
                <MenuItem label="30 seconds" />
                <MenuItem label="Custom time..." />
              </div>
            )}
          </div>
          
          <div 
            className="relative"
            onMouseEnter={() => setShowMuteSubmenu(true)}
            onMouseLeave={() => setShowMuteSubmenu(false)}
          >
            <MenuItem 
              label={isMuted ? "Unmute notifications" : "Mute notifications"} 
              onClick={isMuted ? () => handleAction('mute') : undefined}
              rightIcon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>} 
            />
            
            {showMuteSubmenu && !isMuted && (
              <div className="absolute top-0 right-full mr-1 w-48 bg-white dark:bg-[#2C2C2C] border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1.5 z-50">
                <MenuItem label="Mute for one hour" onClick={() => handleAction('mute')} />
                <MenuItem label="Mute for eight hours" onClick={() => handleAction('mute')} />
                <MenuItem label="Mute for one day" onClick={() => handleAction('mute')} />
                <MenuItem label="Mute for one week" onClick={() => handleAction('mute')} />
                <MenuItem label="Mute always" onClick={() => handleAction('mute')} />
              </div>
            )}
          </div>
          
          <MenuItem label="Chat settings" onClick={() => handleAction('chat_settings')} />
          <MenuItem label="All media" />
          
          <div className="border-t border-gray-100 dark:border-gray-700/50 my-1.5"></div>
          
          <MenuItem label="Select messages" />
          <MenuItem label="Mark as unread" onClick={() => handleAction('mark_unread')} />
          <MenuItem label={isPinned ? "Unpin chat" : "Pin chat"} onClick={() => handleAction(isPinned ? 'unpin' : 'pin')} />
          <MenuItem label={isArchived ? "Unarchive" : "Archive"} onClick={() => handleAction(isArchived ? 'unarchive' : 'archive')} />
          <MenuItem label="Block" onClick={() => handleAction('block')} />
          <MenuItem label="Delete" onClick={() => handleAction('delete_chat')} />
        </div>
      )}
    </div>
  );
}
