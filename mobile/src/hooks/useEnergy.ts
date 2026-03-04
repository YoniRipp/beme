import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DailyCheckIn, FoodEntry } from '../types/energy';
import { foodEntriesApi, dailyCheckInsApi } from '../core/api/food';
import { apiCheckInToDailyCheckIn, apiFoodEntryToFoodEntry } from '../features/energy/mappers';
import { queryKeys } from '../lib/queryKeys';
import { toLocalDateString } from '../lib/dateRanges';

export function useEnergy() {
  const queryClient = useQueryClient();

  const checkInsQuery = useQuery({
    queryKey: queryKeys.checkIns,
    queryFn: async () => {
      const list = await dailyCheckInsApi.list();
      return list.map(apiCheckInToDailyCheckIn);
    },
  });

  const foodEntriesQuery = useQuery({
    queryKey: queryKeys.foodEntries,
    queryFn: async () => {
      const list = await foodEntriesApi.list();
      return list.map(apiFoodEntryToFoodEntry);
    },
  });

  const checkIns = checkInsQuery.data ?? [];
  const foodEntries = foodEntriesQuery.data ?? [];
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
      queryClient.setQueryData(queryKeys.checkIns, (prev: DailyCheckIn[] | undefined) =>
        prev ? [...prev, apiCheckInToDailyCheckIn(created)] : [apiCheckInToDailyCheckIn(created)]
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
      queryClient.setQueryData(queryKeys.checkIns, (prev: DailyCheckIn[] | undefined) =>
        prev ? prev.map((c) => (c.id === updated.id ? apiCheckInToDailyCheckIn(updated) : c)) : [apiCheckInToDailyCheckIn(updated)]
      );
    },
  });

  const deleteCheckInMutation = useMutation({
    mutationFn: (id: string) => dailyCheckInsApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.checkIns, (prev: DailyCheckIn[] | undefined) =>
        prev ? prev.filter((c) => c.id !== id) : []
      );
    },
  });

  const addFoodEntryMutation = useMutation({
    mutationFn: (entry: Omit<FoodEntry, 'id'>) =>
      foodEntriesApi.add({
        date: toLocalDateString(entry.date),
        name: entry.name,
        calories: entry.calories,
        protein: entry.protein,
        carbs: entry.carbs,
        fats: entry.fats,
        ...(entry.portionAmount != null && { portionAmount: entry.portionAmount }),
        ...(entry.portionUnit && { portionUnit: entry.portionUnit }),
        ...(entry.servingType && { servingType: entry.servingType }),
      }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.foodEntries, (prev: FoodEntry[] | undefined) =>
        prev ? [...prev, apiFoodEntryToFoodEntry(created)] : [apiFoodEntryToFoodEntry(created)]
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
      return foodEntriesApi.update(id, body);
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKeys.foodEntries, (prev: FoodEntry[] | undefined) =>
        prev ? prev.map((e) => (e.id === updated.id ? apiFoodEntryToFoodEntry(updated) : e)) : [apiFoodEntryToFoodEntry(updated)]
      );
    },
  });

  const deleteFoodEntryMutation = useMutation({
    mutationFn: (id: string) => foodEntriesApi.delete(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData(queryKeys.foodEntries, (prev: FoodEntry[] | undefined) =>
        prev ? prev.filter((e) => e.id !== id) : []
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
