import React, { createContext, useCallback, useEffect, useState } from 'react';
import { User } from '../types/user';
import { authApi } from '../core/api/auth';
import { getToken, setToken, setOnUnauthorized } from '../core/api/client';
import { queryClient } from '../lib/queryClient';

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<void>;
}

function apiUserToUser(a: { id: string; email: string; name: string; role: 'admin' | 'user' | 'trainer'; createdAt?: string }): User {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.role,
    createdAt: a.createdAt,
  };
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setUser(null);
      setAuthLoading(false);
      return;
    }
    try {
      const me = await authApi.me();
      setUser(apiUserToUser(me));
    } catch {
      await setToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
    return () => setOnUnauthorized(null);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    await setToken(res.token);
    setUser(apiUserToUser(res.user));
  }, []);

  const logout = useCallback(() => {
    void setToken(null);
    setUser(null);
    // Every cached query belongs to the account that just went away. The web clears its
    // cache in `AuthContext.clearClientSession`; this client did not, and `queryClient`'s
    // `staleTime: 60_000` means the next account to sign in on the same device is served the
    // previous one's workouts, food, weights and goals for a minute — from cache, with no
    // refetch to correct it.
    //
    // It matters most after account deletion, where the rows are gone server-side and this
    // cache is the only copy of them left anywhere. A deletion that leaves the data on the
    // device is not the deletion App Store Guideline 5.1.1(v) asks for.
    queryClient.clear();
  }, []);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await authApi.register(email, password, name);
    await setToken(res.token);
    setUser(apiUserToUser(res.user));
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading, login, loadUser, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = React.useContext(AuthContext);
  if (ctx === undefined) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
