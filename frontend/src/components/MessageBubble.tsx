'use client';
import React, { useState, useCallback } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import AttachmentView from './AttachmentView';
import ReactionPicker from './ReactionPicker';

interface Attachment {
  id: number;
  file_name: string;
  file_path: string;
  mime_type: string;
  file_size: number;
}

interface Reaction {
  id: number;
  emoji: string;
  user_id: number;
}

interface MessageReceipt {
  user_id: number;
  status: string;
}

interface ReplyPreview {
  id: number;
  content: string;
  sender_display_name?: string;
  message_type: string;
}

interface Message {
  id: number;
  conversation_id?: number;
  content: string;
  sender_id: number;
  sender_display_name?: string;
  sender_avatar_url?: string;
  created_at: string;
  status: string;
  message_type?: string;
  reply_to_id?: number | null;
  reply_to?: ReplyPreview | null;
  attachments?: Attachment[];
  reactions?: Reaction[];
  receipts?: MessageReceipt[];
}

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  senderName?: string;
  currentUserId?: number;
  conversationId?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReact?: (messageId: number, emoji: string) => void;
  onRemoveReact?: (messageId: number, emoji: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onReply?: (message: any) => void;
}

export default function MessageBubble({
  message,
  isCurrentUser,
  showAvatar,
  avatarUrl,
  senderName,
  currentUserId,
  onReact,
  onRemoveReact,
  onReply,
}: MessageBubbleProps) {
  const [showActions, setShowActions] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const userReactions = (message.reactions || [])
    .filter((r) => r.user_id === currentUserId)
    .map((r) => r.emoji);

  // Group reactions by emoji for display
  const reactionGroups: Record<string, { count: number; mine: boolean }> = {};
  for (const r of message.reactions || []) {
    if (!reactionGroups[r.emoji]) {
      reactionGroups[r.emoji] = { count: 0, mine: false };
    }
    reactionGroups[r.emoji].count++;
    if (r.user_id === currentUserId) {
      reactionGroups[r.emoji].mine = true;
    }
  }

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (userReactions.includes(emoji)) {
        onRemoveReact?.(message.id, emoji);
      } else {
        onReact?.(message.id, emoji);
      }
    },
    [userReactions, message.id, onReact, onRemoveReact]
  );

  const hasText = message.content && message.content.trim().length > 0;
  const hasAttachments = (message.attachments || []).length > 0;
  const hasReactions = Object.keys(reactionGroups).length > 0;

  let aggregateStatus = 'sent';
  if (isCurrentUser) {
    if (message.status === 'read') {
      aggregateStatus = 'read';
    } else if (message.receipts && message.receipts.length > 0) {
      const anyRead = message.receipts.some(r => r.status.toLowerCase() === 'read');
      const anyDelivered = message.receipts.some(r => r.status.toLowerCase() === 'delivered');
      
      if (anyRead) aggregateStatus = 'read';
      else if (anyDelivered) aggregateStatus = 'delivered';
    } else {
      aggregateStatus = message.status;
    }
  }

  return (
    <div
      className={`flex w-full mb-1 group ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowReactionPicker(false); }}
    >
      {/* Other user avatar */}
      {!isCurrentUser && showAvatar && (
        <div className="mr-2 flex-shrink-0 flex items-end">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatarUrl} alt="avatar" className="w-7 h-7 rounded-full shadow-sm" />
          ) : (
            <div className="w-7 h-7 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 text-xs font-bold shadow-sm">
              {senderName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
      )}

      {!isCurrentUser && !showAvatar && <div className="w-9" />}

      <div className={`max-w-[72%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {/* Sender name in group chats */}
        {!isCurrentUser && showAvatar && (
          <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-1 mb-0.5 font-medium">
            {senderName}
          </span>
        )}

        {/* Wrapper for bubble and actions to ensure proper vertical alignment */}
        <div className="relative">
          {/* Hover actions (Reply + React) */}
          {showActions && (
            <div
              className={`absolute top-0 flex items-center gap-1 z-20 ${
                isCurrentUser ? 'right-full mr-2' : 'left-full ml-2'
              }`}
            >
              <button
                onClick={() => onReply?.(message)}
                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Reply"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                </svg>
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowReactionPicker((p) => !p)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                  title="React"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {showReactionPicker && (
                  <ReactionPicker
                    onSelect={handleEmojiSelect}
                    onClose={() => setShowReactionPicker(false)}
                    userReactions={userReactions}
                  />
                )}
              </div>
            </div>
          )}

          {/* Bubble */}
          <div
            className={`relative px-3 py-1.5 shadow-sm ${
              isCurrentUser
                ? 'bg-blue-600 text-white rounded-xl rounded-br-[4px]'
                : 'bg-white dark:bg-[#2C2C2E] text-gray-900 dark:text-gray-100 rounded-xl rounded-bl-[4px]'
            }`}
          >
            {/* Reply preview */}
            {message.reply_to && (
              <div
                className={`mb-1.5 px-2 py-1.5 rounded-lg text-xs border-l-2 ${
                  isCurrentUser
                    ? 'border-white/50 bg-white/10'
                    : 'border-blue-500 bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <div className={`font-semibold mb-0.5 ${isCurrentUser ? 'text-white/80' : 'text-blue-600 dark:text-blue-400'}`}>
                  {message.reply_to.sender_display_name || 'Unknown'}
                </div>
                <div className={`truncate ${isCurrentUser ? 'text-white/70' : 'text-gray-600 dark:text-gray-400'}`}>
                  {message.reply_to.message_type !== 'text' ? `📎 ${message.reply_to.content || 'Attachment'}` : (message.reply_to.content || '—')}
                </div>
              </div>
            )}

            {/* Text content */}
            {hasText && (
              <p className="text-[14px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
            )}

            {/* Attachments */}
            {hasAttachments && (
              <div className={hasText ? 'mt-1' : ''}>
                {(message.attachments || []).map((att) => (
                  <AttachmentView key={att.id} attachment={att} />
                ))}
              </div>
            )}

            {/* Timestamp + status */}
            <div className={`flex items-center justify-end gap-1 mt-1 ${isCurrentUser ? 'text-blue-200' : 'text-gray-400'}`}>
              <span className="text-[10px] font-medium">{formatTime(message.created_at)}</span>
              {isCurrentUser && (
                <span className="ml-0.5">
                  {aggregateStatus === 'read' ? (
                    <svg className="w-4 h-4 text-[#38bdf8]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L7 17l-5-5" />
                      <path d="M22 10l-7.5 7.5L13 16" />
                    </svg>
                  ) : aggregateStatus === 'delivered' ? (
                    <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L7 17l-5-5" />
                      <path d="M22 10l-7.5 7.5L13 16" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-gray-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6L7 17l-5-5" />
                    </svg>
                  )}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reaction bar */}
        {hasReactions && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {Object.entries(reactionGroups).map(([emoji, { count, mine }]) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs border transition-colors ${
                  mine
                    ? 'bg-blue-100 dark:bg-blue-900/40 border-blue-400 dark:border-blue-500 text-blue-700 dark:text-blue-300'
                    : 'bg-white dark:bg-[#2C2C2E] border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300'
                }`}
              >
                <span>{emoji}</span>
                {count > 1 && <span className="font-medium">{count}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
