import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryClient';

/**
 * Invalidate all core domain data queries after voice/AI actions.
 * Runs invalidations in parallel for performance.
 */
export function invalidateAllData(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.workouts }),
    queryClient.invalidateQueries({ queryKey: queryKeys.foodEntries }),
    queryClient.invalidateQueries({ queryKey: queryKeys.checkIns }),
    queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
  ]);
}
