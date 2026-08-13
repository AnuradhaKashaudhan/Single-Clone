import React from 'react';
import { 
  ChevronLeft, Video, Phone, BellOff, Search, 
  TimerOff, Edit2, Palette, ShieldCheck, 
  Plus, Ban, AlertOctagon 
} from 'lucide-react';
import { Conversation } from '@/app/conversations/page';

interface ChatSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserId?: number;
}

export default function ChatSettingsPanel({ isOpen, onClose, conversation, currentUserId }: ChatSettingsPanelProps) {
  if (!isOpen) return null;

  const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
  const displayName = otherParticipant?.display_name || 'User';
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="absolute inset-0 z-30 bg-white dark:bg-[#1E1E1E] flex flex-col overflow-y-auto overflow-x-hidden animate-in slide-in-from-right-8 duration-200">
      
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-[#1E1E1E] z-10 p-4 pb-2">
        <button 
          onClick={onClose}
          className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors inline-flex"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center -mt-8">
          <div className="w-16 h-16 rounded-full bg-[#E8F0FE] dark:bg-blue-900/30 flex items-center justify-center mb-3">
            {otherParticipant?.avatar_url ? (
              <img src={otherParticipant.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" />
            ) : (
              <span className="text-2xl text-blue-600 dark:text-blue-400 font-medium">
                {initial}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1 rounded-full transition-colors">
            <span className="text-[17px] font-medium text-gray-900 dark:text-white">
              {displayName}
            </span>
            <span className="text-gray-500 text-sm">{'>'}</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-8 pb-10 max-w-2xl mx-auto w-full">
        
        {/* Action Buttons */}
        <div className="flex justify-center gap-2 mb-10 mt-6">
          <ActionButton icon={<Video className="w-5 h-5" />} label="Video" />
          <ActionButton icon={<Phone className="w-5 h-5" />} label="Audio" />
          <ActionButton icon={<BellOff className="w-5 h-5" />} label="Mute" />
          <ActionButton icon={<Search className="w-5 h-5" />} label="Search" />
        </div>

        {/* Settings List */}
        <div className="space-y-0 text-gray-900 dark:text-gray-100">
          
          <div className="flex items-start gap-4 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors">
            <TimerOff className="w-5 h-5 text-gray-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-[14px] font-medium mb-1">Disappearing messages</div>
              <div className="text-[12px] text-gray-500 leading-snug pr-8">
                When enabled, messages sent and received in this 1:1 chat will disappear after they've been seen.
              </div>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded text-sm text-gray-600 dark:text-gray-300">
              Off <span className="text-[10px] ml-1">▼</span>
            </div>
          </div>

          <div className="flex items-center gap-4 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors">
            <Edit2 className="w-5 h-5 text-gray-500 shrink-0" />
            <div className="text-[14px] font-medium">Nickname</div>
          </div>

          <div className="flex items-center gap-4 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors bg-blue-50/50 dark:bg-blue-900/10">
            <Palette className="w-5 h-5 text-gray-500 shrink-0" />
            <div className="text-[14px] font-medium flex-1">Chat color</div>
            <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
          </div>

          <div className="flex items-center gap-4 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors border-b border-gray-100 dark:border-gray-800">
            <ShieldCheck className="w-5 h-5 text-gray-500 shrink-0" />
            <div className="text-[14px] font-medium mb-4">View Safety Number</div>
          </div>

          <div className="pt-6 pb-2">
            <div className="text-[13px] font-semibold text-gray-900 dark:text-white mb-4">No groups in common</div>
            
            <div className="flex items-center gap-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 -mx-2 transition-colors">
              <Plus className="w-5 h-5 text-gray-500 shrink-0" />
              <div className="text-[14px] text-gray-700 dark:text-gray-300">Add to a group</div>
            </div>

            <div className="flex items-center gap-4 py-3 mt-4 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg px-2 -mx-2 transition-colors">
              <Ban className="w-5 h-5 text-red-500 shrink-0" />
              <div className="text-[14px] text-red-500">Block</div>
            </div>

            <div className="flex items-center gap-4 py-3 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg px-2 -mx-2 transition-colors">
              <AlertOctagon className="w-5 h-5 text-red-500 shrink-0" />
              <div className="text-[14px] text-red-500">Report spam</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex flex-col items-center justify-center w-16 h-14 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-colors">
      <div className="text-gray-700 dark:text-gray-300 mb-1">{icon}</div>
      <span className="text-[11px] font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </button>
  );
}
