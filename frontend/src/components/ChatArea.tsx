'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import apiClient from '@/lib/api';
import MessageBubble from '@/components/MessageBubble';
import TypingIndicator from '@/components/TypingIndicator';
import GroupInfoModal from '@/components/GroupInfoModal';
import { Conversation } from '@/app/conversations/page';
import { wsManager } from '@/lib/websocket';
import { toast } from 'react-hot-toast';
import ChatHeaderMenu from '@/components/ChatHeaderMenu';
import ProfileInfoModal from '@/components/ProfileInfoModal';
import ChatSettingsPanel from '@/components/ChatSettingsPanel';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://single-clone-cwty.onrender.com';

// ── Types ────────────────────────────────────────────────────────────────────

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

interface ReplyPreview {
  id: number;
  content: string;
  sender_display_name?: string;
  message_type: string;
}

interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  sender_display_name?: string;
  sender_avatar_url?: string;
  content: string;
  status: string;
  message_type?: string;
  reply_to_id?: number | null;
  reply_to?: ReplyPreview | null;
  created_at: string;
  attachments?: Attachment[];
  reactions?: Reaction[];
}

// ── Props ────────────────────────────────────────────────────────────────────

interface ChatAreaProps {
  conversation: Conversation;
  currentUserId?: number;
  onMessageSent: () => void;
  onBack?: () => void;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function ChatArea({ conversation, currentUserId, onMessageSent, onBack }: ChatAreaProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [showProfileInfo, setShowProfileInfo] = useState(false);
  const [showChatSettings, setShowChatSettings] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());

  // Reply state
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // Attachment state
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Fetch & mark read ──────────────────────────────────────────────────────

