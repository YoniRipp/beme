import { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WEIGHT_HISTORY_LIMIT, convertWeight } from '@trackvibe/shared/domain';
import { weightApi, type ApiWeightEntry } from '../core/api/health';
import { queryKeys } from '../lib/queryKeys';

/**
 * How many rows the weight card ever reads.
 *
 * The bound and the reasoning behind it now live in `packages/shared/src/domain/weight.ts`,
 * because the web reads the same rows to draw the same card and the two must not disagree.
 * Re-exported here so this module stays the one place the Expo weight code looks.
 *
 * This client bounded its read from day one; the web caught up separately, so the note that
 * used to sit here about the web being unbounded is gone rather than left to rot.
 */
export { WEIGHT_HISTORY_LIMIT };

/**
 * Weight entries, newest first. Mirrors `frontend/src/hooks/useWeight.ts` — same key, same
 * 2-minute `staleTime`, same `setQueryData` writes, same `latestWeight` accessor — except
 * for the bound above.
 */
export function useWeight() {
  const queryClient = useQueryClient();

  const {
    data: rawEntries = [],
    isLoading: weightLoading,
    error: weightQueryError,
  } = useQuery({
    queryKey: queryKeys.weightEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: () => weightApi.list({ limit: WEIGHT_HISTORY_LIMIT, offset: 0 }),
  });

  /**
   * Normalised to kilograms, once, here.
   *
   * The invariant this establishes: INSIDE the app a weight is always kilograms, and
   * conversion happens only at the two edges — the input, which tags what the user typed,
   * and the display, which converts through `displayWeight`. Every consumer of this hook
   * does arithmetic (trend, distance to target, the sparkline), and arithmetic across mixed
   * units is silently wrong rather than loudly wrong.
   *
   * A row with no `unit` was written before tagging and is read as kilograms, which is what
   * every consumer already did — so this changes the meaning of nothing already logged.
   */
  const weightEntries = useMemo(
    () =>
      rawEntries.map((e) => ({
        ...e,
        weight: convertWeight(e.weight, e.unit ?? 'kg', 'kg'),
        unit: 'kg' as const,
      })),
    [rawEntries]
  );

  const addMutation = useMutation({
    mutationFn: (data: { date: string; weight: number; notes?: string; unit?: 'kg' | 'lbs' }) =>
      weightApi.add(data),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.weightEntries, (prev: ApiWeightEntry[] | undefined) =>
        mergeEntry(prev, created)
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => weightApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.weightEntries, (prev: ApiWeightEntry[] | undefined) =>
        prev ? prev.filter((e) => e.id !== id) : []
      );
    },
  });

  const addWeight = useCallback(
    (data: { date: string; weight: number; notes?: string; unit?: 'kg' | 'lbs' }): Promise<void> =>
      addMutation.mutateAsync(data).then(() => undefined),
    [addMutation]
  );

  const deleteWeight = useCallback(
    (id: string): Promise<void> => deleteMutation.mutateAsync(id).then(() => undefined),
    [deleteMutation]
  );

  return {
    weightEntries,
    weightLoading,
    weightError: weightQueryError
      ? (weightQueryError instanceof Error ? weightQueryError.message : 'Could not load weight data.')
      : null,
    addWeight,
    deleteWeight,
    latestWeight: weightEntries.length > 0 ? weightEntries[0] : null,
  };
}

/**
 * One entry per date, newest first — the web's own cache write
 * (`frontend/src/hooks/useWeight.ts:22-26`). Re-logging today replaces today's row rather
 * than adding a second one, because the endpoint upserts by date and the list would
 * otherwise show the same day twice until the next refetch.
 *
 * The list stays capped at `WEIGHT_HISTORY_LIMIT` so a long session of edits cannot grow
 * the cached array past what the query itself would return.
 */
function mergeEntry(
  previous: ApiWeightEntry[] | undefined,
  created: ApiWeightEntry
): ApiWeightEntry[] {
  const withoutSameDate = (previous ?? []).filter((e) => e.date !== created.date);
  return [created, ...withoutSameDate]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, WEIGHT_HISTORY_LIMIT);
}
