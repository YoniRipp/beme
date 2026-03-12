import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { MealPlanTemplate, MealPlanItem } from '@/types/mealPlan';
import { mealPlanApi } from '@/core/api/mealPlan';
import { queryKeys } from '@/lib/queryClient';

export function useMealPlans() {
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: queryKeys.mealPlans,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const result = await mealPlanApi.list();
      return result as MealPlanTemplate[];
    },
  });

  const templates = templatesQuery.data ?? [];
  const loading = templatesQuery.isLoading;
  const error = templatesQuery.error
    ? (templatesQuery.error instanceof Error ? templatesQuery.error.message : 'Could not load meal plans.')
    : null;

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string; items: Omit<MealPlanItem, 'id'>[] }) =>
      mealPlanApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; description?: string; items?: Omit<MealPlanItem, 'id'>[] } }) =>
      mealPlanApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.mealPlans });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => mealPlanApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.mealPlans, (prev: MealPlanTemplate[] | undefined) =>
        prev ? prev.filter((t) => t.id !== id) : [],
      );
    },
  });

  const applyMutation = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => mealPlanApi.applyToDay(id, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.foodEntries });
    },
  });

  const createTemplate = useCallback(
    (data: { name: string; description?: string; items: Omit<MealPlanItem, 'id'>[] }) =>
      createMutation.mutateAsync(data),
    [createMutation],
  );

  const updateTemplate = useCallback(
    (id: string, data: { name?: string; description?: string; items?: Omit<MealPlanItem, 'id'>[] }) =>
      updateMutation.mutateAsync({ id, data }),
    [updateMutation],
  );

  const deleteTemplate = useCallback(
    (id: string) => deleteMutation.mutateAsync(id),
    [deleteMutation],
  );

  const applyToDay = useCallback(
    (id: string, date: string) => applyMutation.mutateAsync({ id, date }),
    [applyMutation],
  );

  return {
    templates,
    loading,
    error,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyToDay,
    applyLoading: applyMutation.isPending,
    createLoading: createMutation.isPending,
  };
}
