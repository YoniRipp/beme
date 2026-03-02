import { useCallback, useState } from 'react';
import { Mic, Lock, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceExecution } from '@/hooks/useVoiceExecution';
import { toast } from '@/components/shared/ToastProvider';
import { useSubscription } from '@/hooks/useSubscription';
import { cn } from '@/lib/utils';

export function VoiceMicHero() {
  const { isPro, subscribe } = useSubscription();
  const { processAndNotify } = useVoiceExecution();
  const [statusText, setStatusText] = useState('');

  const {
    isAvailable,
    isListening,
    isProcessing,
    currentTranscript,
    startListening,
    stopListening,
    getVoiceResult,
  } = useSpeechRecognition();

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

        const r = await processAndNotify(result);

        if (r.succeeded.length > 0 && r.failed.length === 0) {
          const msg = r.succeeded.length === 1 ? r.succeeded[0] : `Done: ${r.succeeded.join(', ')}`;
          setStatusText(msg);
        } else if (r.succeeded.length > 0) {
          setStatusText(`${r.succeeded.length} added, ${r.failed.length} failed`);
        } else {
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
  }, [isPro, subscribe, isListening, isAvailable, startListening, stopListening, getVoiceResult, processAndNotify]);

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
