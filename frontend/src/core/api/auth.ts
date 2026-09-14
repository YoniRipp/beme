import { request } from './client';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt?: string;
  subscriptionStatus?: string;
  subscriptionPlan?: string | null;
  subscriptionCurrentPeriodEnd?: string | null;
  aiCallsRemaining?: number;
}

export interface AuthResponse {
  user: ApiUser;
  token?: string;
}

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>('/api/auth/login', { method: 'POST', body: { email, password } }),
  register: (email: string, password: string, name: string) =>
    request<AuthResponse>('/api/auth/register', { method: 'POST', body: { email, password, name } }),
  loginWithGoogle: (token: string) =>
    request<AuthResponse>('/api/auth/google', { method: 'POST', body: { token } }),
  loginWithFacebook: (token: string) =>
    request<AuthResponse>('/api/auth/facebook', { method: 'POST', body: { token } }),
  loginWithTwitter: (token: string) =>
    request<AuthResponse>('/api/auth/twitter', { method: 'POST', body: { token } }),
  exchangeCode: (code: string) =>
    request<AuthResponse>('/api/auth/exchange', { method: 'POST', body: { code } }),
  /**
   * Completes the flow started by `/api/auth/forgot-password`, whose mailed link lands on
   * `/reset-password?token=..&email=..`. Returns a message, not a session — the user still
   * signs in afterwards.
   *
   * `skipOfflineQueue` is not optional here: a queued reset would resolve optimistically,
   * telling the user their password changed while the request sat in the replay queue until
   * the one-hour token had already expired.
   */
  resetPassword: (params: { token: string; email: string; password: string }) =>
    request<{ message: string }>('/api/auth/reset-password', {
      method: 'POST',
      body: params,
      skipOfflineQueue: true,
    }),
  me: () => request<ApiUser>('/api/auth/me', { suppressUnauthorizedEvent: true }),
  /** Validates the session and mints a token with a fresh expiry. */
  refresh: () =>
    request<AuthResponse>('/api/auth/refresh', {
      method: 'POST',
      suppressUnauthorizedEvent: true,
      skipOfflineQueue: true,
    }),
  logout: () =>
    request<void>('/api/auth/logout', {
      method: 'POST',
      suppressUnauthorizedEvent: true,
      skipOfflineQueue: true,
    }),
};
