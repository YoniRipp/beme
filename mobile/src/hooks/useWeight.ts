import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weightApi, type ApiWeightEntry } from '../core/api/health';
import { queryKeys } from '../lib/queryKeys';

/**
 * How many rows the weight card ever reads.
 *
 * The card draws a seven-bar sparkline and one latest reading; 30 gives that headroom
 * without ever growing. The web asks for no bound at all
 * (`frontend/src/hooks/useWeight.ts:16` — `weightApi.list()`), so it pulls a user's whole
 * weight history on every Home render to draw those seven bars. That is critical rule 6,
 * and this client does not copy it.
 *
 * A LIMIT rather than a date window, deliberately: the model orders `date DESC`
 * (`backend/src/models/weight.ts:47`), so a limit is "the N most recent" and always contains
 * the latest reading. A 90-day window would show "No weight logged yet" to someone whose
 * last weigh-in was in the spring — which is not what the card means.
 */
export const WEIGHT_HISTORY_LIMIT = 30;

/**
 * Weight entries, newest first. Mirrors `frontend/src/hooks/useWeight.ts` — same key, same
 * 2-minute `staleTime`, same `setQueryData` writes, same `latestWeight` accessor — except
 * for the bound above.
 */
export function useWeight() {
  const queryClient = useQueryClient();

  const {
    data: weightEntries = [],
    isLoading: weightLoading,
    error: weightQueryError,
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
    (data: { date: string; weight: number; notes?: string }): Promise<void> =>
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
