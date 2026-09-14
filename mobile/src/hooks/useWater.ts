import { useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { waterApi, type ApiWaterEntry } from '../core/api/health';
import { queryKeys } from '../lib/queryKeys';
import { toLocalDateString } from '../lib/dateRanges';

/** Mirrors the backend's own conversion (backend/src/models/water.ts). */
export const ML_PER_GLASS = 250;

function todayStr(): string {
  return toLocalDateString(new Date());
}

/**
 * Today's water, mirroring `frontend/src/hooks/useWater.ts`: same key, same 30 s
 * `staleTime`, same `setQueryData` on every mutation, same out-of-order guard.
 *
 * THE GUARD IS NOT OPTIONAL HERE. `setGlasses` is fired from the most-tapped control in the
 * app, taps arrive faster than replies, and replies can land out of order — a slow response
 * for "3" must not overwrite a later "5". The web carries this (`useWater.ts:49,66,73`) and
 * a phone makes it MORE likely, not less: a tap is cheaper than a click and mobile networks
 * reorder more.
 */
export function useWater() {
  const queryClient = useQueryClient();
  const today = todayStr();
  const todayKey = queryKeys.waterToday(today);

  const { data: waterToday, isLoading: waterLoading, error: waterQueryError } = useQuery({
    queryKey: todayKey,
    staleTime: 30 * 1000,
    queryFn: () => waterApi.getToday(today),
  });

  const addGlassMutation = useMutation({
    mutationFn: () => waterApi.addGlass(today),
    onSuccess: (updated) => {
      queryClient.setQueryData(todayKey, updated);
    },
  });

  const removeGlassMutation = useMutation({
    mutationFn: () => waterApi.removeGlass(today),
    onSuccess: (updated) => {
      queryClient.setQueryData(todayKey, updated);
    },
  });

  // Only the newest request is allowed to write — see the docblock above.
  const latestSetRef = useRef(0);

  const setGlassesMutation = useMutation({
    mutationFn: (glasses: number) => waterApi.upsert({ date: today, glasses }),
    onMutate: async (glasses: number) => {
      await queryClient.cancelQueries({ queryKey: todayKey });
      const previous = queryClient.getQueryData<ApiWaterEntry>(todayKey);
      const requestId = ++latestSetRef.current;
      queryClient.setQueryData<ApiWaterEntry>(todayKey, (current) => ({
        ...(current ?? { date: today }),
        glasses,
        mlTotal: glasses * ML_PER_GLASS,
      }));
      return { previous, requestId };
    },
    onError: (_error, _glasses, context) => {
      // Only roll back if nothing newer has been optimistically applied since.
      if (context?.previous !== undefined && context.requestId === latestSetRef.current) {
        queryClient.setQueryData(todayKey, context.previous);
      }
    },
    onSuccess: (updated, _glasses, context) => {
      // The server response is authoritative, so no follow-up refetch is needed — and
      // invalidating here would add a GET to every tap on the most-tapped control.
      if (context?.requestId === latestSetRef.current) {
        queryClient.setQueryData(todayKey, updated);
      }
    },
  });

  const addGlass = useCallback(
    (): Promise<void> => addGlassMutation.mutateAsync().then(() => undefined),
    [addGlassMutation]
  );

  const removeGlass = useCallback(
    (): Promise<void> => removeGlassMutation.mutateAsync().then(() => undefined),
    [removeGlassMutation]
  );

  const setGlasses = useCallback(
    (glasses: number): Promise<void> =>
      setGlassesMutation.mutateAsync(Math.max(0, glasses)).then(() => undefined),
    [setGlassesMutation]
  );

  return {
    glasses: waterToday?.glasses ?? 0,
    mlTotal: waterToday?.mlTotal ?? 0,
    waterLoading,
    waterError: waterQueryError
      ? (waterQueryError instanceof Error ? waterQueryError.message : 'Could not load water.')
      : null,
    addGlass,
    removeGlass,
    setGlasses,
  };
}
