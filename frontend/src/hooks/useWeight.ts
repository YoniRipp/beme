import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { weightApi, type ApiWeightEntry } from '@/core/api/health';
import { queryKeys } from '@/lib/queryClient';

export function useWeight() {
  const queryClient = useQueryClient();

  const {
    data: weightEntries = [],
    isLoading: weightLoading,
    error: weightError,
  } = useQuery({
    queryKey: queryKeys.weightEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: () => weightApi.list(),
  });

  const addMutation = useMutation({
    mutationFn: (data: { date: string; weight: number; notes?: string }) => weightApi.add(data),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.weightEntries, (prev: ApiWeightEntry[] | undefined) => {
        if (!prev) return [created];
        const filtered = prev.filter((e) => e.date !== created.date);
        return [created, ...filtered].sort((a, b) => b.date.localeCompare(a.date));
      });
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
