import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import { cycleApi, type ApiCycleEntry, type CycleEntryInput } from '../core/api/health';
import { queryKeys } from '../lib/queryKeys';
import { toLocalDateString } from '../lib/dateRanges';
import { CYCLE_WINDOW_DAYS, cycleDayFrom } from '@trackvibe/shared/domain';

/**
 * The window and the day arithmetic now live in `packages/shared/src/domain/cycle.ts`: the
 * web reads the same endpoint to draw the same card, and the reasoning that used to sit here
 * was written for both clients, which is a sign it belonged in neither.
 */
export { CYCLE_WINDOW_DAYS, cycleDayFrom };

/**
 * Cycle entries within the window, newest first. Mirrors `frontend/src/hooks/useCycle.ts` —
 * same key, same 2-minute `staleTime`, same `setQueryData` writes, same `currentCycleDay`
 * derivation — except for the window and the calendar-day arithmetic below.
 */
export function useCycle(now: Date = new Date()) {
  const queryClient = useQueryClient();
  const endDate = toLocalDateString(now);
  const startDate = toLocalDateString(subDays(now, CYCLE_WINDOW_DAYS));

  const {
    data: cycleEntries = [],
    isLoading: cycleLoading,
    error: cycleQueryError,
  } = useQuery({
    queryKey: queryKeys.cycleEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: () => cycleApi.list(startDate, endDate),
  });

  const addMutation = useMutation({
    mutationFn: (data: CycleEntryInput) => cycleApi.add(data),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.cycleEntries, (prev: ApiCycleEntry[] | undefined) => {
        const withoutSameDate = (prev ?? []).filter((e) => e.date !== created.date);
        return [created, ...withoutSameDate].sort((a, b) => b.date.localeCompare(a.date));
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => cycleApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.cycleEntries, (prev: ApiCycleEntry[] | undefined) =>
        prev ? prev.filter((e) => e.id !== id) : []
      );
    },
  });

  const addCycleEntry = useCallback(
    (data: CycleEntryInput): Promise<void> => addMutation.mutateAsync(data).then(() => undefined),
    [addMutation]
  );

  const deleteCycleEntry = useCallback(
    (id: string): Promise<void> => deleteMutation.mutateAsync(id).then(() => undefined),
    [deleteMutation]
  );

  const lastPeriodStart = useMemo(
    () => cycleEntries.find((e) => e.periodStart) ?? null,
    [cycleEntries]
  );

  return {
    cycleEntries,
    cycleLoading,
    cycleError: cycleQueryError
      ? (cycleQueryError instanceof Error ? cycleQueryError.message : 'Could not load cycle data.')
      : null,
    addCycleEntry,
    deleteCycleEntry,
    currentCycleDay: cycleDayFrom(lastPeriodStart?.date ?? null, now),
    lastPeriodStart: lastPeriodStart?.date ?? null,
  };
}


