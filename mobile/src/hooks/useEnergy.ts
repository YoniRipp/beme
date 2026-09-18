import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DailyCheckIn, FoodEntry } from '../types/energy';
import { foodApi, dailyCheckInsApi } from '../core/api/food';
import { apiCheckInToDailyCheckIn, apiFoodEntryToFoodEntry } from '../features/energy/mappers';
import { queryKeys } from '../lib/queryKeys';
import { toLocalDateString } from '../lib/dateRanges';
import { type CachedList, updateCachedList } from '../lib/cachedList';

export function useEnergy() {
  const queryClient = useQueryClient();

  const checkInsQuery = useQuery({
    queryKey: queryKeys.checkIns,
    // Always explicit, per agent-os/standards/frontend/data-fetching.md, and 2 min to match
    // frontend/src/hooks/useEnergy.ts. These two inherited the 60s client default, so the
    // Goals screen mixed one-minute-old food data with five-minute-old goals.
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { items, truncated } = await dailyCheckInsApi.listAll();
      return { items: items.map(apiCheckInToDailyCheckIn), truncated };
    },
  });

  const foodEntriesQuery = useQuery({
    queryKey: queryKeys.foodEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const { items, truncated } = await foodApi.listAll();
      return { items: items.map(apiFoodEntryToFoodEntry), truncated };
    },
  });

  const checkIns = checkInsQuery.data?.items ?? [];
  const foodEntries = foodEntriesQuery.data?.items ?? [];
  // The pager stops at a bound (see packages/shared/src/api/pagination.ts) and says so. Both
  // flags are surfaced together because a screen mixing the two datasets is showing a partial
  // history if EITHER was cut short.
  const energyTruncated =
    (checkInsQuery.data?.truncated ?? false) || (foodEntriesQuery.data?.truncated ?? false);
  const energyLoading = checkInsQuery.isLoading || foodEntriesQuery.isLoading;
  const energyError =
    checkInsQuery.error
      ? (checkInsQuery.error instanceof Error ? checkInsQuery.error.message : 'Could not load check-ins.')
      : foodEntriesQuery.error
        ? (foodEntriesQuery.error instanceof Error ? foodEntriesQuery.error.message : 'Could not load food entries.')
        : null;

  const refetchEnergy = useCallback(async () => {
    await Promise.all([checkInsQuery.refetch(), foodEntriesQuery.refetch()]);
  }, [checkInsQuery, foodEntriesQuery]);

  const addCheckInMutation = useMutation({
    mutationFn: (checkIn: Omit<DailyCheckIn, 'id'>) =>
      dailyCheckInsApi.add({
        date: toLocalDateString(checkIn.date),
        sleepHours: checkIn.sleepHours,
      }),
    onSuccess: (created) => {
      updateCachedList<DailyCheckIn>(queryClient, queryKeys.checkIns, (prev) =>
        [...prev, apiCheckInToDailyCheckIn(created)]
      );
    },
  });

  const updateCheckInMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<DailyCheckIn> }) => {
      const body: Record<string, unknown> = {};
      if (updates.date !== undefined) body.date = toLocalDateString(updates.date);
      if (updates.sleepHours !== undefined) body.sleepHours = updates.sleepHours;
      return dailyCheckInsApi.update(id, body);
    },
    onSuccess: (updated) => {
      updateCachedList<DailyCheckIn>(queryClient, queryKeys.checkIns, (prev) =>
        prev.map((c) => (c.id === updated.id ? apiCheckInToDailyCheckIn(updated) : c))
      );
    },
  });

  const deleteCheckInMutation = useMutation({
    mutationFn: (id: string) => dailyCheckInsApi.delete(id),
    onSuccess: (_, id) => {
      updateCachedList<DailyCheckIn>(queryClient, queryKeys.checkIns, (prev) =>
        prev.filter((c) => c.id !== id)
      );
    },
  });

  const addFoodEntryMutation = useMutation({
    mutationFn: (entry: Omit<FoodEntry, 'id'>) =>
      foodApi.add({
        date: toLocalDateString(entry.date),
        name: entry.name,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        ...(entry.portionAmount != null && { portionAmount: entry.portionAmount }),
        ...(entry.portionUnit && { portionUnit: entry.portionUnit }),
        ...(entry.servingType && { servingType: entry.servingType }),
        ...(entry.startTime && { startTime: entry.startTime }),
        ...(entry.endTime && { endTime: entry.endTime }),
        ...(entry.mealType && { mealType: entry.mealType }),
      }),
    onSuccess: (created) => {
      updateCachedList<FoodEntry>(queryClient, queryKeys.foodEntries, (prev) =>
        [...prev, apiFoodEntryToFoodEntry(created)]
      );
    },
  });

  const updateFoodEntryMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<FoodEntry> }) => {
      const body: Record<string, unknown> = {};
      if (updates.date !== undefined) body.date = toLocalDateString(updates.date);
      if (updates.name !== undefined) body.name = updates.name;
      if (updates.calories !== undefined) body.calories = updates.calories;
      if (updates.protein !== undefined) body.protein = updates.protein;
      if (updates.carbs !== undefined) body.carbs = updates.carbs;
      if (updates.fats !== undefined) body.fats = updates.fats;
      if (updates.portionAmount !== undefined) body.portionAmount = updates.portionAmount;
      if (updates.portionUnit !== undefined) body.portionUnit = updates.portionUnit;
      if (updates.servingType !== undefined) body.servingType = updates.servingType;
      if (updates.startTime !== undefined) body.startTime = updates.startTime;
      if (updates.endTime !== undefined) body.endTime = updates.endTime;
      if (updates.mealType !== undefined) body.mealType = updates.mealType;
      return foodApi.update(id, body);
    },
    onSuccess: (updated) => {
      updateCachedList<FoodEntry>(queryClient, queryKeys.foodEntries, (prev) =>
        prev.map((e) => (e.id === updated.id ? apiFoodEntryToFoodEntry(updated) : e))
      );
    },
  });

  const deleteFoodEntryMutation = useMutation({
    mutationFn: (id: string) => foodApi.delete(id),
    onSuccess: (_, id) => {
      updateCachedList<FoodEntry>(queryClient, queryKeys.foodEntries, (prev) =>
        prev.filter((e) => e.id !== id)
      );
    },
  });

  const addCheckIn = useCallback(
    (checkIn: Omit<DailyCheckIn, 'id'>): Promise<void> =>
      addCheckInMutation.mutateAsync(checkIn).then(() => undefined),
    [addCheckInMutation]
  );
  const updateCheckIn = useCallback(
    (id: string, updates: Partial<DailyCheckIn>): Promise<void> =>
      updateCheckInMutation.mutateAsync({ id, updates }).then(() => undefined),
    [updateCheckInMutation]
  );
  const deleteCheckIn = useCallback(
    (id: string): Promise<void> =>
      deleteCheckInMutation.mutateAsync(id).then(() => undefined),
    [deleteCheckInMutation]
  );
  const addFoodEntry = useCallback(
    (entry: Omit<FoodEntry, 'id'>): Promise<void> =>
      addFoodEntryMutation.mutateAsync(entry).then(() => undefined),
    [addFoodEntryMutation]
  );
  const updateFoodEntry = useCallback(
    (id: string, updates: Partial<FoodEntry>): Promise<void> =>
      updateFoodEntryMutation.mutateAsync({ id, updates }).then(() => undefined),
    [updateFoodEntryMutation]
  );
  const deleteFoodEntry = useCallback(
    (id: string): Promise<void> =>
      deleteFoodEntryMutation.mutateAsync(id).then(() => undefined),
    [deleteFoodEntryMutation]
  );

  const getCheckInById = useCallback((id: string) => checkIns.find((c) => c.id === id), [checkIns]);
  const getCheckInByDate = useCallback(
    (date: Date) => checkIns.find((c) => c.date.toDateString() === date.toDateString()),
    [checkIns]
  );
  const getFoodEntryById = useCallback(
    (id: string) => foodEntries.find((e) => e.id === id),
    [foodEntries]
  );

  return {
    checkIns,
    foodEntries,
    energyLoading,
    energyError,
    energyTruncated,
    refetchEnergy,
    addCheckIn,
    updateCheckIn,
    deleteCheckIn,
    getCheckInById,
    getCheckInByDate,
    addFoodEntry,
    updateFoodEntry,
    deleteFoodEntry,
    getFoodEntryById,
  };
}
