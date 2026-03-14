import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DailyCheckIn, FoodEntry } from '@/types/energy';
import { foodEntriesApi, dailyCheckInsApi } from '@/features/energy/api';
import {
  apiCheckInToDailyCheckIn,
  apiFoodEntryToFoodEntry,
} from '@/features/energy/mappers';
import { queryKeys } from '@/lib/queryClient';
import { toLocalDateString } from '@/lib/dateRanges';

export function useEnergy() {
  const queryClient = useQueryClient();

  const checkInsQuery = useQuery({
    queryKey: queryKeys.checkIns,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const result = await dailyCheckInsApi.list();
      return result.data.map(apiCheckInToDailyCheckIn);
    },
  });

  const foodEntriesQuery = useQuery({
    queryKey: queryKeys.foodEntries,
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      const result = await foodEntriesApi.list();
      return result.data.map(apiFoodEntryToFoodEntry);
    },
  });

  const checkIns = checkInsQuery.data ?? [];
  const foodEntries = foodEntriesQuery.data ?? [];
  const energyLoading = checkInsQuery.isLoading || foodEntriesQuery.isLoading;
  const energyError =
    checkInsQuery.error
      ? (checkInsQuery.error instanceof Error ? checkInsQuery.error.message : 'Could not load check-ins. Please try again.')
      : foodEntriesQuery.error
        ? (foodEntriesQuery.error instanceof Error ? foodEntriesQuery.error.message : 'Could not load food entries. Please try again.')
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

  const addFoodEntriesBatchMutation = useMutation({
    mutationFn: (body: { date: string; entries: Array<Omit<FoodEntry, 'id' | 'date'> & { startTime?: string; endTime?: string }> }) =>
      foodEntriesApi.addBatch({
        date: body.date,
        entries: body.entries.map((e) => ({
          name: e.name,
          calories: e.calories,
          protein: e.protein,
          carbs: e.carbs,
          fats: e.fats,
          ...(e.portionAmount != null && { portionAmount: e.portionAmount }),
          ...(e.portionUnit && { portionUnit: e.portionUnit }),
          ...(e.servingType && { servingType: e.servingType }),
          ...(e.startTime && { startTime: e.startTime }),
          ...(e.endTime && { endTime: e.endTime }),
        })),
      }),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.foodEntries, (prev: FoodEntry[] | undefined) =>
        prev ? [...prev, ...created.map(apiFoodEntryToFoodEntry)] : created.map(apiFoodEntryToFoodEntry)
      );
    },
  });

  const duplicateDayMutation = useMutation({
    mutationFn: ({ sourceDate, targetDate }: { sourceDate: string; targetDate: string }) =>
      foodEntriesApi.duplicateDay(sourceDate, targetDate),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.foodEntries, (prev: FoodEntry[] | undefined) =>
        prev ? [...prev, ...created.map(apiFoodEntryToFoodEntry)] : created.map(apiFoodEntryToFoodEntry)
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

  const addFoodEntriesBatch = useCallback(
    (body: { date: string; entries: Array<Omit<FoodEntry, 'id' | 'date'> & { startTime?: string; endTime?: string }> }): Promise<void> =>
      addFoodEntriesBatchMutation.mutateAsync(body).then(() => undefined),
    [addFoodEntriesBatchMutation]
  );
  const duplicateDay = useCallback(
    (sourceDate: string, targetDate: string): Promise<void> =>
      duplicateDayMutation.mutateAsync({ sourceDate, targetDate }).then(() => undefined),
    [duplicateDayMutation]
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
    addFoodEntriesBatch,
    duplicateDay,
  };
}
