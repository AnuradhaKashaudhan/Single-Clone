import React, { useState } from 'react';
import apiClient from '@/lib/api';
import { Conversation } from '@/app/conversations/page';
import { X, UserPlus, Shield, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface GroupInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  currentUserId?: number;
  onUpdate: () => void;
}

export default function GroupInfoModal({ isOpen, onClose, conversation, currentUserId, onUpdate }: GroupInfoModalProps) {
  const [loadingAction, setLoadingAction] = useState<number | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  if (!isOpen) return null;

  const currentUser = conversation.participants.find(p => p.id === currentUserId);
  const isAdmin = currentUser?.role === 'admin';

  const handleSearch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (query.trim().length === 0) {
      setSearchResults([]);
      return;
    }
    
    setSearching(true);
    try {
      const results = await apiClient.searchUsers(query);
      // Filter out existing members
      const existingIds = new Set(conversation.participants.map(p => p.id));
      setSearchResults(results.filter((u: any) => !existingIds.has(u.id)));
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = async (userId: number) => {
    setLoadingAction(userId);
    try {
      await apiClient.addMember(conversation.id, userId);
      setSearchQuery('');
      setSearchResults([]);
      setShowAddMember(false);
      onUpdate();
      toast.success('Member added');
    } catch (err) {
      console.error('Failed to add member', err);
      toast.error('Failed to add member');
    } finally {
      setLoadingAction(null);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm('Are you sure you want to remove this member?')) return;
    setLoadingAction(userId);
    try {
      await apiClient.removeMember(conversation.id, userId);
      onUpdate();
      toast.success('Member removed');
    } catch (err) {
      console.error('Failed to remove member', err);
      toast.error('Failed to remove member');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex flex-col items-center p-6 border-b border-gray-100 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-3xl font-bold shadow-md mb-3">
            {conversation.name?.charAt(0).toUpperCase() || 'G'}
          </div>
          <h2 className="text-xl font-bold text-gray-900">{conversation.name || 'Group Chat'}</h2>
          <p className="text-sm text-gray-500 mt-1">{conversation.participants.length} members</p>
        </div>

        {/* Member List */}
        <div className="flex-1 overflow-y-auto p-2">
          {/* Add Member Toggle */}
          {isAdmin && !showAddMember && (
            <button
              onClick={() => setShowAddMember(true)}
              className="w-full flex items-center p-3 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors font-medium"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mr-3">
                <UserPlus className="w-5 h-5" />
              </div>
              Add members
            </button>
          )}

          {/* Add Member Search Area */}
          {showAddMember && (
            <div className="p-3 bg-gray-50 rounded-lg mb-2 border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase">Search Users</span>
                <button onClick={() => setShowAddMember(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Name or username"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                value={searchQuery}
                onChange={handleSearch}
                autoFocus
              />
              {searching && <Loader2 className="w-5 h-5 animate-spin mx-auto mt-4 text-indigo-600" />}
              {!searching && searchResults.length > 0 && (
                <ul className="mt-2 divide-y divide-gray-100">
                  {searchResults.map((u) => (
                    <li key={u.id} className="py-2 flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-2">
                          {u.display_name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.display_name}</p>
                          <p className="text-xs text-gray-500">@{u.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddMember(u.id)}
                        disabled={loadingAction === u.id}
                        className="text-indigo-600 text-sm font-medium hover:text-indigo-800 disabled:opacity-50"
                      >
                        {loadingAction === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <h3 className="text-xs font-semibold text-gray-500 uppercase px-3 py-2 mt-2">Members</h3>
          <ul className="divide-y divide-gray-50">
            {conversation.participants.map((p) => {
              const isMe = p.id === currentUserId;
              return (
                <li key={p.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                  <div className="flex items-center">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt="avatar" className="w-10 h-10 rounded-full object-cover mr-3" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold mr-3">
                        {p.display_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-gray-900 flex items-center gap-1">
                        {isMe ? 'You' : p.display_name}
                        {p.role === 'admin' && <Shield className="w-3 h-3 text-indigo-500" />}
                      </p>
                      <p className="text-xs text-gray-500">{p.status === 'online' ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                  
                  {isAdmin && !isMe && (
                    <button 
                      onClick={() => handleRemoveMember(p.id)}
                      disabled={loadingAction === p.id}
                      className="text-red-500 hover:bg-red-50 p-2 rounded-full transition-colors opacity-0 group-hover:opacity-100 lg:opacity-100 disabled:opacity-50"
                      title="Remove member"
                    >
                      {loadingAction === p.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
