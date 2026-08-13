/**
 * API Client - Centralized HTTP requests to backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('access_token');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('access_token', token);
    } else {
      localStorage.removeItem('access_token');
    }
  }

  getToken() {
    return this.token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async request<T>(
    endpoint: string,
    method: string = 'GET',
    data?: Record<string, unknown>,
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        if (response.status === 401) {
          this.setToken(null);
          if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }
        
        let errorMessage = `HTTP Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API Error (${method} ${endpoint}):`, error);
      throw error;
    }
  }

  // Auth endpoints
  async register(payload: {
    username: string;
    display_name: string;
    phone_number?: string;
    password: string;
    avatar_url?: string;
  }) {
    return this.request<unknown>('/auth/register', 'POST', payload as Record<string, unknown>);
  }

  async login(payload: {
    username?: string;
    phone_number?: string;
    password: string;
  }) {
    return this.request<unknown>('/auth/login', 'POST', payload as Record<string, unknown>);
  }

  async logout() {
    this.setToken(null);
    return { detail: 'Logged out successfully' };
  }

  async getCurrentUser() {
    return this.request<unknown>('/auth/me', 'GET');
  }

  async updateProfile(payload: { display_name?: string; avatar_url?: string; status?: string }) {
    return this.request<unknown>('/users/me', 'PUT', payload as Record<string, unknown>);
  }

  // User endpoints
  async searchUsers(query: string) {
    const params = new URLSearchParams();
    params.append('q', query);
    return this.request<unknown>(`/users/search?${params.toString()}`, 'GET');
  }

  // Conversation endpoints
  async listConversations(skip?: number, limit?: number) {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    const queryString = params.toString();
    return this.request<unknown>(
      `/conversations${queryString ? '?' + queryString : ''}`,
      'GET'
    );
  }

  async getConversation(conversationId: number) {
    return this.request<unknown>(`/conversations/${conversationId}`, 'GET');
  }

  async createConversation(payload: {
    type: 'direct' | 'group';
    name?: string;
    participant_ids: number[];
  }) {
    return this.request<unknown>('/conversations', 'POST', payload as Record<string, unknown>);
  }

  async createGroup(name: string, participantIds: number[]) {
    return this.request<any>('/conversations', 'POST', {
      type: 'group',
      name,
      participant_ids: participantIds,
    });
  }

  async updateDisappearingMessages(conversationId: number, seconds: number | null) {
    return this.request<any>(
      `/conversations/${conversationId}/disappearing`,
      'PUT',
      { disappearing_messages_seconds: seconds }
    );
  }

  async addMember(conversationId: number, userId: number) {
    return this.request<unknown>(`/conversations/${conversationId}/members`, 'POST', { user_id: userId });
  }

  async removeMember(conversationId: number, userId: number) {
    return this.request<unknown>(`/conversations/${conversationId}/members/${userId}`, 'DELETE');
  }

  // Message endpoints
  async getMessages(conversationId: number, skip?: number, limit?: number) {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    const queryString = params.toString();
    return this.request<unknown>(
      `/conversations/${conversationId}/messages${queryString ? '?' + queryString : ''}`,
      'GET'
    );
  }

  async sendMessage(
    conversationId: number,
    payload: { content: string; reply_to_id?: number; message_type?: string }
  ) {
    return this.request<unknown>(
      `/conversations/${conversationId}/messages`,
      'POST',
      payload as Record<string, unknown>
    );
  }

  async markMessagesAsRead(conversationId: number, messageIds: number[]) {
    return this.request<unknown>(
      `/conversations/${conversationId}/messages/mark-as-read`,
      'POST',
      { message_ids: messageIds }
    );
  }

  // Attachment endpoints
  async uploadAttachment(conversationId: number, messageId: number, file: File) {
    const url = `${API_URL}/conversations/${conversationId}/messages/${messageId}/attachment`;
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(url, {
      method: 'POST',
      headers: this.token ? { 'Authorization': `Bearer ${this.token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      let errorMessage = `Upload failed: ${response.status}`;
      try {
        const err = await response.json();
        errorMessage = err.detail || errorMessage;
      } catch { /* ignore */ }
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  // Reaction endpoints
  async addReaction(conversationId: number, messageId: number, emoji: string) {
    return this.request<unknown>(
      `/conversations/${conversationId}/messages/${messageId}/reactions`,
      'POST',
      { emoji }
    );
  }

  async removeReaction(conversationId: number, messageId: number, emoji: string) {
    const url = `${API_URL}/conversations/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });
    if (!response.ok) throw new Error(`Remove reaction failed: ${response.status}`);
    return await response.json();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
