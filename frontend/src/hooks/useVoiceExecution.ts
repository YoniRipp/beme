import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryClient';
import { useSchedule } from '@/hooks/useSchedule';
import { useTransactions } from '@/hooks/useTransactions';
import { useEnergy } from '@/hooks/useEnergy';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useGoals } from '@/hooks/useGoals';
import { executeVoiceAction, type VoiceExecutorContext } from '@/lib/voiceActionExecutor';
import { toast } from '@/components/shared/ToastProvider';
import type { VoiceUnderstandResult } from '@/lib/voiceApi';

export interface VoiceExecutionResult {
  succeeded: string[];
  failed: { action: string; reason: string }[];
}

/**
 * Shared hook that builds the voice executor context and provides a
 * `processVoiceResult` function to handle actions, invalidate caches,
 * and show toast notifications.
 *
 * Used by VoiceMicHero, VoiceAgentButton, and VoiceAgentPanel.
 */
export function useVoiceExecution() {
  const queryClient = useQueryClient();
  const { scheduleItems, addScheduleItems, updateScheduleItem, deleteScheduleItem, getScheduleItemById } = useSchedule();
  const { transactions, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const { foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry, updateCheckIn, addCheckIn, deleteCheckIn, getCheckInByDate } = useEnergy();
  const { workouts, addWorkout, updateWorkout, deleteWorkout } = useWorkouts();
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();

  const voiceContext: VoiceExecutorContext = {
    scheduleItems, addScheduleItems, updateScheduleItem, deleteScheduleItem, getScheduleItemById,
    transactions, addTransaction, updateTransaction, deleteTransaction,
    foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry,
    addCheckIn, updateCheckIn, deleteCheckIn, getCheckInByDate,
    workouts, addWorkout, updateWorkout, deleteWorkout,
    goals, addGoal, updateGoal, deleteGoal,
  } as VoiceExecutorContext;

  const invalidateAll = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.transactions }),
      queryClient.invalidateQueries({ queryKey: queryKeys.schedule }),
      queryClient.invalidateQueries({ queryKey: queryKeys.workouts }),
      queryClient.invalidateQueries({ queryKey: queryKeys.foodEntries }),
      queryClient.invalidateQueries({ queryKey: queryKeys.checkIns }),
      queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
    ]);
  }, [queryClient]);

  /**
   * Process the result from the voice API. Executes each action via the
   * voiceActionExecutor, invalidates caches, and returns a summary.
   */
  const processVoiceResult = useCallback(async (
    result: VoiceUnderstandResult | null
  ): Promise<VoiceExecutionResult> => {
    if (!result || result.actions.length === 0 || result.actions[0].intent === 'unknown') {
      return { succeeded: [], failed: [{ action: 'unknown', reason: 'No speech captured or not understood. Try again.' }] };
    }

    const succeeded: string[] = [];
    const failed: { action: string; reason: string }[] = [];

    if (result.results) {
      // Backend already executed the actions
      for (const r of result.results) {
        if (r.success) succeeded.push(r.message ?? r.intent);
        else failed.push({ action: r.intent, reason: r.message ?? 'Could not complete action. Please try again.' });
      }
      await invalidateAll();
    } else {
      // Execute actions client-side
      for (const action of result.actions) {
        if (action.intent === 'unknown') {
          failed.push({ action: 'unknown', reason: 'Not understood' });
          continue;
        }
        try {
          const r = await executeVoiceAction(action, voiceContext);
          if (r.success) succeeded.push(r.message ?? action.intent);
          else failed.push({ action: action.intent, reason: r.message ?? 'Could not complete action. Please try again.' });
        } catch (e) {
          failed.push({ action: action.intent ?? 'unknown', reason: e instanceof Error ? e.message : 'Could not complete action. Please try again.' });
        }
      }
    }

    return { succeeded, failed };
  }, [voiceContext, invalidateAll]);

  /**
   * Process result and show toast notifications. Returns the execution result.
   */
  const processAndNotify = useCallback(async (
    result: VoiceUnderstandResult | null
  ): Promise<VoiceExecutionResult> => {
    const r = await processVoiceResult(result);

    if (r.succeeded.length > 0 && r.failed.length === 0) {
      toast.success(r.succeeded.length === 1 ? r.succeeded[0] : `Done: ${r.succeeded.join(', ')}`);
    } else if (r.succeeded.length > 0 && r.failed.length > 0) {
      toast.success(`Added ${r.succeeded.length} item(s). ${r.failed.length} failed: ${r.failed.map(f => f.reason).join('; ')}`);
    } else if (r.failed.length > 0) {
      toast.error('Voice action failed', { description: r.failed[0].reason });
    }

    return r;
  }, [processVoiceResult]);

  return { voiceContext, processVoiceResult, processAndNotify, invalidateAll };
}
