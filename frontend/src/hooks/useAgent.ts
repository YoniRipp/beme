import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi, type ChatMessage, type AgentResponse } from '@/core/api/chat';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: AgentResponse['actions'];
  created_at: string;
}

export function useAgent() {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);

  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['chat', 'history'],
    queryFn: () => chatApi.getHistory(50),
    staleTime: 30_000,
  });

  const messages: AgentMessage[] = (historyData?.messages ?? []).map((m: ChatMessage) => ({
    ...m,
    actions: undefined,
  }));

  const sendMessage = useCallback(async (text: string): Promise<AgentResponse | null> => {
    if (!text.trim() || isSending) return null;
    setIsSending(true);
    try {
      const result = await chatApi.sendAgentMessage(text.trim());
      // Invalidate history so it refreshes with the new messages
      await queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      // Also invalidate data queries since the agent may have modified data
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['foodEntries'] });
      await queryClient.invalidateQueries({ queryKey: ['goals'] });
      await queryClient.invalidateQueries({ queryKey: ['weight'] });
      await queryClient.invalidateQueries({ queryKey: ['water'] });
      return result;
    } finally {
      setIsSending(false);
    }
  }, [isSending, queryClient]);

  const clearHistory = useCallback(async () => {
    await chatApi.clearHistory();
    await queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
  }, [queryClient]);

  return {
    messages,
    isLoadingHistory,
    isSending,
    sendMessage,
    clearHistory,
  };
}
