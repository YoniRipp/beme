import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import {
  chatApi,
  chatErrorMessage,
  isQuotaExhausted,
  type ApiChatMessage,
  type ChatAction,
  type ChatSendResponse,
} from '../core/api/chat';
import { queryKeys } from '../lib/queryKeys';

/**
 * The AI coach conversation, as server state.
 *
 * Mirrors what `frontend/src/components/insights/AiChatPanel.tsx` does — a history query,
 * a send mutation, a clear mutation, and a re-read of whatever the agent just changed —
 * rather than `frontend/src/hooks/useAgent.ts`, which is the streaming variant. `useAgent`
 * is not the web's live behaviour: its only consumer, `ChatAgentPanel`, is not mounted
 * anywhere. `AiChatPanel` is what the Sparkles button in `Base44Layout` opens, and it is
 * what this matches.
 *
 * ONE AI CALL IS SPENT PER SEND AND NOWHERE ELSE, which on a 10-per-month allowance is a
 * correctness property rather than a nicety. What that rests on:
 *   - Only `POST /api/chat` sits behind `requireAiQuota`, the guard that debits. The two
 *     history routes are behind `requireAiAccess`, which reads `users.ai_calls_used` and
 *     spends nothing (`backend/src/services/aiQuota.ts`: `checkAiQuota` is a SELECT,
 *     `tryConsumeAiCall` is the UPDATE). Mounting this screen costs zero calls.
 *   - Every refetch trigger that could fire without the user asking is off below, and both
 *     the query and the mutation set `retry: false`. The client default is one retry
 *     (`lib/queryClient.ts`), which on a billed endpoint turns one failed send into two
 *     spent calls.
 *   - There is no polling. `useAgent` on the web polls history every 3s for up to two
 *     minutes whenever the last message is an unanswered user turn; that is free under
 *     `requireAiAccess` but it is 40 requests, and it exists to recover a dropped SSE
 *     stream this client does not open.
 *
 * There is no optimistic cache write, unlike `useGoals`/`useWorkouts`. The turn's user
 * message and the assistant's reply are both written server-side inside `sendMessage`, and
 * the ids and timestamps are the database's; inventing local rows for them would mean
 * reconciling two of everything the moment the refetch lands. The pending user message is
 * surfaced as `pendingMessage` instead, for the screen to render beside the list and drop
 * when the refetch brings back the real row.
 */

/**
 * Which cached reads a successful tool call invalidates.
 *
 * The intent strings are the `case` labels of `executeOne`
 * (`backend/src/services/voiceExecutor.ts`) — all 22 of them, checked against that switch
 * rather than copied from the web, which is missing two. `delete_workouts` (the bulk
 * clear, distinct from the singular `delete_workout`) and `update_profile` are both real
 * intents the agent can reach, and neither appears in `AiChatPanel`'s mapping, so on the
 * web "wipe my workout log" leaves the list on screen until something else refetches it.
 *
 * `checkIns` rather than a sleep key: mobile stores sleep on the daily check-in
 * (`dailyCheckInsApi`), the same as the web.
 */
const INTENT_INVALIDATIONS: Record<string, readonly QueryKey[]> = {
  add_workout: [queryKeys.workouts],
  edit_workout: [queryKeys.workouts],
  delete_workout: [queryKeys.workouts],
  delete_workouts: [queryKeys.workouts],
  add_food: [queryKeys.foodEntries],
  edit_food_entry: [queryKeys.foodEntries],
  delete_food_entry: [queryKeys.foodEntries],
  log_sleep: [queryKeys.checkIns],
  edit_check_in: [queryKeys.checkIns],
  delete_check_in: [queryKeys.checkIns],
  add_goal: [queryKeys.goals],
  edit_goal: [queryKeys.goals],
  delete_goal: [queryKeys.goals],
  log_weight: [queryKeys.weightEntries],
  edit_weight: [queryKeys.weightEntries],
  delete_weight: [queryKeys.weightEntries],
  // The prefix, not one day's key: the agent dates its own writes, and "add 3 glasses to
  // yesterday" must not leave yesterday's cached count on screen.
  add_water: [queryKeys.waterTodayAll],
  remove_water: [queryKeys.waterTodayAll],
  log_cycle: [queryKeys.cycleEntries],
  edit_cycle: [queryKeys.cycleEntries],
  delete_cycle: [queryKeys.cycleEntries],
  update_profile: [queryKeys.profile],
};

/**
 * Intents that move a streak, so Home's streak card is re-read after them. The web has no
 * equivalent line because it invalidates `['ai-insights']`/`['ai-today-recs']` instead —
 * two keys this client has no screen for — while `streaks` is on mobile's Home and is
 * computed from exactly these writes (`backend/src/services/streak.ts`).
 */
