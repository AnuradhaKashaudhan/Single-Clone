import React from 'react';

interface Message {
  id: number;
  content: string;
  sender_id: number;
  created_at: string;
  status: string;
}

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  avatarUrl?: string;
  senderName?: string;
}

export default function MessageBubble({
  message,
  isCurrentUser,
  showAvatar,
  avatarUrl,
  senderName,
}: MessageBubbleProps) {
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex w-full mb-4 ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
      {!isCurrentUser && showAvatar && (
        <div className="mr-2 flex-shrink-0 flex items-end">
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full shadow-sm" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {senderName?.charAt(0).toUpperCase() || '?'}
            </div>
          )}
        </div>
      )}
      
      {!isCurrentUser && !showAvatar && <div className="w-10"></div>}

      <div className={`max-w-[70%] flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
        {!isCurrentUser && showAvatar && (
          <span className="text-xs text-gray-500 ml-1 mb-1 font-medium">{senderName}</span>
        )}
        
        <div 
          className={`relative px-4 py-2.5 shadow-sm ${
            isCurrentUser 
              ? 'bg-indigo-600 text-white rounded-2xl rounded-tr-sm' 
              : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
          }`}
        >
          <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap">{message.content}</p>
          
          <div className={`flex items-center justify-end gap-1 mt-1 ${isCurrentUser ? 'text-indigo-200' : 'text-gray-400'}`}>
            <span className="text-[10px] font-medium">{formatTime(message.created_at)}</span>
            {isCurrentUser && (
              <span className="ml-1">
                {message.status === 'read' ? (
                  <svg className="w-3.5 h-3.5 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7m-9 5l4 4L22 5" /></svg>
                ) : message.status === 'delivered' ? (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7m-9 5l4 4L22 5" /></svg>
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                )}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
