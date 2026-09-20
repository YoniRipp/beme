import { request } from './client';

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'trainer';
  createdAt?: string;
}

export interface AuthResponse {
  user: ApiUser;
  token: string;
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
  /**
   * Asks for a reset link. The reply is the same whether or not the address has an account
   * -- "If an account exists, a reset link has been sent." -- so the caller must not treat
   * success as proof the address is registered. Telling an anonymous caller which emails are
   * registered is the enumeration this wording exists to prevent.
   */
  forgotPassword: (email: string) =>
    request<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  me: () => request<ApiUser>('/api/auth/me'),
  /**
   * Irreversibly deletes the signed-in user's account, as App Store Guideline 5.1.1(v)
   * requires of any app that can create one. Takes no id: the backend's subject is the token
   * holder and nothing else. The server blocklists this token before answering, so every
   * later request with it is a 401.
   */
  deleteAccount: () => request<void>('/api/auth/account', { method: 'DELETE' }),
};
