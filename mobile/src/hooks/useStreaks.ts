import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { streakApi, type ApiStreak } from '../core/api/health';
import { queryKeys } from '../lib/queryKeys';

/**
 * The user's streaks — one request, naturally bounded to one row per streak type
 * (`backend/src/models/streak.ts:24`), so no window is needed or possible.
 *
 * Mirrors `frontend/src/hooks/useStreaks.ts`: same key, same 5-minute `staleTime`, same
 * three named accessors the card reads.
 */
export function useStreaks() {
  const {
    data: streaks = [],
    isLoading: streaksLoading,
    error: streaksQueryError,
  } = useQuery({
    queryKey: queryKeys.streaks,
    staleTime: 5 * 60 * 1000,
    queryFn: () => streakApi.list(),
  });

  const getStreak = useCallback(
    (type: ApiStreak['type']) => streaks.find((s) => s.type === type) ?? null,
    [streaks]
  );

  return {
    streaks,
    streaksLoading,
    streaksError: streaksQueryError
      ? (streaksQueryError instanceof Error ? streaksQueryError.message : 'Could not load streaks.')
      : null,
    getStreak,
    workoutStreak: getStreak('workout'),
    foodStreak: getStreak('food'),
    waterStreak: getStreak('water'),
  };
}
