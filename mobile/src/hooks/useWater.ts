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

/** Applies a ±1 glass change to whatever is cached, clamped the way the SQL clamps it. */
export function applyGlassDelta(
  current: ApiWaterEntry | undefined,
  delta: number,
  date: string
): ApiWaterEntry {
  const glasses = Math.max(0, (current?.glasses ?? 0) + delta);
  return { ...(current ?? { date }), glasses, mlTotal: glasses * ML_PER_GLASS };
}

/**
 * Today's water. Mirrors `frontend/src/hooks/useWater.ts` — same key, same 30 s `staleTime`,
 * same `setQueryData` on every mutation — with the out-of-order guard moved onto the two
 * mutations Expo actually ships.
 *
 * WHY THE GUARD MOVED. The web carries it on `setGlasses` (`useWater.ts:49,66,73`) because
 * its `/water` page has a tap-the-Nth-glass control. Expo has no water screen; the only
 * controls are the card's `+` and `−`, so a guard on `setGlasses` here would have protected
 * a code path with no caller while the shipped one had none. Three quick taps on "Add glass"
 * fire three POSTs, and if the first reply lands last, an unguarded `onSuccess` paints "1"
 * over a server that is already at 3 — and the user, seeing the count go backwards, taps
 * again and over-counts.
 *
 * THE OPTIMISTIC WRITE IS A DELTA, not a snapshot-and-restore. Deltas compose: three taps in
 * flight at once each add one, and a failure subtracts its own one back without discarding
 * the other two. A `previous`-snapshot rollback (which is what an absolute set can do,
 * because there is only ever one correct value) would undo the taps that succeeded.
 *
 * The endpoints stay the relative ones. `POST /add-glass` is
 * `glasses = water_entries.glasses + 1` in SQL (`backend/src/models/water.ts:73`), so the
 * server's count is right however the requests interleave; `PUT /water-entries` is absolute
 * and would make concurrent taps last-write-wins on the server as well as in the cache.
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

  /**
   * The newest write wins. Shared by both mutations on purpose: they change the same number,
   * so a per-mutation counter would let a slow `−` reply overwrite a later `+`.
   */
  const latestWriteRef = useRef(0);

  const mutateGlasses = (delta: number, send: () => Promise<ApiWaterEntry>) => ({
    mutationFn: send,
    onMutate: async () => {
      // Stops an in-flight GET from landing on top of the optimistic value.
      await queryClient.cancelQueries({ queryKey: todayKey });
      const requestId = ++latestWriteRef.current;
      queryClient.setQueryData<ApiWaterEntry>(todayKey, (current) =>
        applyGlassDelta(current, delta, today)
      );
      return { requestId };
    },
    onError: () => {
      // Undo this request's own delta, leaving any other in-flight taps intact.
      queryClient.setQueryData<ApiWaterEntry>(todayKey, (current) =>
        applyGlassDelta(current, -delta, today)
      );
    },
    onSuccess: (updated: ApiWaterEntry, _vars: void, context: { requestId: number } | undefined) => {
      // The server response is authoritative, so no follow-up refetch is needed — and
      // invalidating here would add a GET to every tap on the most-tapped control. Only the
      // newest request may write it; an older reply is a stale count by definition.
      if (context?.requestId === latestWriteRef.current) {
        queryClient.setQueryData(todayKey, updated);
      }
    },
  });

  const addGlassMutation = useMutation(mutateGlasses(1, () => waterApi.addGlass(today)));
  const removeGlassMutation = useMutation(mutateGlasses(-1, () => waterApi.removeGlass(today)));

  const addGlass = useCallback(
    (): Promise<void> => addGlassMutation.mutateAsync().then(() => undefined),
    [addGlassMutation]
  );

  const removeGlass = useCallback(
    (): Promise<void> => removeGlassMutation.mutateAsync().then(() => undefined),
    [removeGlassMutation]
  );

  return {
    glasses: waterToday?.glasses ?? 0,
    mlTotal: waterToday?.mlTotal ?? 0,
    /** True only for the first read. Mutations do not gate the controls — see `WaterCard`. */
    waterLoading,
    waterError: waterQueryError
      ? (waterQueryError instanceof Error ? waterQueryError.message : 'Could not load water.')
      : null,
    addGlass,
    removeGlass,
  };
}
