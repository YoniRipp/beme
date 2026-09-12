import React, { createContext, useCallback, useEffect, useRef, useState } from 'react';
import { User } from '@/types/user';
import { authApi, setToken } from '@/features/auth/api';
import { queryClient } from '@/lib/queryClient';
import { clearOfflineQueue } from '@/lib/syncQueue';

type AuthProviderName = 'google' | 'facebook' | 'twitter';

/** Don't re-roll the session more than once an hour, however often the app is resumed. */
const SESSION_ROLL_INTERVAL_MS = 60 * 60 * 1000;

interface AuthContextType {
  user: User | null;
  authLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithProvider: (provider: AuthProviderName, token: string) => Promise<void>;
  loadUser: () => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function apiUserToUser(a: { id: string; email: string; name: string; role: 'admin' | 'user'; createdAt?: string; subscriptionStatus?: string; subscriptionPlan?: string | null; subscriptionCurrentPeriodEnd?: string | null; aiCallsRemaining?: number }): User {
  return {
    id: a.id,
    email: a.email,
    name: a.name,
    role: a.role,
    createdAt: a.createdAt,
    subscriptionStatus: (a.subscriptionStatus as User['subscriptionStatus']) || 'free',
    subscriptionPlan: a.subscriptionPlan === 'monthly' || a.subscriptionPlan === 'yearly' ? a.subscriptionPlan : null,
    subscriptionCurrentPeriodEnd: a.subscriptionCurrentPeriodEnd ?? undefined,
    aiCallsRemaining: a.aiCallsRemaining,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const lastRolledAt = useRef(0);

  // refresh() validates the session and mints a token with a fresh expiry, so the launch
  // path rolls the session in the same round trip that loads the user -- /auth/me would
  // have cost a second authenticated request for data this one already returns.
  const loadUser = useCallback(async () => {
    try {
      const res = await authApi.refresh();
      if (res.token) setToken(res.token);
      setUser(apiUserToUser(res.user));
      lastRolledAt.current = Date.now();
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  // Keep pushing the expiry forward on resume. A PWA or native shell can sit backgrounded
  // for weeks, and loadUser only rolls the session on a full launch. Best-effort by design:
  // it never touches user state, so a failed roll leaves the user signed in and a session
  // that really is dead surfaces through the next request's 401.
  useEffect(() => {
    if (!user) return;

    const roll = () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return;
      if (Date.now() - lastRolledAt.current < SESSION_ROLL_INTERVAL_MS) return;
      lastRolledAt.current = Date.now();
      authApi
        .refresh()
        .then((res) => {
          if (res.token) setToken(res.token);
        })
        .catch(() => {
          // Leave the session as-is; the next real request decides whether it is gone.
        });
    };

    document.addEventListener('visibilitychange', roll);
    return () => document.removeEventListener('visibilitychange', roll);
  }, [user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password);
    setToken(res.token ?? null);
    setUser(apiUserToUser(res.user));
  }, []);

  const clearClientSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    queryClient.clear();
    await clearOfflineQueue().catch(() => {});
    if ('caches' in window) {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name === 'api-cache').map((name) => caches.delete(name)));
    }
  }, []);

  const logout = useCallback(async () => {
    // Call backend to invalidate refresh token (best effort)
    try {
      await authApi.logout();
    } catch {
      // Ignore errors - we still want to clear local state
    }
    await clearClientSession();
  }, [clearClientSession]);

  useEffect(() => {
    const onLogout = () => {
      logout().catch(() => {});
    };
    window.addEventListener('auth:logout', onLogout);
    return () => window.removeEventListener('auth:logout', onLogout);
  }, [logout]);

  const register = useCallback(async (email: string, password: string, name: string) => {
    const res = await authApi.register(email, password, name);
    setToken(res.token ?? null);
    setUser(apiUserToUser(res.user));
  }, []);

  const loginWithProvider = useCallback(async (provider: AuthProviderName, token: string) => {
    const res =
      provider === 'google'
        ? await authApi.loginWithGoogle(token)
        : provider === 'facebook'
          ? await authApi.loginWithFacebook(token)
          : await authApi.loginWithTwitter(token);
    setToken(res.token ?? null);
    setUser(apiUserToUser(res.user));
  }, []);

  return (
    <AuthContext.Provider value={{ user, authLoading, login, loginWithProvider, loadUser, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
