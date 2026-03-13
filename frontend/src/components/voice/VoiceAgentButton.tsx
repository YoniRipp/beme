import { useCallback, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Mic, Loader2, Lock, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceActions } from '@/hooks/useVoiceActions';
import { toast } from '@/components/shared/ToastProvider';
import { cn } from '@/lib/utils';
import { useSubscription } from '@/hooks/useSubscription';
import { ChatAgentPanel } from '@/components/chat/ChatAgentPanel';

interface VoiceAgentButtonProps {
  /** When provided, the button only toggles the voice panel (one tap open, one tap close). */
  panelOpen?: boolean;
  onTogglePanel?: () => void;
}

export function VoiceAgentButton({ panelOpen, onTogglePanel }: VoiceAgentButtonProps = {}) {
  const { pathname } = useLocation();
  const { isPro } = useSubscription();
  const { processVoiceResult, showResultToasts } = useVoiceActions();
  const [chatOpen, setChatOpen] = useState(false);

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

  const handleMicClick = useCallback(async () => {
    if (onTogglePanel != null) {
      onTogglePanel();
      return;
    }

    if (!isPro) {
      toast.error('Pro subscription required', { description: 'Upgrade to Pro to use voice input.' });
      return;
    }

    if (isListeningRef.current) {
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
  }, [onTogglePanel, isPro, isAvailable, startListening, stopListening, getVoiceResult, processVoiceResult, showResultToasts]);

  const state = isListening ? 'listening' : isProcessing ? 'processing' : 'idle';
  const isActive = onTogglePanel != null ? panelOpen : state === 'listening' || state === 'processing';

  // Home page has VoiceMicHero instead of this floating button
  if (pathname === '/') return null;

  return (
    <>
      {/* Chat agent button */}
      <Button
        size="icon"
        variant="outline"
        className="fixed bottom-52 right-4 z-50 h-12 w-12 rounded-full shadow-md transition-all md:right-6 lg:bottom-36"
        aria-label="Open AI Coach"
        onClick={() => {
          if (!isPro) {
            toast.error('Pro subscription required', { description: 'Upgrade to Pro to use AI Coach.' });
            return;
          }
          setChatOpen(true);
        }}
      >
        {!isPro ? (
          <div className="relative">
            <MessageCircle className="h-5 w-5" />
            <Lock className="absolute -bottom-1 -right-1 h-3 w-3 text-amber-400" />
          </div>
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </Button>

      {/* Mic button */}
      <Button
        size="icon"
        className={cn(
          'fixed bottom-36 right-4 z-50 h-14 w-14 rounded-full shadow-lg transition-all md:right-6 lg:bottom-22',
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

      {/* Chat panel */}
      <ChatAgentPanel open={chatOpen} onOpenChange={setChatOpen} />
    </>
  );
}