  const fetchMessages = useCallback(async () => {
    try {
      const data = await apiClient.getMessages(conversation.id) as Message[];
      setMessages(data);
      markUnreadAsRead(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id]);

  const markUnreadAsRead = useCallback(async (msgs: Message[]) => {
    if (!currentUserId) return;
    const unreadIds = msgs
      .filter((m) => m.sender_id !== currentUserId)
      .map((m) => {
        const receipts = (m as unknown as { receipts?: { user_id: number; status: string }[] }).receipts;
        const myReceipt = receipts?.find((r) => r.user_id === currentUserId);
        if (!myReceipt || myReceipt.status !== 'read') return m.id;
        return null;
      })
      .filter(Boolean) as number[];

    if (unreadIds.length > 0) {
      try {
        await apiClient.markMessagesAsRead(conversation.id, unreadIds);
      } catch (err) {
        console.error('Failed to mark messages as read', err);
      }
    }
  }, [conversation.id, currentUserId]);

  // ── WebSocket handler ──────────────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    setReplyTo(null);
    setAttachmentFile(null);
    setAttachmentPreviewUrl(null);
    fetchMessages();

    const unsubscribe = wsManager.subscribe((msg: Record<string, unknown>) => {
      const convId = (msg.conversation_id as number | undefined) || (msg.message as Record<string, unknown> | undefined)?.conversation_id;

      if (convId !== conversation.id) return;

      if (msg.type === 'message') {
        const newMsg = msg.message as Message;
        setMessages((prev) => {
          if (prev.find((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        if (newMsg.sender_id !== currentUserId) {
          apiClient.markMessagesAsRead(conversation.id, [newMsg.id]).catch(console.error);
        }
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.delete(newMsg.sender_id);
          return next;
        });
      }

      if (msg.type === 'typing' && msg.user_id !== currentUserId) {
        const uid = msg.user_id as number;
        const name = msg.display_name as string;
        setTypingUsers((prev) => {
          const next = new Map(prev);
          next.set(uid, name);
          return next;
        });
        if (typingTimeoutRefs.current.has(uid)) clearTimeout(typingTimeoutRefs.current.get(uid)!);
        const t = setTimeout(() => {
          setTypingUsers((prev) => { const n = new Map(prev); n.delete(uid); return n; });
        }, 3000);
        typingTimeoutRefs.current.set(uid, t);
      }

      if (msg.type === 'delivery_receipt' || msg.type === 'read_receipt') {
        // Lightweight local update for read receipts
        if (msg.type === 'read_receipt') {
          const ids = msg.message_ids as number[];
          setMessages((prev) =>
            prev.map((m) => (ids.includes(m.id) && m.sender_id === currentUserId ? { ...m, status: 'read' } : m))
          );
        }
      }

      if (msg.type === 'reaction_added') {
        const msgId = msg.message_id as number;
        const reaction = { id: msg.reaction_id as number, emoji: msg.emoji as string, user_id: msg.user_id as number };
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msgId) return m;
            const reactions = m.reactions || [];
            if (reactions.find((r) => r.id === reaction.id)) return m;
            return { ...m, reactions: [...reactions, reaction] };
          })
        );
      }

      if (msg.type === 'reaction_removed') {
        const msgId = msg.message_id as number;
        const emoji = msg.emoji as string;
        const userId = msg.user_id as number;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msgId) return m;
            return {
              ...m,
              reactions: (m.reactions || []).filter((r) => !(r.emoji === emoji && r.user_id === userId)),
            };
          })
        );
      }

      if (msg.type === 'attachment_added') {
        const msgId = msg.message_id as number;
        const att = msg.attachment as Attachment;
        const msgType = msg.message_type as string;
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== msgId) return m;
            return {
              ...m,
              message_type: msgType,
              attachments: [...(m.attachments || []), att],
            };
          })
        );
      }
    });

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Clean up expired messages every second
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date().getTime();
      setMessages((prev) => {
        const filtered = prev.filter((m) => {
          if (!m.expires_at) return true;
          return new Date(m.expires_at).getTime() > now;
        });
        return filtered.length !== prev.length ? filtered : prev;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Handle Escape key to cancel reply or attachment
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setReplyTo(null);
        clearAttachment();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatDisappearingTimer = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds === 60) return '1 minute';
    if (seconds < 3600) return `${seconds / 60} minutes`;
    if (seconds === 3600) return '1 hour';
    if (seconds === 86400) return '24 hours';
    return `${seconds}s`;
  };

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasText = newMessage.trim().length > 0;
    const hasFile = attachmentFile !== null;
    if (!hasText && !hasFile) return;

    const content = newMessage.trim();
    setNewMessage('');
    const replyId = replyTo?.id ?? undefined;
    setReplyTo(null);

    try {
      // 1. Send message record (text or empty placeholder if file-only)
      const sentMsg = await apiClient.sendMessage(conversation.id, {
        content: content || ' ',  // backend requires non-empty; space is fine placeholder
        reply_to_id: replyId,
        message_type: hasFile ? 'file' : 'text',
      }) as Message;

      // Update local messages immediately
      setMessages((prev) => {
        if (prev.find((m) => m.id === sentMsg.id)) return prev;
        return [...prev, sentMsg];
      });

      // 2. Upload attachment if any
      if (hasFile && attachmentFile) {
        setUploading(true);
        try {
          await apiClient.uploadAttachment(conversation.id, sentMsg.id, attachmentFile);
        } catch (err) {
          toast.error('Failed to upload attachment');
          console.error(err);
        } finally {
          setUploading(false);
          setAttachmentFile(null);
          setAttachmentPreviewUrl(null);
        }
      }

      onMessageSent();
    } catch (error) {
      toast.error('Failed to send message');
      console.error('Failed to send message:', error);
    }
  };

  // ── Attachment handling ────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      toast.error('File too large. Maximum 20 MB.');
      return;
    }

    setAttachmentFile(file);
    if (file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file);
      setAttachmentPreviewUrl(url);
    } else {
      setAttachmentPreviewUrl(null);
    }
    // reset input so same file can be selected again
    e.target.value = '';
    textareaRef.current?.focus();
  };

  const clearAttachment = () => {
    setAttachmentFile(null);
    if (attachmentPreviewUrl) {
      URL.revokeObjectURL(attachmentPreviewUrl);
      setAttachmentPreviewUrl(null);
    }
  };

  // ── Reactions ──────────────────────────────────────────────────────────────

  const handleReact = useCallback(async (messageId: number, emoji: string) => {
    try {
      const reaction = await apiClient.addReaction(conversation.id, messageId, emoji) as Reaction;
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          const reactions = m.reactions || [];
          if (reactions.find((r) => r.id === reaction.id)) return m;
          return { ...m, reactions: [...reactions, reaction] };
        })
      );
    } catch (err) {
      toast.error('Failed to add reaction');
      console.error(err);
    }
  }, [conversation.id]);

  const handleRemoveReact = useCallback(async (messageId: number, emoji: string) => {
    try {
      await apiClient.removeReaction(conversation.id, messageId, emoji);
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== messageId) return m;
          return {
            ...m,
            reactions: (m.reactions || []).filter(
              (r) => !(r.emoji === emoji && r.user_id === currentUserId)
            ),
          };
        })
      );
    } catch (err) {
      toast.error('Failed to remove reaction');
      console.error(err);
    }
  }, [conversation.id, currentUserId]);

  // ── Conversation header ────────────────────────────────────────────────────

  const getConversationName = () => {
    if (conversation.type === 'group' && conversation.name) return conversation.name;
    const other = conversation.participants.find((p) => p.id !== currentUserId);
    return other ? other.display_name : 'Unknown';
  };

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return (
        <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold shadow-sm">
          {conversation.name?.charAt(0).toUpperCase() || 'G'}
        </div>
      );
    }
    const other = conversation.participants.find((p) => p.id !== currentUserId);
    if (other?.avatar_url) {
      return <img src={other.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover shadow-sm" />;
    }
    return (
      <div className="w-10 h-10 rounded-full bg-[#E8F0FE] dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-semibold shadow-sm">
        {other ? other.display_name.charAt(0).toUpperCase() : '?'}
      </div>
    );
  };

  const getStatusText = () => {
    if (conversation.type === 'group') return `${conversation.participants.length} participants`;
    const other = conversation.participants.find((p) => p.id !== currentUserId);
    return other?.status === 'online' ? 'Online' : 'Offline';
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] dark:bg-gray-950 relative">
      {/* Header */}
      <div className="h-14 px-4 bg-white dark:bg-[#1E1E1E] border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10 shadow-sm shrink-0 transition-colors">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={(e) => { e.stopPropagation(); onBack(); }}
              className="md:hidden mr-1 p-2 -ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <div
            className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-2 -ml-2 rounded-lg transition-colors"
            onClick={() => {
              if (conversation.type === 'group') {
                setShowGroupInfo(true);
              } else {
                setShowChatSettings(true);
              }
            }}
          >
            {getConversationAvatar()}
            <div>
              <h2 className="text-[16px] font-semibold text-gray-900 dark:text-white leading-tight flex items-center gap-2">
                {getConversationName()}
                {conversation.type === 'group' && (
                  <span className="text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full font-medium">Group</span>
                )}
                {conversation.type === 'direct' && (
                  <div className="text-gray-400 dark:text-gray-500 ml-1" title="In contacts">
                    <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                )}
              </h2>
              <p className={`text-xs ${getStatusText() === 'Online' ? 'text-green-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <button className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors focus:outline-none">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
          <ChatHeaderMenu
            conversation={conversation}
            currentUserId={currentUserId}
            onShowGroupInfo={() => setShowGroupInfo(true)}
            onOpenSettings={() => setShowChatSettings(true)}
          />
        </div>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-0.5 transition-colors"
        style={{
          background: 'var(--chat-bg, #efeae2)',
          backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")',
          backgroundSize: '150px',
        }}
      >
        {conversation.disappearing_messages_seconds ? (
          <div className="flex justify-center my-2">
            <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-gray-500 dark:text-gray-400 text-xs font-medium px-4 py-2 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700/50 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Disappearing messages are on: {formatDisappearingTimer(conversation.disappearing_messages_seconds)}
            </div>
          </div>
        ) : null}

        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center pt-16 pb-8">
            <div 
              className="w-20 h-20 rounded-full bg-[#E8F0FE] dark:bg-blue-900/30 flex items-center justify-center mb-3 cursor-pointer hover:opacity-90 transition-opacity"
              onClick={() => setShowProfileInfo(true)}
            >
              {conversation.type === 'group' ? (
                <span className="text-3xl text-blue-600 dark:text-blue-400 font-medium">G</span>
              ) : (
                <span className="text-3xl text-blue-600 dark:text-blue-400 font-medium">
                  {conversation.name?.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div 
              className="flex items-center gap-1 cursor-pointer hover:bg-gray-200/50 dark:hover:bg-gray-800/50 px-3 py-1 rounded-full transition-colors mb-2"
              onClick={() => setShowChatSettings(true)}
            >
              <span className="text-[17px] font-medium text-gray-900 dark:text-white">
                {conversation.name}
              </span>
              <span className="text-gray-500 text-sm">{'>'}</span>
            </div>
            
            <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400 text-sm mb-12">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              <span>No groups in common</span>
            </div>

            <div className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Today
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_id === currentUserId;
            const showAvatar =
              conversation.type === 'group' &&
              !isMe &&
              (index === messages.length - 1 || messages[index + 1]?.sender_id !== msg.sender_id);
            return (
              <MessageBubble
                key={msg.id}
                message={msg}
                isCurrentUser={isMe}
                showAvatar={showAvatar}
                avatarUrl={msg.sender_avatar_url}
                senderName={msg.sender_display_name}
                currentUserId={currentUserId}
                conversationId={conversation.id}
                onReact={handleReact}
                onRemoveReact={handleRemoveReact}
                onReply={(m) => setReplyTo(m)}
              />
            );
          })
        )}
        {Array.from(typingUsers.values()).map((name, idx) => (
          <TypingIndicator key={idx} name={name} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-[#1E1E1E] shrink-0 transition-colors z-20">
        {/* Reply strip */}
        {replyTo && (
          <div className="flex items-center gap-2 px-4 pt-2 pb-1 border-t border-gray-100 dark:border-gray-800">
            <div className="flex-1 min-w-0 border-l-2 border-blue-500 pl-2">
              <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 truncate">
                {replyTo.sender_display_name || 'Unknown'}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {replyTo.content || 'Attachment'}
              </div>
            </div>
            <button
              onClick={() => setReplyTo(null)}
              className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Attachment preview strip */}
        {attachmentFile && (
          <div className="flex items-center gap-2 px-4 pt-2 pb-1 border-t border-gray-100 dark:border-gray-800">
            {attachmentPreviewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={attachmentPreviewUrl} alt="preview" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-gray-900 dark:text-white truncate">{attachmentFile.name}</div>
              <div className="text-xs text-gray-500">{(attachmentFile.size / 1024).toFixed(1)} KB</div>
            </div>
            <button
              onClick={clearAttachment}
              className="p-1 text-gray-400 hover:text-red-500 rounded-full transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Composer */}
        <form onSubmit={handleSendMessage} className="flex items-end gap-3 px-4 py-3 max-w-4xl mx-auto">
          {/* Emoji button (placeholder) */}
          <button type="button" className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Attachment button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors flex-shrink-0 ${attachmentFile ? 'text-blue-500' : 'text-gray-500 dark:text-gray-400'}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-[22px] w-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf,.txt,.doc,.docx,.zip"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Text input */}
          <div className="flex-1 bg-gray-100 dark:bg-[#2C2C2E] border border-transparent rounded-2xl overflow-hidden focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <textarea
              ref={textareaRef}
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                const participantIds = conversation.participants.map((p) => p.id);
                wsManager.sendTypingIndicator(conversation.id, participantIds);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Message"
              className="w-full max-h-32 px-4 py-2.5 bg-transparent border-none focus:ring-0 resize-none outline-none text-[15px] leading-relaxed text-gray-900 dark:text-white"
              rows={1}
              style={{ minHeight: '40px' }}
            />
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={(!newMessage.trim() && !attachmentFile) || uploading}
            className="p-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 dark:disabled:bg-gray-800 disabled:text-gray-400 text-white rounded-full transition-colors flex-shrink-0"
          >
            {uploading ? (
              <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (newMessage.trim() || attachmentFile) ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 translate-x-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>
        </form>
      </div>

      <GroupInfoModal
        isOpen={showGroupInfo}
        onClose={() => setShowGroupInfo(false)}
        conversation={conversation}
        currentUserId={currentUserId}
        onUpdate={() => { }}
      />
      
      <ProfileInfoModal
        isOpen={showProfileInfo}
        onClose={() => setShowProfileInfo(false)}
        conversation={conversation}
        currentUserId={currentUserId}
      />
      
      <ChatSettingsPanel
        isOpen={showChatSettings}
        onClose={() => setShowChatSettings(false)}
        conversation={conversation}
        currentUserId={currentUserId}
      />
    </div>
  );
}
