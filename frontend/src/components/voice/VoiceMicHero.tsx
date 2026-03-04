import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Mic, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { queryKeys } from '@/lib/queryClient';
import { useEnergy } from '@/hooks/useEnergy';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useGoals } from '@/hooks/useGoals';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { executeVoiceAction, type VoiceExecutorContext } from '@/lib/voiceActionExecutor';
import { toast } from '@/components/shared/ToastProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

export function VoiceMicHero() {
  const { isPro, subscribe } = useSubscription();
  const queryClient = useQueryClient();
  const [statusText, setStatusText] = useState('');

  const { foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry, updateCheckIn, addCheckIn, deleteCheckIn, getCheckInByDate } = useEnergy();
  const { workouts, addWorkout, updateWorkout, deleteWorkout } = useWorkouts();
  const { goals, addGoal, updateGoal, deleteGoal } = useGoals();

  const {
    isAvailable,
    isListening,
    isProcessing,
    currentTranscript,
    startListening,
    stopListening,
    getVoiceResult,
  } = useSpeechRecognition();

  const voiceContext = {
    foodEntries, addFoodEntry, updateFoodEntry, deleteFoodEntry,
    addCheckIn, updateCheckIn, deleteCheckIn, getCheckInByDate,
    workouts, addWorkout, updateWorkout, deleteWorkout,
    goals, addGoal, updateGoal, deleteGoal,
  } as VoiceExecutorContext;

  const handleMicClick = useCallback(async () => {
    if (!isPro) {
      subscribe();
      return;
    }

    if (isListening) {
      try {
        setStatusText('Processing...');
        await stopListening();
        const result = await getVoiceResult();

        if (!result || result.actions.length === 0 || result.actions[0].intent === 'unknown') {
          setStatusText('');
          toast.error('No speech captured or not understood. Try again.');
          return;
        }

        const succeeded: string[] = [];
        const failed: { action: string; reason: string }[] = [];

        if (result.results) {
          for (const r of result.results) {
            if (r.success) succeeded.push(r.message ?? r.intent);
            else failed.push({ action: r.intent, reason: r.message ?? 'Failed' });
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
              else failed.push({ action: action.intent, reason: r.message ?? 'Failed' });
            } catch (e) {
              failed.push({ action: action.intent ?? 'unknown', reason: e instanceof Error ? e.message : 'Failed' });
            }
          }
        }

        if (succeeded.length > 0 && failed.length === 0) {
          const msg = succeeded.length === 1 ? succeeded[0] : `Done: ${succeeded.join(', ')}`;
          setStatusText(msg);
          toast.success(msg);
        } else if (succeeded.length > 0) {
          toast.success(`Added ${succeeded.length} item(s). ${failed.length} failed.`);
          setStatusText(`${succeeded.length} added, ${failed.length} failed`);
        } else if (failed.length > 0) {
          toast.error('Voice action failed', { description: failed[0].reason });
          setStatusText('');
        }

        setTimeout(() => setStatusText(''), 5000);
      } catch (e) {
        setStatusText('');
        toast.error('Voice processing failed', { description: e instanceof Error ? e.message : 'Please try again.' });
      }
      return;
    }

    if (!isAvailable) {
      toast.error('Voice not available', { description: 'Microphone access required.' });
      return;
    }

    try {
      setStatusText('Listening...');
      await startListening();
    } catch (e) {
      setStatusText('');
      toast.error('Could not start recording', { description: e instanceof Error ? e.message : 'Check microphone permissions.' });
    }
  }, [isPro, subscribe, isListening, isAvailable, startListening, stopListening, getVoiceResult, voiceContext, queryClient]);

  const state = isListening ? 'listening' : isProcessing ? 'processing' : 'idle';

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-3 py-6">
        <button
          onClick={handleMicClick}
          disabled={state === 'processing'}
          className={cn(
            'relative flex h-20 w-20 items-center justify-center rounded-full transition-all',
            'bg-primary text-primary-foreground shadow-lg hover:shadow-xl',
            state === 'listening' && 'animate-pulse ring-4 ring-primary/30',
            state === 'processing' && 'opacity-70',
            !isPro && 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          aria-label={isPro ? (state === 'listening' ? 'Stop recording' : 'Start voice input') : 'Upgrade to Pro for voice input'}
        >
          {state === 'processing' ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : !isPro ? (
            <div className="relative">
              <Mic className="h-8 w-8" />
              <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-amber-500" />
            </div>
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </button>

        <p className="text-sm text-muted-foreground">
          {!isPro
            ? 'Upgrade to Pro to track by voice'
            : state === 'listening'
              ? 'Tap to stop and process'
              : state === 'processing'
                ? 'Processing...'
                : 'Tap to start talking'}
        </p>

        {currentTranscript && state === 'listening' && (
          <p className="max-w-sm text-center text-sm italic text-muted-foreground">
            "{currentTranscript}"
          </p>
        )}

        {statusText && state === 'idle' && (
          <p className="text-sm font-medium text-green-600 dark:text-green-400">
            {statusText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
