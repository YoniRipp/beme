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
   * The AI coach conversation. The one key here with no line to mirror in the web's
   * registry — `AiChatPanel` inlines `['chat-history']` at the `useQuery` call instead of
   * registering it, which is the thing `frontend/data-fetching.md` tells both clients not
   * to do. Named in this file rather than copying the inline, and spelled in this
   * registry's camelCase so it reads with its neighbours.
   */
  chatHistory: ['chatHistory'] as const,
};
