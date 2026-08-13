import React from 'react';
import { User, Settings, UserCheck, Phone, Users, X } from 'lucide-react';
import { Conversation } from '@/app/conversations/page';

interface ProfileInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserId?: number;
}

export default function ProfileInfoModal({ isOpen, onClose, conversation, currentUserId }: ProfileInfoModalProps) {
  if (!isOpen) return null;

  // Find the other participant in a 1:1 chat
  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  const displayName = otherParticipant?.display_name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-[#2C2C2C] rounded-2xl shadow-xl w-full max-w-[360px] p-6 pt-10">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          {/* Large Avatar */}
          <div className="w-28 h-28 rounded-full bg-[#E8F0FE] dark:bg-blue-900/30 flex items-center justify-center mb-6">
            {otherParticipant?.avatar_url ? (
              <img src={otherParticipant.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-[48px] text-blue-600 dark:text-blue-400 font-medium">
                {initial}
              </span>
            )}
          </div>

          <div className="w-full text-left">
            <h3 className="text-[15px] font-medium text-gray-900 dark:text-white mb-3">About</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                <User className="w-5 h-5 text-gray-500" />
                <span className="text-[14px]">{displayName}</span>
              </div>
              
              <div className="flex items-center justify-between text-gray-700 dark:text-gray-300 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 -mx-2 px-2 py-1 rounded">
                <div className="flex items-center gap-4">
                  <Settings className="w-5 h-5 text-gray-500" />
                  <span className="text-[14px]">Signal Connection</span>
                </div>
                <span className="text-gray-400 text-sm">{'>'}</span>
              </div>

              <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                <UserCheck className="w-5 h-5 text-gray-500" />
                <span className="text-[14px]">{displayName} is in your system contacts</span>
              </div>

              <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                <Phone className="w-5 h-5 text-gray-500" />
                {/* Random placeholder number to match screenshot style, as we don't have this in the model yet */}
                <span className="text-[14px]">063787 71702</span>
              </div>

              <div className="flex items-center gap-4 text-gray-700 dark:text-gray-300">
                <Users className="w-5 h-5 text-gray-500" />
                <span className="text-[14px]">No groups in common</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
