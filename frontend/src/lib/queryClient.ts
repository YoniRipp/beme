import { QueryClient } from '@tanstack/react-query';
import { isUnauthorized } from '@/core/api/client';

/**
 * One retry for anything that might be transient, none for a 401.
 *
 * By the time a 401 surfaces here `request` has already dropped the token, retried once
 * against the cookie, and dispatched `auth:logout` -- the session is gone, and asking again
 * only spends another round-trip to be told so a second time. On the Capacitor build that
 * round-trip is the user's mobile data.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return !isUnauthorized(error) && failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // Per-query overrides (e.g. GoalsContext) can extend for low-churn data
      retry: shouldRetry,
    },
  },
});

export const queryKeys = {
  goals: ['goals'] as const,
  workouts: ['workouts'] as const,
  exercises: ['exercises'] as const,
  checkIns: ['checkIns'] as const,
  foodEntries: ['foodEntries'] as const,
  profile: ['profile'] as const,
  weightEntries: ['weightEntries'] as const,
  waterToday: (date: string) => ['waterToday', date] as const,
  waterTodayAll: ['waterToday'] as const, // prefix for invalidating every date
  waterHistory: ['waterHistory'] as const,
  cycleEntries: ['cycleEntries'] as const,
  streaks: ['streaks'] as const,
};
