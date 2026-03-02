import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, Square } from 'lucide-react';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { useVoiceExecution } from '@/hooks/useVoiceExecution';
import { toast } from '@/components/shared/ToastProvider';
import { LocalErrorBoundary } from '@/components/shared/LocalErrorBoundary';

interface VoiceAgentPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VoiceAgentPanel({ open, onOpenChange }: VoiceAgentPanelProps) {
  const { processVoiceResult } = useVoiceExecution();

  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState('');

  const {
    isNative,
    isAvailable,
    isListening,
    isProcessing,
    currentTranscript,
    startListening,
    stopListening,
    getVoiceResult,
  } = useSpeechRecognition({
    language: '',
    onPartialResult: setTranscript,
  });

  const handleStartRecording = useCallback(async () => {
    setError(null);
    setTranscript('');
    try {
      await startListening();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start recording. Please check microphone permissions.';
      setError(msg);
      toast.error('Microphone', { description: msg });
    }
  }, [startListening]);

  const handleStopRecording = useCallback(async () => {
    try {
      await stopListening();
      const result = await getVoiceResult();
      const r = await processVoiceResult(result);

      if (r.succeeded.length > 0) {
        toast.success(r.succeeded.length === 1 ? r.succeeded[0] : `Done: ${r.succeeded.join(', ')}`);
      }
      if (r.failed.length > 0) {
        setError(r.failed.map(f => f.reason).join('; '));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Network or server error. Please try again.';
      setError(msg);
      toast.error('Voice processing failed', { description: msg });
    }
  }, [stopListening, getVoiceResult, processVoiceResult]);

  // Stop recording when dialog closes
  useEffect(() => {
    if (!open && isListening) {
      stopListening().catch(() => {});
    }
  }, [open, isListening, stopListening]);

  const displayTranscript = currentTranscript || transcript;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>מרח / Voice Agent</DialogTitle>
        </DialogHeader>
        <LocalErrorBoundary label="Voice">
          {!isAvailable ? (
            <div className="py-4 text-sm text-muted-foreground">
              Voice is not supported in this browser. Microphone access required.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {isNative && (
                <p className="text-xs text-muted-foreground">
                  Using native speech recognition
                </p>
              )}

              <div className="flex gap-2">
                {!isListening && !isProcessing ? (
                  <Button type="button" onClick={handleStartRecording} className="flex-1">
                    <Mic className="mr-2 h-4 w-4" />
                    Start recording / התחל הקלטה
                  </Button>
                ) : isListening ? (
                  <Button type="button" variant="destructive" onClick={handleStopRecording} className="flex-1">
                    <Square className="mr-2 h-4 w-4" />
                    Stop / עצור
                  </Button>
                ) : (
                  <Button type="button" disabled className="flex-1">
                    Processing...
                  </Button>
                )}
              </div>

              {displayTranscript && isListening && (
                <p className="text-sm text-muted-foreground italic" role="status" aria-live="polite">
                  "{displayTranscript}"
                </p>
              )}

              {error && <p className="text-sm text-destructive">{error}</p>}

              {isProcessing && (
                <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
                  Processing voice...
                </p>
              )}
            </div>
          )}
        </LocalErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
