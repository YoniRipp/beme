import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { differenceInCalendarDays, subDays } from 'date-fns';
import { cycleApi, type ApiCycleEntry, type CycleEntryInput } from '../core/api/health';
import { queryKeys } from '../lib/queryKeys';
import { toLocalDateString, parseLocalDateString } from '../lib/dateRanges';

/**
 * How far back the cycle card looks.
 *
 * `backend/src/models/cycle.ts:35` takes a date window but no pagination, so a window is the
 * only bound available. 180 days is roughly six cycles at the 28-day default — long enough
 * that a real gap in logging still finds the last period start, short enough to stay bounded
 * for an account that has logged for years.
 *
 * It also fixes a nonsense the web has: `frontend/src/hooks/useCycle.ts` reads everything and
 * computes `currentCycleDay` from whatever the oldest-surviving period start is, so an
 * account that logged once and stopped is told it is on "Day 214 of ~28". Outside the window
 * the card says "no cycle data yet", which is the honest answer.
 */
export const CYCLE_WINDOW_DAYS = 180;

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

/**
 * Which day of the cycle today is, counting the period-start day as day 1.
 *
 * CALENDAR days, not elapsed 24-hour blocks. The web divides a millisecond difference by
 * 86_400_000 (`frontend/src/hooks/useCycle.ts:53`), which is off by one across a daylight-
 * saving boundary — the 23-hour day floors down and the whole count shifts. It also parses
 * the API's `YYYY-MM-DD` with `new Date(...)`, which reads a bare date string as UTC
 * midnight and lands on the previous local day west of UTC. `parseLocalDateString` is the
 * repo's answer to both (`packages/shared/src/domain/dates.ts`).
 */
export function cycleDayFrom(periodStartDate: string | null, now: Date): number | null {
  if (!periodStartDate) return null;
  const start = parseLocalDateString(periodStartDate);
  if (Number.isNaN(start.getTime())) return null;
  const day = differenceInCalendarDays(now, start) + 1;
  return day >= 1 ? day : null;
}
