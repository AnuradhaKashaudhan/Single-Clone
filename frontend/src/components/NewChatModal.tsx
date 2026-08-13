import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { Conversation } from '@/app/conversations/page';

interface User {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
  status: string;
}

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onChatCreated: (conversation: Conversation) => void;
  existingConversations: Conversation[];
}

export default function NewChatModal({ isOpen, onClose, onChatCreated, existingConversations }: NewChatModalProps) {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const searchUsers = async () => {
      if (query.trim().length === 0) {
        setUsers([]);
        return;
      }
      
      setLoading(true);
      try {
        const results = await apiClient.searchUsers(query);
        setUsers(results);
      } catch (error) {
        console.error('Failed to search users:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [query]);

  if (!isOpen) return null;

  const handleUserSelect = async (user: User) => {
    // Check if direct conversation already exists
    const existing = existingConversations.find(
      (conv) => conv.type === 'direct' && conv.participants.some((p) => p.id === user.id)
    );

    if (existing) {
      onChatCreated(existing);
      return;
    }

    // Create new direct conversation
    setCreating(true);
    try {
      const newConv = await apiClient.createConversation({
        type: 'direct',
        participant_ids: [user.id],
      });
      onChatCreated(newConv);
    } catch (error) {
      console.error('Failed to create conversation:', error);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col h-[500px] max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">New Message</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
            </div>
          ) : users.length > 0 ? (
            <ul className="divide-y divide-gray-100">
              {users.map((user) => (
                <li 
                  key={user.id} 
                  onClick={() => handleUserSelect(user)}
                  className="flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover mr-3" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white font-bold mr-3">
                      {user.display_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{user.display_name}</p>
                    <p className="text-xs text-gray-500">@{user.username}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : query.length > 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No users found matching "{query}"
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm">
              Type a name to search
            </div>
          )}
        </div>
        
        {creating && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>
    </div>
  );
}
