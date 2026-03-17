import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, Loader2, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceActions } from '@/hooks/useVoiceActions';
import { toast } from '@/components/shared/ToastProvider';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';

interface VoiceAgentButtonProps {
  /** When provided, the button only toggles the voice panel (one tap open, one tap close). */
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}

export function VoiceAgentButton({ panelOpen, onTogglePanel }: VoiceAgentButtonProps = {}) {
  const { pathname } = useLocation();
  const { isPro } = useSubscription();
  const { processVoiceResult, showResultToasts } = useVoiceActions();
  const [isStarting, setIsStarting] = useState(false);
  const busyRef = useRef(false);
  const stoppingRef = useRef(false);
  const startAbortRef = useRef(false);

  const {
    isAvailable,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    getVoiceResult,
  } = useSpeechRecognition();

  // Use a ref to always have the current isListening value, avoiding stale closures
  const isListeningRef = useRef(isListening);
  isListeningRef.current = isListening;

  // Detect when recording stops unexpectedly (e.g. WebSocket closes)
  const wasListeningRef = useRef(false);
  useEffect(() => {
    if (isListening) {
      wasListeningRef.current = true;
    } else if (wasListeningRef.current && !isProcessing) {
      wasListeningRef.current = false;
    }
  }, [isListening, isProcessing]);

  const handleMicClick = useCallback(async () => {
    if (onTogglePanel != null) {
      onTogglePanel();
      return;
    }

    if (!isPro) {
      toast.error('Pro subscription required', { description: 'Upgrade to Pro to use voice input.' });
      return;
    }

    // Allow cancelling a pending start
    if (busyRef.current && !isListeningRef.current) {
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
        await stopListening();
        const result = await getVoiceResult();

        if (!result || result.actions.length === 0 || result.actions[0].intent === 'unknown') {
          toast.error('No speech captured or not understood. Try again.');
          return;
        }

        const processResult = await processVoiceResult(result);
        showResultToasts(processResult);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Network or server error. Please try again.';
        toast.error('Voice processing failed', { description: msg });
      } finally {
        stoppingRef.current = false;
      }
      return;
    }

    // Start uses busyRef to prevent double-start
    if (busyRef.current) return;
    busyRef.current = true;

    try {
      if (!isAvailable) {
        toast.error('Voice not available', { description: 'Microphone access required. Please use Chrome or Edge.' });
        return;
      }

      try {
        setIsStarting(true);
        startAbortRef.current = false;
        await Promise.race([
          startListening(),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Start timed out. Please try again.')), 20_000)
          ),
        ]);
        if (startAbortRef.current) return; // user cancelled during start
        // Sync update ref immediately — closes gap before busyRef resets
        isListeningRef.current = true;
      } catch (e) {
        if (startAbortRef.current) return; // user cancelled during start
        const msg = e instanceof Error ? e.message : 'Could not start listening. Please check microphone permissions.';
        toast.error('Could not start recording', { description: msg });
      } finally {
        setIsStarting(false);
      }
    } finally {
      busyRef.current = false;
    }
  }, [onTogglePanel, isPro, isAvailable, startListening, stopListening, getVoiceResult, processVoiceResult, showResultToasts]);

  const state = isStarting ? 'starting' : isListening ? 'listening' : isProcessing ? 'processing' : 'idle';
  const isActive = onTogglePanel != null ? panelOpen : state === 'listening' || state === 'processing';

  // Home page has VoiceMicHero instead of this floating button
  if (pathname === '/') return null;

  return (
    <>
      {/* Mic button */}
      <Button
        size="icon"
        className={cn(
          'fixed bottom-36 right-4 z-50 h-14 w-14 rounded-full shadow-lg transition-all md:right-6 lg:bottom-14',
          isActive && 'animate-pulse ring-2 ring-primary ring-offset-2 ring-offset-background'
        )}
        aria-label={
          onTogglePanel != null
            ? panelOpen
              ? 'Close voice panel'
              : 'Open voice panel'
            : state === 'listening'
              ? 'Stop recording and send'
              : state === 'processing'
                ? 'Processing voice'
                : 'Start voice input'
        }
        onClick={handleMicClick}
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
    </>
  );
}
