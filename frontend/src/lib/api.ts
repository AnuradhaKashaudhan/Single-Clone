/**
 * API Client - Centralized HTTP requests to backend
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface ApiResponse<T> {
  data?: T;
  detail?: string;
  error?: string;
}

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
    data?: Record<string, any>,
  ): Promise<T> {
    const url = `${API_URL}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: this.getHeaders(),
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch (e) {
          // Ignore JSON parse errors
        }
        throw new Error(errorMessage);
      }

      // Handle empty responses (204 No Content)
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
    return this.request('/auth/register', 'POST', payload);
  }

  async login(payload: {
    username?: string;
    phone_number?: string;
    password: string;
  }) {
    return this.request('/auth/login', 'POST', payload);
  }

  async logout() {
    this.setToken(null);
    return { detail: 'Logged out successfully' };
  }

  async getCurrentUser() {
    return this.request('/auth/me', 'GET');
  }

  // User endpoints
  async searchUsers(query: string) {
    const params = new URLSearchParams();
    params.append('q', query);
    return this.request(`/users/search?${params.toString()}`, 'GET');
  }

  // Conversation endpoints
  async listConversations(skip?: number, limit?: number) {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    const queryString = params.toString();
    return this.request(
      `/conversations${queryString ? '?' + queryString : ''}`,
      'GET'
    );
  }

  async getConversation(conversationId: number) {
    return this.request(`/conversations/${conversationId}`, 'GET');
  }

  async createConversation(payload: {
    type: 'direct' | 'group';
    name?: string;
    participant_ids: number[];
  }) {
    return this.request('/conversations', 'POST', payload);
  }

  // Message endpoints
  async getMessages(conversationId: number, skip?: number, limit?: number) {
    const params = new URLSearchParams();
    if (skip !== undefined) params.append('skip', skip.toString());
    if (limit !== undefined) params.append('limit', limit.toString());
    const queryString = params.toString();
    return this.request(
      `/conversations/${conversationId}/messages${
        queryString ? '?' + queryString : ''
      }`,
      'GET'
    );
  }

  async sendMessage(
    conversationId: number,
    payload: { content: string }
  ) {
    return this.request(
      `/conversations/${conversationId}/messages`,
      'POST',
      payload
    );
  }

  async markMessagesAsRead(conversationId: number, messageIds: number[]) {
    return this.request(
      `/conversations/${conversationId}/messages/mark-as-read`,
      'POST',
      { message_ids: messageIds }
    );
  }
}

export const apiClient = new ApiClient();
export default apiClient;
