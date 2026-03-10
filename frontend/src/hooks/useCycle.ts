import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cycleApi, type ApiCycleEntry } from '@/core/api/health';
import { queryKeys } from '@/lib/queryClient';

export function useCycle() {
  const queryClient = useQueryClient();

  const {
    data: cycleEntries = [],
    isLoading: cycleLoading,
  } = useQuery({
    queryKey: queryKeys.cycleEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: () => cycleApi.list(),
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

  // Calculate current cycle day
  const lastPeriodStart = cycleEntries.find((e) => e.periodStart);
  const currentCycleDay = lastPeriodStart
    ? Math.floor((Date.now() - new Date(lastPeriodStart.date).getTime()) / (1000 * 60 * 60 * 24)) + 1
    : null;

  return {
    cycleEntries,
    cycleLoading,
    addCycleEntry,
    deleteCycleEntry,
    currentCycleDay,
    lastPeriodStart: lastPeriodStart?.date ?? null,
  };
}
