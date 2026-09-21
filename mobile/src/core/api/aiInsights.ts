import { request } from './client';

/**
 * The AI Insights slice — the Gemini-backed half of the Insights screen.
 *
 * Transcribed from `frontend/src/core/api/aiInsights.ts` so the two clients call the same
 * endpoints with the same parameters. Nothing here is a new endpoint: all four are mounted in
 * `backend/src/routes/insights.ts` and the web already consumes them. Expo could not show a
 * wellness score, a summary or a recommendation for one mechanical reason — this file did not
 * exist.
 *
 * **EVERY CALL BELOW EXCEPT `getFreshness` SPENDS ONE OF THE USER'S AI CALLS.** That is not a
 * detail to discover later, so it is the first thing this file says. `backend/src/routes/
 * insights.ts` puts `requireAiQuota` on `/api/insights`, `/api/insights/refresh` and
 * `/api/insights/today`, and `requireAiQuota` debits a call in the middleware, *before* the
 * handler runs (`backend/src/middleware/aiAccess.ts` -> `services/aiQuota.ts:tryConsumeAiCall`).
 * The allowance is `AI_MONTHLY_LIMIT`, which defaults to **10 per calendar month** and is shared
 * with chat, voice and food search. Three consequences this client has to live with:
 *
 *   1. A debit happens even when the server then serves a 24-hour-old cached row — the
 *      controller's own docblock calls that out as a known overcharge it cannot fix in
 *      isolation. So a cache hit is free for Gemini and not free for the user.
 *   2. A debit happens even when the handler goes on to fail. **Never retry one of these on
 *      failure** — the retry is a second debit. `useAiInsights` sets `retry: false` for exactly
 *      this reason, against the client-wide default of one retry (`lib/queryClient.ts`).
 *   3. Anything that fans out multiplies the bill. The web prefetches the three periods the
 *      user did not pick (`AiInsightsSection.tsx`), so one visit there costs five calls of the
 *      ten. `useAiInsights` deliberately does not copy that; see its docblock.
 *
 * `getFreshness` is the one free read: `/freshness` is two SELECTs and a timestamp compare, so
 * it is behind `requireAiAccess`, whose `checkAiQuota` is a single SELECT and debits nothing
 * (`services/aiQuota.ts:94`). That is what makes "are these insights stale?" a question worth
 * asking on every screen open, and why this client asks it instead of refreshing on a timer.
 *
 * It is also how the UI learns the user is out of calls **without spending one**: entitlement
 * is still checked, so an exhausted account gets the same `403 free_quota_exhausted` from this
 * free endpoint that it would from a paid one. The screen can say so before offering a button
 * that cannot work.
 *
 * **Not ported, deliberately.** The web's AI section also has a chat panel (`AiChatPanel`, on
 * `/api/chat`) and a semantic search box (`POST /api/search`). Both are their own surfaces with
 * their own endpoints rather than part of the insights read, this client has no chat screen to
 * open, and neither was in scope here. They are absent, not forgotten.
 */

export interface AiInsights {
  /**
   * 2–3 sentences of narrative. Can legitimately be an empty string: the cached read returns
   * the `summary` column verbatim (`services/insights.ts:getOrGenerateInsights`) and
   * `saveInsight` writes `data.summary ?? ''`, so a row saved from a partial generation has
   * one. Callers must not assume a non-empty string — the web's
   * `data.summary.replace(...)` would throw on a null column.
   */
  summary: string;
  highlights: string[];
  suggestions: string[];
  /** 0–100. Clamped and rounded server-side when generated; `Number(column)` when cached. */
  score: number;
}

export interface TodayRecommendations {
  workout: string;
  sleep: string;
  nutrition: string;
  focus: string;
}

/**
 * The response of `GET /api/insights/freshness`, read off
 * `backend/src/controllers/insights.ts:getFreshness` rather than guessed.
 *
 * Both timestamps are `null` for an account with nothing in the relevant table. `needsRefresh`
 * is the server's own comparison — `!lastInsightAt || lastActivityAt > lastInsightAt` — so a
 * user who has never had an insight generated reads as needing one, which is correct and is
 * why a client must not re-derive this from the two dates.
 */
export interface InsightsFreshness {
  lastActivityAt: string | null;
  lastInsightAt: string | null;
  needsRefresh: boolean;
}

/**
 * The periods the backend caches a separate `ai_insights` row for
 * (`services/insights.ts:ALL_PERIODS`). Asking for anything else is not an error — the
 * controller clamps `days` to 1..365 — but it would miss every cached row and force a
 * generation, so the selector offers these four and nothing else.
 */
export const INSIGHT_PERIODS = [7, 14, 30, 90] as const;

export type InsightPeriod = (typeof INSIGHT_PERIODS)[number];

/** What the web's selector opens on, and what the backend defaults `days` to. */
export const DEFAULT_INSIGHT_PERIOD: InsightPeriod = 30;

export const aiInsightsApi = {
  /** Costs one AI call. Serves a cached row when one is under 24 hours old — and still costs one. */
  getInsights: (days: InsightPeriod = DEFAULT_INSIGHT_PERIOD) =>
    request<AiInsights>(`/api/insights?days=${days}`),

  /**
   * Costs one AI call. Force-regenerates, except that the server short-circuits to the cached
   * row when `hasNewActivitySinceLastInsight` is false — in which case the body carries an
   * extra `cached: true` that `AiInsights` does not model, because nothing renders it.
   *
   * On a real regeneration this also refreshes the other three periods in the background
   * (`refreshAllPeriods`), which is why a refresh is worth its one call rather than four.
   */
  refreshInsights: (days: InsightPeriod = DEFAULT_INSIGHT_PERIOD) =>
    request<AiInsights>(`/api/insights/refresh?days=${days}`, { method: 'POST' }),

  /**
   * Costs one AI call. Takes no period: the handler calls `getOrGenerateInsights` with the
   * default 30 days and returns only the `today` half.
   */
  getTodayRecommendations: () => request<TodayRecommendations>('/api/insights/today'),

  /** The free one — entitlement-checked (`requireAiAccess`), never debited. */
  getFreshness: () => request<InsightsFreshness>('/api/insights/freshness'),
};
