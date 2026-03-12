import { useQuery } from '@tanstack/react-query';
import { streakApi, type ApiStreak } from '@/core/api/health';
import { queryKeys } from '@/lib/queryClient';

export function useStreaks() {
  const {
    data: streaks = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.streaks,
    queryFn: () => streakApi.list(),
    staleTime: 5 * 60 * 1000,
  });

  const getStreak = (type: ApiStreak['type']) =>
    streaks.find((s) => s.type === type) ?? null;

  return {
    streaks,
    isLoading,
    error: error ? (error instanceof Error ? error.message : 'Could not load streaks') : null,
    getStreak,
    workoutStreak: getStreak('workout'),
    foodStreak: getStreak('food'),
    waterStreak: getStreak('water'),
  };
}
