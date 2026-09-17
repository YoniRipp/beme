import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { WEIGHT_HISTORY_LIMIT } from '@trackvibe/shared/domain';
import { weightApi, type ApiWeightEntry } from '@/core/api/health';
import { queryKeys } from '@/lib/queryClient';

/**
 * Weight entries, newest first, bounded to `WEIGHT_HISTORY_LIMIT` rows.
 *
 * This read used to be `weightApi.list()` with no arguments, which returned a user's whole
 * weight history on every Home render to draw a seven-bar sparkline — critical rule 6. The
 * endpoint has always accepted the bound; the client simply never sent it.
 */
export function useWeight() {
  const queryClient = useQueryClient();

  const {
    data: weightEntries = [],
    isLoading: weightLoading,
    error: weightError,
  } = useQuery({
    queryKey: queryKeys.weightEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: () => weightApi.list({ limit: WEIGHT_HISTORY_LIMIT, offset: 0 }),
  });

  const addMutation = useMutation({
    mutationFn: (data: { date: string; weight: number; notes?: string }) => weightApi.add(data),
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
    (data: { date: string; weight: number; notes?: string }) => addMutation.mutateAsync(data).then(() => undefined),
    [addMutation]
  );

  const deleteWeight = useCallback(
    (id: string) => deleteMutation.mutateAsync(id).then(() => undefined),
    [deleteMutation]
  );

  const latestWeight = weightEntries.length > 0 ? weightEntries[0] : null;

  return {
    weightEntries,
    weightLoading,
    weightError: weightError ? (weightError instanceof Error ? weightError.message : 'Could not load weight data') : null,
    addWeight,
    deleteWeight,
    latestWeight,
  };
}

/**
 * One entry per date, newest first. Re-logging today replaces today's row rather than adding
 * a second one, because the endpoint upserts by date and the list would otherwise show the
 * same day twice until the next refetch.
 *
 * Capped at `WEIGHT_HISTORY_LIMIT` so a long session of edits cannot grow the cached array
 * past what the query itself would return — bounding the fetch and then letting the cache
 * grow without limit would give back part of what the bound is for.
 *
 * Mirrors `mobile/src/hooks/useWeight.ts`, deliberately: same merge, same cap.
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
