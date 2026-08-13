import React, { useState, useEffect } from 'react';
import apiClient from '@/lib/api';
import { Conversation } from '@/app/conversations/page';
import { Search, Users, User as UserIcon, X, Check, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  const [chatType, setChatType] = useState<'direct' | 'group'>('direct');
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<User[]>([]);
  const [groupName, setGroupName] = useState('');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setUsers([]);
      setSelectedUsers([]);
      setGroupName('');
      setChatType('direct');
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
        setUsers(results as User[]);
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
    if (chatType === 'direct') {
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
        onChatCreated(newConv as Conversation);
      } catch (error) {
        console.error('Failed to create conversation:', error);
        toast.error('Failed to start chat.');
      } finally {
        setCreating(false);
      }
    } else {
      // Toggle selection for group
      setSelectedUsers(prev => {
        const exists = prev.some(u => u.id === user.id);
        if (exists) return prev.filter(u => u.id !== user.id);
        return [...prev, user];
      });
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0 || !groupName.trim()) return;
    
    setCreating(true);
    try {
      const newConv = await apiClient.createConversation({
        type: 'group',
        name: groupName.trim(),
        participant_ids: selectedUsers.map(u => u.id),
      });
      onChatCreated(newConv as Conversation);
      toast.success(`Group "${groupName}" created!`);
    } catch (error) {
      console.error('Failed to create group:', error);
      toast.error('Failed to create group.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col h-[600px] max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">New Chat</h2>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${chatType === 'direct' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => { setChatType('direct'); setSelectedUsers([]); }}
          >
            <UserIcon className="w-4 h-4" /> Direct Message
          </button>
          <button
            className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${chatType === 'group' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            onClick={() => setChatType('group')}
          >
            <Users className="w-4 h-4" /> New Group
          </button>
        </div>

        {/* Group Name Input */}
        {chatType === 'group' && (
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <input
              type="text"
              className="block w-full px-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Group Name"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
            />
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedUsers.map(u => (
                  <div key={u.id} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    {u.display_name}
                    <button onClick={() => handleUserSelect(u)} className="hover:text-blue-900"><X className="w-3 h-3" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100 bg-white">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search users..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus={chatType === 'direct'}
            />
          </div>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto bg-gray-50">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : users.length > 0 ? (
            <ul className="divide-y divide-gray-100 bg-white">
              {users.map((user) => {
                const isSelected = selectedUsers.some(u => u.id === user.id);
                return (
                  <li 
                    key={user.id} 
                    onClick={() => handleUserSelect(user)}
                    className={`flex items-center p-4 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    {chatType === 'group' && (
                      <div className={`w-5 h-5 rounded border mr-4 flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                    )}
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover mr-3" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-white font-bold mr-3">
                        {user.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{user.display_name}</p>
                      <p className="text-xs text-gray-500">@{user.username}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : query.length > 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              No users found matching "{query}"
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400 text-sm flex flex-col items-center">
              <Users className="w-12 h-12 text-gray-300 mb-2" />
              <p>Type a name to search</p>
            </div>
          )}
        </div>
        
        {/* Footer for Group creation */}
        {chatType === 'group' && (
          <div className="p-4 border-t bg-white">
            <button
              onClick={handleCreateGroup}
              disabled={selectedUsers.length === 0 || !groupName.trim() || creating}
              className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Group'}
            </button>
          </div>
        )}

        {/* Overlay for Direct Chat creation loading */}
        {creating && chatType === 'direct' && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-xl z-10">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </div>
  );
}
