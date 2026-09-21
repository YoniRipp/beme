/**
 * Every query key this client uses, in one place — never inlined at a call site
 * (`agent-os/standards/frontend/data-fetching.md`).
 *
 * The names mirror the web's registry (`frontend/src/lib/queryClient.ts`) key for key, so
 * the two clients cache the same read under the same name and a reader comparing them does
 * not have to translate. The web's `waterHistory` has no counterpart here on purpose: Expo
 * has no water-history screen, and an unused key is just a name to keep in sync for nothing.
 */
export const queryKeys = {
  goals: ['goals'] as const,
  workouts: ['workouts'] as const,
  checkIns: ['checkIns'] as const,
  foodEntries: ['foodEntries'] as const,
  // Matches the web's key exactly (frontend/src/lib/queryClient.ts) so the two clients
  // cache the same single-row read under the same name.
  profile: ['profile'] as const,
  weightEntries: ['weightEntries'] as const,
  /** Parameterised by LOCAL calendar day — a UTC slice is the previous day east of UTC. */
  waterToday: (date: string) => ['waterToday', date] as const,
  /** Prefix for invalidating every day's water at once, e.g. across a midnight rollover. */
  waterTodayAll: ['waterToday'] as const,
  cycleEntries: ['cycleEntries'] as const,
  streaks: ['streaks'] as const,
  /**
   * The three AI Insights reads. The string values match what the web uses so the two clients
   * still name the same read the same thing — but note the web **inlines** these at the call
   * site (`frontend/src/components/insights/AiInsightsSection.tsx`) rather than registering
   * them here, which is the one thing `data-fetching.md` says not to do. Mirrored by value,
   * not by that habit.
   *
   * `aiInsights` is parameterised because the backend caches a separate `ai_insights` row per
   * `period_days` (`services/insights.ts:ALL_PERIODS`), and because each period costs its own
   * AI call to fetch — keeping them in separate cache entries is what stops a period switch
   * from spending one again on the way back.
   */
  aiInsights: (days: number) => ['ai-insights', days] as const,
  /** Prefix, for touching every period at once after a regeneration. */
  aiInsightsAll: ['ai-insights'] as const,
  aiToday: ['ai-today-recs'] as const,
  aiFreshness: ['ai-insights-freshness'] as const,
};
