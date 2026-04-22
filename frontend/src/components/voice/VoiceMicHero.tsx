import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceActions } from '@/hooks/useVoiceActions';
import { toast } from '@/components/shared/ToastProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

const VOICE_USED_KEY = 'trackvibe_voice_used';
const TAG = '[VoiceMicHero]';

export function VoiceMicHero() {
  const { isPro, hasAiAccess, aiCallsRemaining, subscribe } = useSubscription();
  const [statusText, setStatusText] = useState('');
  const [isStarting, setIsStarting] = useState(false);
  const [hasUsedVoice, setHasUsedVoice] = useState(() => localStorage.getItem(VOICE_USED_KEY) === '1');
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const busyRef = useRef(false);
  const stoppingRef = useRef(false);
  const startAbortRef = useRef(false);

  const { processVoiceResult, showResultToasts } = useVoiceActions();

  const {
    isAvailable,
    isListening,
    isProcessing,
    currentTranscript,
    startListening,
    stopListening,
    getVoiceResult,
  } = useSpeechRecognition();

  useEffect(() => {
    return () => { clearTimeout(statusTimeoutRef.current); };
  }, []);

  // Use a ref to always have the current isListening value, avoiding stale closures
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;

  // Clear stale status when recording stops unexpectedly (e.g. WebSocket closes)
  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (isListening) {
      wasListeningRef.current = true;
    } else if (wasListeningRef.current && !isProcessing) {
      // Was listening, now idle — recording stopped without user action
      wasListeningRef.current = false;
      setStatusText('');
    }
  }, [isListening, isProcessing]);

  const handleMicClick = useCallback(async () => {
    console.log(TAG, 'handleMicClick — hasAiAccess:', hasAiAccess, 'busyRef:', busyRef.current, 'isListeningRef:', isListeningRef.current, 'isListening:', isListening, 'isAvailable:', isAvailable);

    if (!hasAiAccess) {
      if (!isPro && aiCallsRemaining <= 0) {
        toast("You've used all your free AI calls this month. Exciting updates coming soon!");
      } else {
        subscribe();
      }
      return;
    }

    // Allow cancelling a pending start
    if (busyRef.current && !isListeningRef.current) {
      console.log(TAG, 'CANCELLING pending start');
      startAbortRef.current = true;
      setIsStarting(false);
      busyRef.current = false;
      toast('Recording cancelled');
      return;
    }

    // Stop is ALWAYS allowed — never gate behind busyRef so user can stop at any time
    if (isListeningRef.current) {
      if (stoppingRef.current) return;
      stoppingRef.current = true;
      try {
        setStatusText('Processing...');
        await stopListening();
        const result = await getVoiceResult();

        if (!result || result.actions.length === 0 || result.actions[0].intent === 'unknown') {
          setStatusText('');
          toast.error('No speech captured or not understood. Try again.');
          return;
        }

        const processResult = await processVoiceResult(result);
        const msg = showResultToasts(processResult);
        setStatusText(msg || (processResult.failed.length > 0 ? `${processResult.failed.length} failed` : ''));

        clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setStatusText(''), 5000);
      } catch (e) {
        setStatusText('');
        toast.error('Voice processing failed', { description: e instanceof Error ? e.message : 'Please try again.' });
      } finally {
        stoppingRef.current = false;
      }
      return;
    }

    // Start uses busyRef to prevent double-start
    if (busyRef.current) {
      console.log(TAG, 'START blocked — busyRef is true');
      return;
    }
    busyRef.current = true;
    console.log(TAG, 'entering START flow');

    try {
      if (!isAvailable) {
        console.warn(TAG, 'voice not available');
        toast.error('Voice not available', { description: 'Microphone access required.' });
        return;
      }

      try {
        setIsStarting(true);
        startAbortRef.current = false;
        if (!hasUsedVoice) {
          setHasUsedVoice(true);
          localStorage.setItem(VOICE_USED_KEY, '1');
        }
        console.log(TAG, 'calling startListening (with 20s safety timeout)...');
        await Promise.race([
          startListening(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Start timed out. Please try again.')), 20_000)
          ),
        ]);
        if (startAbortRef.current) {
          console.log(TAG, 'startListening resolved but user already cancelled');
          return;
        }
        console.log(TAG, 'startListening OK — now listening');
        // Sync update ref immediately — closes gap before busyRef resets
        isListeningRef.current = true;
      } catch (e) {
        if (startAbortRef.current) {
          console.log(TAG, 'startListening error but user already cancelled');
          return;
        }
        console.error(TAG, 'startListening FAILED:', e);
        setStatusText('');
        toast.error('Could not start recording', { description: e instanceof Error ? e.message : 'Check microphone permissions.' });
      } finally {
        setIsStarting(false);
        console.log(TAG, 'START flow done — isStarting=false');
      }
    } finally {
      busyRef.current = false;
      console.log(TAG, 'busyRef released');
    }
  }, [isPro, hasAiAccess, aiCallsRemaining, subscribe, isAvailable, hasUsedVoice, startListening, stopListening, getVoiceResult, processVoiceResult, showResultToasts]);

  const state = isStarting ? 'starting' : isListening ? 'listening' : isProcessing ? 'processing' : 'idle';

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <button
          onClick={handleMicClick}
          disabled={state === 'processing'}
          className={cn(
            'relative flex h-24 w-24 items-center justify-center rounded-full transition-all',
            'bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105',
            state === 'listening' && 'animate-pulse ring-4 ring-primary/30 scale-110',
            state === 'starting' && 'animate-pulse opacity-70',
            state === 'processing' && 'opacity-70',
            !hasAiAccess && 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          aria-label={hasAiAccess ? (state === 'listening' ? 'Stop recording' : 'Start voice input') : 'Voice input unavailable'}
        >
          {(state === 'processing' || state === 'starting') ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : !hasAiAccess ? (
            <div className="relative">
              <Mic className="h-10 w-10" />
              <Lock className="absolute -bottom-1 -right-1 h-4 w-4 text-amber-500" />
            </div>
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>

        <div className="text-center">
          <p className="text-sm font-medium text-foreground">
            {!hasAiAccess
              ? "You've used all free calls this month. Updates coming soon!"
              : state === 'starting'
                ? 'Starting... Tap to cancel'
                : state === 'listening'
                  ? 'Listening... Tap to stop'
                  : state === 'processing'
                    ? 'Processing your voice...'
                    : 'Tap to log by voice'}
          </p>
          {hasAiAccess && state === 'idle' && !statusText && !hasUsedVoice && (
            <p className="mt-1 text-xs text-muted-foreground">
              Try: "I had oatmeal for breakfast" or "30 min run"
            </p>
          )}
        </div>

        {currentTranscript && state === 'listening' && (
          <p className="max-w-sm text-center text-sm italic text-muted-foreground">
            "{currentTranscript}"
          </p>
        )}

        {statusText && state === 'idle' && (
          <p className="text-sm font-medium text-green-600">
            {statusText}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
