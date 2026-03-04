import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mic, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { queryKeys } from '@/lib/queryClient';
import { useEnergy } from '@/hooks/useEnergy';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useGoals } from '@/hooks/useGoals';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { executeVoiceAction, type VoiceExecutorContext } from '@/lib/voiceActionExecutor';
import { toast } from '@/components/shared/ToastProvider';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

interface VoiceAgentButtonProps {
  /** When provided, the button only toggles the voice panel (one tap open, one tap close). */
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}

export function VoiceAgentButton({ panelOpen, onTogglePanel }: VoiceAgentButtonProps = {}) {
  const { isPro } = useSubscription();
  const queryClient = useQueryClient();
  const { foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry, updateCheckIn, addCheckIn, deleteCheckIn, getCheckInByDate } = useEnergy();
  const { workouts, addWorkout, updateWorkout, deleteWorkout } = useWorkouts();
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();

  const {
    isAvailable,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    getVoiceResult,
  } = useSpeechRecognition();

  const voiceContext = {
    foodEntries,
    addFoodEntry,
    updateFoodEntry,
    deleteFoodEntry,
    addCheckIn,
    updateCheckIn,
    deleteCheckIn,
    getCheckInByDate,
    workouts,
    addWorkout,
    updateWorkout,
    deleteWorkout,
    goals,
    addGoal,
    updateGoal,
    deleteGoal,
  } as VoiceExecutorContext;

  const handleClick = useCallback(async () => {
    if (onTogglePanel != null) {
      onTogglePanel();
      return;
    }

    if (!isPro) {
      toast.error('Pro subscription required', { description: 'Upgrade to Pro to use voice input.' });
      return;
    }

    if (isListening) {
      try {
        await stopListening();
        const result = await getVoiceResult();

        if (!result || result.actions.length === 0 || result.actions[0].intent === 'unknown') {
          toast.error('No speech captured or not understood. Try again.');
          return;
        }

        const succeeded: string[] = [];
        const failed: { action: string; reason: string }[] = [];

        if (result.results) {
          for (const r of result.results) {
            if (r.success) succeeded.push(r.message ?? r.intent);
            else failed.push({ action: r.intent, reason: r.message ?? 'Could not complete action. Please try again.' });
          }
          await queryClient.invalidateQueries({ queryKey: queryKeys.workouts });
          await queryClient.invalidateQueries({ queryKey: queryKeys.foodEntries });
          await queryClient.invalidateQueries({ queryKey: queryKeys.checkIns });
          await queryClient.invalidateQueries({ queryKey: queryKeys.goals });
        } else {
          for (const action of result.actions) {
            try {
              const r = await executeVoiceAction(action, voiceContext);
              if (r.success) {
                succeeded.push(r.message ?? action.intent);
              } else {
                failed.push({ action: action.intent, reason: r.message ?? 'Could not complete action. Please try again.' });
              }
            } catch (e) {
              failed.push({ action: action.intent ?? 'unknown', reason: e instanceof Error ? e.message : 'Could not complete action. Please try again.' });
            }
          }
        }

        if (succeeded.length > 0 && failed.length === 0) {
          toast.success(succeeded.length === 1 ? succeeded[0] : `Done: ${succeeded.join(', ')}`);
        } else if (succeeded.length > 0 && failed.length > 0) {
          toast.success(`Added ${succeeded.length} item(s). ${failed.length} failed: ${failed.map((f) => f.reason).join('; ')}`);
        } else if (failed.length > 0) {
          const msg = failed[0].reason;
          toast.error('Voice action failed', { description: msg });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Network or server error. Please try again.';
        toast.error('Voice processing failed', { description: msg });
      }
      return;
    }

    if (!isAvailable) {
      toast.error('Voice not available', { description: 'Microphone access required. Please use Chrome or Edge.' });
      return;
    }

    try {
      await startListening();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start listening. Please check microphone permissions.';
      toast.error('Could not start recording', { description: msg });
    }
  }, [onTogglePanel, isPro, isListening, isAvailable, startListening, stopListening, getVoiceResult, voiceContext, queryClient]);

  const state = isListening ? 'listening' : isProcessing ? 'processing' : 'idle';
  const isActive = onTogglePanel != null ? panelOpen : state === 'listening' || state === 'processing';

  return (
    <Button
      size="icon"
      className={cn(
        'fixed bottom-20 right-4 z-50 h-14 w-14 rounded-full shadow-lg transition-all md:right-6',
        isActive && 'animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background'
      )}
      aria-label={
        onTogglePanel != null
          ? panelOpen
            ? 'מרח - לחץ לסגירה'
            : 'מרח - Voice Agent (לחץ לפתיחה)'
          : state === 'listening'
            ? 'מרח - מאזין (לחץ לעצור ולשלוח)'
            : state === 'processing'
              ? 'מרח - מעבד'
              : 'מרח - Voice Agent (לחץ להאזנה)'
      }
      onClick={handleClick}
      disabled={onTogglePanel == null && state === 'processing'}
    >
      {onTogglePanel == null && state === 'processing' ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : !isPro ? (
        <div className="relative">
          <Mic className="h-6 w-6" />
          <Lock className="absolute -bottom-1 -right-1 h-3 w-3 text-amber-400" />
        </div>
      ) : (
        <Mic className="h-6 w-6" />
      )}
    </Button>
  );
}