const STREAK_MOVING_INTENTS = new Set([
  'add_workout',
  'delete_workout',
  'delete_workouts',
  'add_food',
  'delete_food_entry',
  'log_sleep',
  'delete_check_in',
]);

/** Keys to re-read after a turn, deduplicated — one invalidate per key however many actions hit it. */
export function invalidationsFor(actions: ChatAction[]): QueryKey[] {
  const keys = new Map<string, QueryKey>();
  for (const action of actions) {
    if (!action.success) continue;
    for (const key of INTENT_INVALIDATIONS[action.intent] ?? []) {
      keys.set(JSON.stringify(key), key);
    }
    if (STREAK_MOVING_INTENTS.has(action.intent)) {
      keys.set(JSON.stringify(queryKeys.streaks), queryKeys.streaks);
    }
  }
  return [...keys.values()];
}

export interface UseChatResult {
  messages: ApiChatMessage[];
  historyLoading: boolean;
  /** The message currently in flight, for the optimistic bubble. Null when idle. */
  pendingMessage: string | null;
  sending: boolean;
  clearing: boolean;
  /**
   * The monthly AI allowance is spent — from a refused send, or from a refused history
   * read, which is refused by the same guard for the same reason. Its own flag rather than
   * an error string because the screen answers it differently: nothing here is retryable
   * until the calendar month turns over.
   */
  quotaExhausted: boolean;
  /** True when the quota is what stopped the transcript loading, so there is nothing to show. */
  historyUnavailable: boolean;
  /** Anything else that went wrong, already made readable. Null when there is nothing wrong. */
  chatError: string | null;
  sendMessage: (text: string) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export function useChat(): UseChatResult {
  const queryClient = useQueryClient();

  const {
    data,
    isLoading: historyLoading,
    error: historyError,
  } = useQuery({
    queryKey: queryKeys.chatHistory,
    queryFn: () => chatApi.getHistory(),
    // Nothing but this screen writes the conversation, and every write below invalidates
    // the key explicitly, so the client's 60s default is stated rather than shortened to
    // the web's 0 — that would re-read the whole backlog on every tab switch to buy
    // freshness against a writer that does not exist.
    staleTime: 60 * 1000,
    // Off deliberately, all three. See this module's docblock: the read is free, but an
    // automatic trigger on a screen where the neighbouring button costs 1/10 of a month's
    // allowance is a habit worth not having, and a retried 403 cannot succeed — the quota
    // does not refill between two requests a second apart.
    retry: false,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const sendMutation = useMutation({
    mutationFn: (text: string) => chatApi.send(text),
    // Explicit, though v5 mutations do not retry by default: this is the one billed call in
    // the app's chat path and the cost of getting the default wrong is a doubled bill.
    retry: false,
    onSuccess: async (response: ChatSendResponse) => {
      // The history read is what puts both halves of the turn on screen — the reply body is
      // already in `response`, but the user's own message only exists server-side.
      await queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory });
      for (const key of invalidationsFor(response.actions ?? [])) {
        void queryClient.invalidateQueries({ queryKey: key });
      }
    },
  });

  const clearMutation = useMutation({
    mutationFn: () => chatApi.clearHistory(),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.chatHistory }),
  });

  const sendMessage = useCallback(
    async (text: string): Promise<void> => {
      const trimmed = text.trim();
      if (!trimmed) return;
      // `mutateAsync` rejects on failure and the caller is a tap handler, so the rejection
      // is swallowed here: the mutation's own `error` is what the screen renders, and an
      // unhandled rejection from a press would be a red box over a screen that has already
      // reported the problem in words.
      await sendMutation.mutateAsync(trimmed).catch(() => undefined);
    },
    [sendMutation],
  );

  const clearHistory = useCallback(
    async (): Promise<void> => {
      await clearMutation.mutateAsync().catch(() => undefined);
    },
    [clearMutation],
  );

  // Send failures first: a send is something the user just did and is waiting on, where a
  // stale history error is about a read that has since been superseded.
  const failure = sendMutation.error ?? clearMutation.error ?? historyError;
  const quotaExhausted = isQuotaExhausted(failure);

  return {
    messages: data?.messages ?? [],
    historyLoading,
    pendingMessage: sendMutation.isPending ? (sendMutation.variables ?? null) : null,
    sending: sendMutation.isPending,
    clearing: clearMutation.isPending,
    quotaExhausted,
    historyUnavailable: isQuotaExhausted(historyError),
    // The quota is reported by the screen's own panel, not as a one-line error, so it is
    // excluded here rather than rendered twice in two different voices.
    chatError:
      failure && !quotaExhausted
        ? chatErrorMessage(failure, 'Failed to send message. Please try again.')
        : null,
    sendMessage,
    clearHistory,
  };
}
