import { useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useEnergy } from '@/hooks/useEnergy';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useGoals } from '@/hooks/useGoals';
import { executeVoiceAction, type VoiceExecutorContext } from '@/lib/voiceActionExecutor';
import { type VoiceUnderstandResult } from '@/lib/voiceApi';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/components/shared/ToastProvider';

interface ProcessResult {
  succeeded: string[];
  failed: { action: string; reason: string }[];
}

export function useVoiceActions() {
  const queryClient = useQueryClient();
  const { foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry, updateCheckIn, addCheckIn, deleteCheckIn, getCheckInByDate } = useEnergy();
  const { workouts, addWorkout, updateWorkout, deleteWorkout } = useWorkouts();
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();

  const voiceContext = useMemo<VoiceExecutorContext>(() => ({
    foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry,
    addCheckIn, updateCheckIn, deleteCheckIn, getCheckInByDate,
    workouts, addWorkout, updateWorkout, deleteWorkout,
    goals, addGoal, updateGoal, deleteGoal,
  }), [
    foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry,
    addCheckIn, updateCheckIn, deleteCheckIn, getCheckInByDate,
    workouts, addWorkout, updateWorkout, deleteWorkout,
    goals, addGoal, updateGoal, deleteGoal,
  ]);

  const processVoiceResult = useCallback(async (result: VoiceUnderstandResult): Promise<ProcessResult> => {
    const succeeded: string[] = [];
    const failed: { action: string; reason: string }[] = [];

    if (result.results) {
      for (const r of result.results) {
        if (r.success) succeeded.push(r.message ?? r.intent);
        else failed.push({ action: r.intent, reason: r.message ?? 'Could not complete action.' });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.workouts });
      await queryClient.invalidateQueries({ queryKey: queryKeys.foodEntries });
      await queryClient.invalidateQueries({ queryKey: queryKeys.checkIns });
      await queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    } else {
      for (const action of result.actions) {
        try {
          const r = await executeVoiceAction(action, voiceContext);
          if (r.success) succeeded.push(r.message ?? action.intent);
          else failed.push({ action: action.intent, reason: r.message ?? 'Could not complete action.' });
        } catch (e) {
          failed.push({ action: action.intent ?? 'unknown', reason: e instanceof Error ? e.message : 'Could not complete action.' });
        }
      }
    }

    return { succeeded, failed };
  }, [voiceContext, queryClient]);

  const showResultToasts = useCallback((result: ProcessResult) => {
    const { succeeded, failed } = result;
    if (succeeded.length > 0 && failed.length === 0) {
      const msg = succeeded.length === 1 ? succeeded[0] : `Done: ${succeeded.join(', ')}`;
      toast.success(msg);
      return msg;
    } else if (succeeded.length > 0) {
      const msg = `Added ${succeeded.length} item(s). ${failed.length} failed.`;
      toast.success(msg);
      return msg;
    } else if (failed.length > 0) {
      toast.error('Voice action failed', { description: failed[0].reason });
      return '';
    }
    return '';
  }, []);

  return { voiceContext, processVoiceResult, showResultToasts };
}
