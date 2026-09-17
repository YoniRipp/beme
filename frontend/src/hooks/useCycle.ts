import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subDays } from 'date-fns';
import {
  CYCLE_WINDOW_DAYS,
  cycleDayFrom,
  toLocalDateString,
} from '@trackvibe/shared/domain';
import { cycleApi, type ApiCycleEntry } from '@/core/api/health';
import { queryKeys } from '@/lib/queryClient';

/**
 * Cycle entries within `CYCLE_WINDOW_DAYS`, newest first.
 *
 * This read used to be `cycleApi.list()` with no arguments. The endpoint takes a date window
 * and offers no pagination at all, so an unbounded call returns a user's entire cycle history
 * on every Home render — critical rule 6, and the same mistake `useWeight` carried.
 *
 * It also produced a visible nonsense. `currentCycleDay` counts from the newest period start
 * *in what was fetched*, so an account that logged once and stopped was told it was on
 * "Day 214 of ~28", with `CycleTracker`'s ring drawn full. Inside a window, a stale log simply
 * falls out of range and the card says there is no cycle data yet — the honest answer.
 */
export function useCycle(now: Date = new Date()) {
  const queryClient = useQueryClient();
  const endDate = toLocalDateString(now);
  const startDate = toLocalDateString(subDays(now, CYCLE_WINDOW_DAYS));

  const {
    data: cycleEntries = [],
    isLoading: cycleLoading,
  } = useQuery({
    queryKey: queryKeys.cycleEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: () => cycleApi.list(startDate, endDate),
  });

  const addMutation = useMutation({
    mutationFn: (data: { date: string; periodStart?: boolean; periodEnd?: boolean; flow?: string; symptoms?: string[]; notes?: string }) =>
      cycleApi.add(data),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.cycleEntries, (prev: ApiCycleEntry[] | undefined) => {
        if (!prev) return [created];
        const filtered = prev.filter((e) => e.date !== created.date);
        return [created, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
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
    (data: { date: string; periodStart?: boolean; periodEnd?: boolean; flow?: string; symptoms?: string[]; notes?: string }) =>
      addMutation.mutateAsync(data).then(() => undefined),
    [addMutation]
  );

  const deleteCycleEntry = useCallback(
    (id: string) => deleteMutation.mutateAsync(id).then(() => undefined),
    [deleteMutation]
  );

  const lastPeriodStart = useMemo(
    () => cycleEntries.find((entry) => entry.periodStart) ?? null,
    [cycleEntries]
  );

  return {
    cycleEntries,
    cycleLoading,
    addCycleEntry,
    deleteCycleEntry,
    currentCycleDay: cycleDayFrom(lastPeriodStart?.date ?? null, now),
    lastPeriodStart: lastPeriodStart?.date ?? null,
  };
}
