'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  role?: string;
  is_super_admin?: boolean;
}

interface AuthTokens {
  accessToken: string;
  googleAccessToken?: string;
  googleRefreshToken?: string;
  expiresIn?: string;
}

interface AuthContextType {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (tokens: AuthTokens, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    const savedToken = localStorage.getItem('accessToken');

    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        setUser(user);
        setTokens({ accessToken: savedToken });
      } catch (error) {
        console.error('認証情報の復元に失敗:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('accessToken');
        localStorage.removeItem('tokens');
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newTokens: AuthTokens, newUser: User) => {
    setUser(newUser);
    setTokens(newTokens);
    localStorage.setItem('user', JSON.stringify(newUser));
    localStorage.setItem('accessToken', newTokens.accessToken);
    if (newTokens.googleAccessToken) {
      localStorage.setItem('tokens', JSON.stringify(newTokens));
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setTokens(null);
    localStorage.removeItem('user');
    localStorage.removeItem('accessToken');
    localStorage.removeItem('tokens');
  }, []);

  const isAuthenticated = useMemo(() => !!user && !!tokens, [user, tokens]);

  const value = useMemo(() => ({
    user,
    tokens,
    isLoading,
    isAuthenticated,
    login,
    logout
  }), [user, tokens, isLoading, isAuthenticated, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}