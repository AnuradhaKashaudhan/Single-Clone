/**
 * Authentication Context - Global state for authenticated user
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import apiClient from '@/lib/api';

export interface User {
  id: number;
  username: string;
  display_name: string;
  phone_number?: string;
  avatar_url?: string;
  status?: string;
  last_seen?: string;
  created_at?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  register: (data: {
    username: string;
    display_name: string;
    phone_number?: string;
    password: string;
    avatar_url?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user is already logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        apiClient.setToken(token);
        try {
          const userData: any = await apiClient.getCurrentUser();
          setUser(userData);
          setError(null);
        } catch (err: any) {
          if (err?.message?.includes('Invalid token') || err?.message?.includes('401')) {
            console.warn('Session expired or invalid token');
          } else {
            console.error('Failed to fetch current user:', err);
          }
          localStorage.removeItem('access_token');
          apiClient.setToken(null);
          setError('Session expired');
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const login = async (username: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.login({
        username,
        password,
      });

      if (response.access_token) {
        apiClient.setToken(response.access_token);
        const userData: any = await apiClient.getCurrentUser();
        setUser(userData);
      } else {
        throw new Error('No token received');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: {
    username: string;
    display_name: string;
    phone_number?: string;
    password: string;
    avatar_url?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      await apiClient.register(data);
      // Auto-login after registration
      await login(data.username, data.password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Registration failed';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await apiClient.logout();
      setUser(null);
      setError(null);
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
