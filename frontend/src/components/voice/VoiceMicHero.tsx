import { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceActions } from '@/hooks/useVoiceActions';
import { toast } from '@/components/shared/ToastProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

const VOICE_USED_KEY = 'beme_voice_used';

export function VoiceMicHero() {
  const { isPro, subscribe } = useSubscription();
  const [statusText, setStatusText] = useState('');
  const [hasUsedVoice, setHasUsedVoice] = useState(() => localStorage.getItem(VOICE_USED_KEY) === '1');
  const statusTimeoutRef = useRef<ReturnType<typeof setTimeout>>();

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

        const processResult = await processVoiceResult(result);
        const msg = showResultToasts(processResult);
        setStatusText(msg || (processResult.failed.length > 0 ? `${processResult.failed.length} failed` : ''));

        clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = setTimeout(() => setStatusText(''), 5000);
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
      if (!hasUsedVoice) {
        setHasUsedVoice(true);
        localStorage.setItem(VOICE_USED_KEY, '1');
      }
      await startListening();
    } catch (e) {
      setStatusText('');
      toast.error('Could not start recording', { description: e instanceof Error ? e.message : 'Check microphone permissions.' });
    }
  }, [isPro, subscribe, isListening, isAvailable, startListening, stopListening, getVoiceResult, processVoiceResult, showResultToasts]);

  const state = isListening ? 'listening' : isProcessing ? 'processing' : 'idle';

  return (
    <Card className="overflow-hidden bg-gradient-to-br from-card to-primary/5">
      <CardContent className="flex flex-col items-center gap-4 py-8">
        <button
          onClick={handleMicClick}
          disabled={state === 'processing'}
          className={cn(
            'relative flex h-24 w-24 items-center justify-center rounded-full transition-all',
            'bg-primary text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105',
            state === 'listening' && 'animate-pulse ring-4 ring-primary/30 scale-110',
            state === 'processing' && 'opacity-70',
            !isPro && 'bg-muted text-muted-foreground hover:bg-muted/80',
          )}
          aria-label={isPro ? (state === 'listening' ? 'Stop recording' : 'Start voice input') : 'Upgrade to Pro for voice input'}
        >
          {state === 'processing' ? (
            <Loader2 className="h-10 w-10 animate-spin" />
          ) : !isPro ? (
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
            {!isPro
              ? 'Upgrade to Pro to track by voice'
              : state === 'listening'
                ? 'Listening... Tap to stop'
                : state === 'processing'
                  ? 'Processing your voice...'
                  : 'Tap to log by voice'}
          </p>
          {isPro && state === 'idle' && !statusText && !hasUsedVoice && (
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
