import { request } from './client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export const chatApi = {
  sendMessage: (message: string): Promise<ChatMessage> =>
    request('/api/chat', { method: 'POST', body: { message }, timeoutMs: 60000 }),

  getHistory: (limit = 30): Promise<{ messages: ChatMessage[] }> =>
    request(`/api/chat/history?limit=${limit}`),

  clearHistory: (): Promise<void> =>
    request('/api/chat/history', { method: 'DELETE' }),
};
