import React, { useState, useEffect, useRef } from 'react';
import apiClient from '@/lib/api';
import MessageBubble from '@/components/MessageBubble';
import TypingIndicator from '@/components/TypingIndicator';
import GroupInfoModal from '@/components/GroupInfoModal';
import { Conversation } from '@/app/conversations/page';
import { wsManager } from '@/lib/websocket';

interface ChatAreaProps {
  conversation: Conversation;
  currentUserId?: number;
  onMessageSent: () => void;
  onBack?: () => void;
}

export default function ChatArea({
  conversation,
  currentUserId,
  onMessageSent,
  onBack,
}: ChatAreaProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showGroupInfo, setShowGroupInfo] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Map<number, string>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const fetchMessages = async () => {
    try {
      const data: any = await apiClient.getMessages(conversation.id);
      setMessages(data);
      markUnreadAsRead(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const markUnreadAsRead = async (msgs: any[]) => {
    if (!currentUserId) return;
    
    // Find unread messages from other users
    const unreadIds = msgs
      .filter(m => m.sender_id !== currentUserId)
      .map(m => {
        const myReceipt = m.receipts?.find((r: any) => r.user_id === currentUserId);
        if (myReceipt && myReceipt.status !== 'read') {
          return m.id;
        }
        // If no receipt found but it's not our message, assume we need to mark it
        if (!myReceipt) return m.id;
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
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages();
    
    const unsubscribe = wsManager.subscribe((msg: any) => {
      if (msg.type === 'message' && msg.message.conversation_id === conversation.id) {
        setMessages(prev => [...prev, msg.message]);
        
        // Mark as read immediately if it's not ours
        if (msg.message.sender_id !== currentUserId) {
          apiClient.markMessagesAsRead(conversation.id, [msg.message.id]).catch(console.error);
        }
        
        // Also stop typing indicator for this user
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.delete(msg.message.sender_id);
          return newMap;
        });
      }
      
      if (msg.type === 'typing' && msg.conversation_id === conversation.id && msg.user_id !== currentUserId) {
        setTypingUsers(prev => {
          const newMap = new Map(prev);
          newMap.set(msg.user_id, msg.display_name);
          return newMap;
        });
        
        // Clear previous timeout
        if (typingTimeoutRefs.current.has(msg.user_id)) {
          clearTimeout(typingTimeoutRefs.current.get(msg.user_id)!);
        }
        
        // Set new timeout to clear typing after 3 seconds
        const timeout = setTimeout(() => {
          setTypingUsers(prev => {
            const newMap = new Map(prev);
            newMap.delete(msg.user_id);
            return newMap;
          });
        }, 3000);
        typingTimeoutRefs.current.set(msg.user_id, timeout);
      }
      
      if (msg.type === 'delivery_receipt' || msg.type === 'read_receipt') {
        // Just re-fetch for now to get the complete updated state with all receipts
        if (msg.conversation_id === conversation.id) {
          // Add a tiny delay to avoid spamming the backend if multiple receipts come at once
          setTimeout(() => fetchMessages(), 100);
        }
      }
    });

    return () => unsubscribe();
  }, [conversation.id, currentUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      await apiClient.sendMessage(conversation.id, { content });
      await fetchMessages();
      onMessageSent(); // Update conversation list (e.g. last message preview)
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const getConversationName = () => {
    if (conversation.type === 'group' && conversation.name) return conversation.name;
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
    return otherParticipant ? otherParticipant.display_name : 'Unknown';
  };

  const getConversationAvatar = () => {
    if (conversation.type === 'group') {
      return (
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold shadow-sm">
          {conversation.name?.charAt(0).toUpperCase() || 'G'}
        </div>
      );
    }
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
    if (otherParticipant?.avatar_url) {
      return <img src={otherParticipant.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover shadow-sm" />;
    }
    return (
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold shadow-sm">
        {otherParticipant ? otherParticipant.display_name.charAt(0).toUpperCase() : '?'}
      </div>
    );
  };

  const getStatusText = () => {
    if (conversation.type === 'group') return `${conversation.participants.length} participants`;
    const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
    return otherParticipant?.status === 'online' ? 'Online' : 'Offline';
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#f0f2f5] relative">
      {/* Header */}
      <div 
        className="h-16 px-4 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between z-10 shadow-sm shrink-0 transition-colors"
      >
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
              </h2>
              <p className={`text-xs ${getStatusText() === 'Online' ? 'text-green-500 font-medium' : 'text-gray-500 dark:text-gray-400'}`}>
                {getStatusText()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400">
          <button className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </button>
          <button className="hover:bg-gray-100 dark:hover:bg-gray-800 p-2 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
            </svg>
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#efeae2] dark:bg-gray-950 transition-colors"
        style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cubes.png")', backgroundSize: '150px', backgroundBlendMode: 'multiply' }}
      >
        {loading && messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6">
            <div className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-200 text-sm font-medium px-4 py-2 rounded-full mb-4 shadow-sm">
              This is the beginning of your chat history.
            </div>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isCurrentUser = msg.sender_id === currentUserId;
            const showAvatar = conversation.type === 'group' && !isCurrentUser && 
              (index === messages.length - 1 || messages[index + 1]?.sender_id !== msg.sender_id);
            
            return (
              <MessageBubble 
                key={msg.id} 
                message={msg} 
                isCurrentUser={isCurrentUser}
                showAvatar={showAvatar}
                avatarUrl={msg.sender_avatar_url}
                senderName={msg.sender_display_name}
              />
            );
          })
        )}
        
        {/* Typing indicators */}
        {Array.from(typingUsers.values()).map((name, idx) => (
          <TypingIndicator key={idx} name={name} />
        ))}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shrink-0 transition-colors">
        <form onSubmit={handleSendMessage} className="flex items-end gap-2 max-w-4xl mx-auto">
          <button type="button" className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
          <button type="button" className="p-2.5 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-700 dark:hover:text-gray-200 rounded-full transition-colors flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
            </svg>
          </button>
          
          <div className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-transparent transition-all shadow-sm">
            <textarea
              value={newMessage}
              onChange={(e) => {
                setNewMessage(e.target.value);
                const participantIds = conversation.participants.map(p => p.id);
                wsManager.sendTypingIndicator(conversation.id, participantIds);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(e);
                }
              }}
              placeholder="Type a message"
              className="w-full max-h-32 p-3 bg-transparent border-none focus:ring-0 resize-none outline-none text-[15px] leading-relaxed text-gray-900 dark:text-white"
              rows={1}
              style={{ minHeight: '44px' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={!newMessage.trim()}
            className="p-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white rounded-full transition-colors flex-shrink-0 shadow-sm"
          >
            {newMessage.trim() ? (
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
        onUpdate={() => {
          // You could trigger a re-fetch of the conversation details here
          // This will be handled globally via WebSocket or polling later
        }}
      />
    </div>
  );
}
