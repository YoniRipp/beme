import { request, getApiBase, getToken } from './client';

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

export type StreamAction = { intent: string; success: boolean; message: string; [key: string]: unknown };

export interface ProposedWorkout {
  date?: string;
  title: string;
  type: 'strength' | 'cardio' | 'flexibility' | 'sports';
  durationMinutes?: number;
  notes?: string;
  exercises?: Array<{ name: string; sets: number; reps: number; weight?: number; notes?: string }>;
}

export interface ProposedFood {
  date?: string;
  food: string;
  amount?: number;
  unit?: string;
  startTime?: string;
  endTime?: string;
}

export interface PlanProposal {
  id: string;
  title: string;
  summary: string;
  workouts: ProposedWorkout[];
  foods: ProposedFood[];
}

export const chatApi = {
  sendMessage: (message: string): Promise<ChatResponse> =>
    request('/api/chat', { method: 'POST', body: { message }, timeoutMs: 60000 }),

  sendAgentMessage: (message: string): Promise<AgentResponse> =>
    request('/api/chat/agent', { method: 'POST', body: { message }, timeoutMs: 120000 }),

  async sendAgentMessageStream(
    message: string,
    onChunk: (text: string) => void,
    onThinking: () => void,
    onDone: (actions: StreamAction[], proposals: PlanProposal[]) => void,
    onError: (err: string) => void,
    onProposal?: (proposal: PlanProposal) => void,
  ): Promise<void> {
    const token = getToken();
    const res = await fetch(`${getApiBase()}/api/chat/agent/stream`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ message }),
    });

    if (!res.ok || !res.body) {
      onError('Failed to connect to AI service');
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let completed = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const data = JSON.parse(line.slice(6)) as {
            chunk?: string;
            thinking?: boolean;
            done?: boolean;
            actions?: StreamAction[];
            proposals?: PlanProposal[];
            proposal?: PlanProposal;
            error?: string;
          };
          if (data.chunk) onChunk(data.chunk);
          else if (data.thinking) onThinking();
          else if (data.proposal) onProposal?.(data.proposal);
          else if (data.done) { completed = true; onDone(data.actions ?? [], data.proposals ?? []); }
          else if (data.error) { completed = true; onError(data.error); }
        } catch {
          // ignore malformed lines
        }
      }
    }

    // Guard: if stream ended without a done/error event, surface the error
    if (!completed) {
      onError('Response was interrupted. Please try again.');
    }
  },

  getHistory: (limit = 30): Promise<{ messages: ChatMessage[] }> =>
    request(`/api/chat/history?limit=${limit}`),

  clearHistory: (): Promise<void> =>
    request('/api/chat/history', { method: 'DELETE' }),

  confirmPlan: (proposal: PlanProposal): Promise<{ actions: StreamAction[] }> =>
    request('/api/chat/agent/confirm-plan', { method: 'POST', body: { proposal }, timeoutMs: 60000 }),
};
