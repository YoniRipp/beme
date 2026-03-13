import { request } from './client';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface ChatResponse {
  text: string;
  actions: Array<{ intent: string; success: boolean; message: string; [key: string]: unknown }>;
}

export type AgentResponse = ChatResponse;

export const chatApi = {
  sendMessage: (message: string): Promise<ChatResponse> =>
    request('/api/chat', { method: 'POST', body: { message }, timeoutMs: 60000 }),

  sendAgentMessage: (message: string): Promise<AgentResponse> =>
    request('/api/chat/agent', { method: 'POST', body: { message }, timeoutMs: 120000 }),

  getHistory: (limit = 30): Promise<{ messages: ChatMessage[] }> =>
    request(`/api/chat/history?limit=${limit}`),

  clearHistory: (): Promise<void> =>
    request('/api/chat/history', { method: 'DELETE' }),
};
