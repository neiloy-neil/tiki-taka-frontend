'use client';

import { useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '../services/api';
import { AuthContext } from './auth-context';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'user' | 'organizer' | 'admin';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Verify token and get user data
      apiClient.get('/auth/me')
        .then((response) => {
          setUser(response.data.user);
          setLoading(false);
        })
        .catch(() => {
          // Token invalid, remove it
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    const response = await apiClient.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user: userData } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    setUser(userData);
    
    // Redirect based on user role
    if (userData.role === 'admin' || userData.role === 'organizer') {
      router.push('/admin');
    } else {
      router.push('/events');
    }
  };

  const register = async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await apiClient.post('/auth/register', data);
    const { accessToken, refreshToken } = response.data;
    
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    
    // Get user data after registration
    const userResponse = await apiClient.get('/auth/me');
    setUser(userResponse.data.user);
    router.push('/events');
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setUser(null);
    router.push('/');
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}