import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { chatApi, type ChatMessage, type StreamAction, type PlanProposal } from '@/core/api/chat';

interface AgentMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actions?: StreamAction[];
  created_at: string;
}

export function useAgent() {
  const queryClient = useQueryClient();
  const [isSending, setIsSending] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [pendingUserMsg, setPendingUserMsg] = useState<AgentMessage | null>(null);
  const [pendingProposals, setPendingProposals] = useState<PlanProposal[]>([]);
  const [confirmingProposalId, setConfirmingProposalId] = useState<string | null>(null);

  const {
    data: historyData,
    isLoading: isLoadingHistory,
  } = useQuery({
    queryKey: ['chat', 'history'],
    queryFn: () => chatApi.getHistory(50),
    staleTime: 0,              // always re-fetch on mount
    refetchOnMount: true,
    refetchOnWindowFocus: true, // re-fetch when user returns to the app
  });

  const historyMessages: AgentMessage[] = (historyData?.messages ?? []).map((m: ChatMessage) => ({
    ...m,
    actions: undefined,
  }));

  // Append pending user message optimistically (if not already in history)
  const messages = pendingUserMsg && !historyMessages.some(m => m.id === pendingUserMsg.id)
    ? [...historyMessages, pendingUserMsg]
    : historyMessages;

  // Detect when the last message is a user message with no assistant reply
  // AND we're not currently streaming — means the backend may still be processing
  // (e.g. user closed the app mid-stream and the backend saved the response later)
  const hasPendingResponse = !isSending
    && messages.length > 0
    && messages[messages.length - 1].role === 'user';

  // Poll every 3s (up to 120s) while a pending response is expected
  useEffect(() => {
    if (!hasPendingResponse) return;
    let attempts = 0;
    const MAX_ATTEMPTS = 40; // 40 × 3s = 120s

    const poll = setInterval(() => {
      attempts++;
      queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
      if (attempts >= MAX_ATTEMPTS) clearInterval(poll);
    }, 3000);

    return () => clearInterval(poll);
  }, [hasPendingResponse, queryClient]);

  const sendMessage = useCallback(async (text: string): Promise<{ actions: StreamAction[] } | null> => {
    if (!text.trim() || isSending) return null;
    // Show user message optimistically
    const optimisticMsg: AgentMessage = {
      id: `pending-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      created_at: new Date().toISOString(),
    };
    setPendingUserMsg(optimisticMsg);
    setIsSending(true);
    setIsThinking(true);
    setStreamingContent('');

    return new Promise((resolve) => {
      let accumulated = '';
      let finalActions: StreamAction[] = [];

      chatApi.sendAgentMessageStream(
        text.trim(),
        (chunk) => {
          // First chunk means tool-calls are done, now streaming text
          setIsThinking(false);
          accumulated += chunk;
          setStreamingContent(accumulated);
        },
        () => {
          // Still processing tools
          setIsThinking(true);
        },
        async (actions) => {
          finalActions = actions;
          setIsSending(false);
          setStreamingContent('');
          setPendingUserMsg(null);
          // Refresh history and data
          await queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
          await queryClient.invalidateQueries({ queryKey: ['workouts'] });
          await queryClient.invalidateQueries({ queryKey: ['foodEntries'] });
          await queryClient.invalidateQueries({ queryKey: ['goals'] });
          await queryClient.invalidateQueries({ queryKey: ['weight'] });
          await queryClient.invalidateQueries({ queryKey: ['water'] });
          resolve({ actions: finalActions });
        },
        async (err) => {
          console.error('Stream error:', err);
          setIsSending(false);
          setIsThinking(false);
          setStreamingContent('');
          setPendingUserMsg(null);
          // Refresh history so the user's saved message shows even on error
          await queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
          resolve(null);
        },
        (proposal) => {
          setPendingProposals((prev) => [...prev, proposal]);
        },
      ).catch((err) => {
        console.error('Stream failed:', err);
        setIsSending(false);
        setIsThinking(false);
        setStreamingContent('');
        setPendingUserMsg(null);
        resolve(null);
      });
    });
  }, [isSending, queryClient]);

  const confirmProposal = useCallback(async (proposal: PlanProposal): Promise<StreamAction[] | null> => {
    setConfirmingProposalId(proposal.id);
    try {
      const { actions } = await chatApi.confirmPlan(proposal);
      setPendingProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      await queryClient.invalidateQueries({ queryKey: ['workouts'] });
      await queryClient.invalidateQueries({ queryKey: ['foodEntries'] });
      return actions;
    } catch (err) {
      console.error('Confirm plan failed:', err);
      return null;
    } finally {
      setConfirmingProposalId(null);
    }
  }, [queryClient]);

  const dismissProposal = useCallback((id: string) => {
    setPendingProposals((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearHistory = useCallback(async () => {
    await chatApi.clearHistory();
    await queryClient.invalidateQueries({ queryKey: ['chat', 'history'] });
  }, [queryClient]);

  return {
    messages,
    isLoadingHistory,
    isSending,
    isThinking,
    streamingContent,
    hasPendingResponse,
    pendingProposals,
    confirmingProposalId,
    sendMessage,
    clearHistory,
    confirmProposal,
    dismissProposal,
  };
}
