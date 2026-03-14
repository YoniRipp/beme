import { useCallback, useRef, useState, useEffect } from 'react';
import { getVoiceStreamUrl, parseVoiceResult, getUserTimezone, getPreferredAudioMimeType, type VoiceUnderstandResult } from '@/lib/voiceApi';
import { toLocalDateString } from '@/lib/dateRanges';
import { getToken } from '@/core/api/client';

interface UseVoiceStreamReturn {
  isNative: false;
  isAvailable: boolean;
  isListening: boolean;
  isProcessing: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  currentTranscript: string;
  getVoiceResult: () => Promise<VoiceUnderstandResult | null>;
}

const TAG = '[VoiceStream]';

function isMediaRecorderSupported(): boolean {
  return typeof window !== 'undefined' && !!window.MediaRecorder;
}


/**
 * Voice streaming hook using WebSocket + MediaRecorder.start(timeslice).
 *
 * Audio chunks are streamed to the backend every 250ms during recording.
 * The backend relays them to Gemini Live API in real-time, so by the time
 * the user stops speaking, Gemini has already processed most of the audio.
 *
 * Falls back gracefully — caller should catch errors and use batch mode.
 */
export function useVoiceStream(): UseVoiceStreamReturn {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const lastResultRef = useRef<VoiceUnderstandResult | null>(null);
  const isMountedRef = useRef(true);
  const isListeningRef = useRef(false);
  const isStartingRef = useRef(false);

  // Promise that resolves when the 'done' message arrives
  const doneResolveRef = useRef<((transcript: string) => void) | null>(null);
  const doneRejectRef = useRef<((err: Error) => void) | null>(null);
  const doneTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (doneTimeoutRef.current) { clearTimeout(doneTimeoutRef.current); doneTimeoutRef.current = null; }
      cleanup();
    };
  }, []);

  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try { mediaRecorderRef.current.stop(); } catch { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }
    wsRef.current = null;
    isListeningRef.current = false;
  }, []);

  const isAvailable = isMediaRecorderSupported() && !!getVoiceStreamUrl('test');


  const startListening = useCallback(async (): Promise<void> => {
    console.log(TAG, 'startListening called — isAvailable:', isAvailable, 'isListeningRef:', isListeningRef.current, 'isStartingRef:', isStartingRef.current);
    if (!isAvailable) throw new Error('Voice streaming not available');
    if (isListeningRef.current || isStartingRef.current) {
      console.log(TAG, 'startListening SKIPPED (already listening or starting)');
      return;
    }

    // Tear down any orphaned session from a previous attempt
    cleanup();

    isStartingRef.current = true;
    lastResultRef.current = null;
    setCurrentTranscript('');

    try {
      const token = getToken();
      console.log(TAG, 'token:', token ? 'present' : 'MISSING');
      if (!token) throw new Error('Authentication required');

      const wsUrl = getVoiceStreamUrl(token);
      console.log(TAG, 'wsUrl:', wsUrl ? wsUrl.replace(/token=.*/, 'token=***') : 'MISSING');
      if (!wsUrl) throw new Error('Voice streaming not configured');

      // Get microphone first
      console.log(TAG, 'requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log(TAG, 'getUserMedia OK — tracks:', stream.getTracks().length);
      streamRef.current = stream;

      const mimeType = getPreferredAudioMimeType();
      console.log(TAG, 'mimeType:', mimeType);

      // Open WebSocket
      console.log(TAG, 'opening WebSocket...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const fail = (err: Error) => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          reject(err);
        };

        // Total timeout covers connect + ready — NOT cleared on open
        const timeout = setTimeout(() => {
          console.error(TAG, 'setup TIMEOUT (8s) — server never sent ready');
          fail(new Error('Voice streaming setup timed out'));
          ws.close();
        }, 8000);

        ws.onopen = () => {
          console.log(TAG, 'WebSocket OPEN — sending start message');
          ws.send(JSON.stringify({
            type: 'start',
            today: toLocalDateString(new Date()),
            timezone: getUserTimezone(),
            mimeType,
          }));
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            console.log(TAG, 'setup message:', msg.type, msg.message ?? '');
            if (msg.type === 'ready') {
              if (settled) return;
              settled = true;
              clearTimeout(timeout);
              console.log(TAG, 'received READY — resolving setup');
              resolve();
            } else if (msg.type === 'error') {
              console.error(TAG, 'setup ERROR from server:', msg.message);
              fail(new Error(msg.message ?? 'Voice streaming failed'));
            }
          } catch { /* ignore parse errors during setup */ }
        };

        ws.onerror = (ev) => {
          console.error(TAG, 'WebSocket ERROR during setup', ev);
          fail(new Error('WebSocket connection failed'));
        };
      });

      console.log(TAG, 'WebSocket setup complete — installing ongoing handlers');

      // Set up ongoing message handler (replaces the setup one)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          console.log(TAG, 'ws message:', msg.type);

          if (msg.type === 'transcript') {
            if (isMountedRef.current) setCurrentTranscript(msg.text ?? '');
          }

          if (msg.type === 'action') {
            const intent = msg.action?.intent;
            console.log(TAG, 'action intent:', intent);
            if (intent && intent !== 'unknown' && isMountedRef.current) {
              setCurrentTranscript(`Detected: ${intent.replace(/_/g, ' ')}`);
            }
          }

          if (msg.type === 'done') {
            console.log(TAG, 'received DONE — actions:', msg.actions?.length ?? 0);
            let result: ReturnType<typeof parseVoiceResult>;
            try {
              result = parseVoiceResult(msg);
            } catch (e) {
              console.error(TAG, 'parseVoiceResult failed:', e);
              result = { actions: [{ intent: 'unknown', message: 'Failed to parse voice result' }] };
            }
            lastResultRef.current = result;
            if (isMountedRef.current) setIsProcessing(false);
            if (doneTimeoutRef.current) { clearTimeout(doneTimeoutRef.current); doneTimeoutRef.current = null; }
            doneResolveRef.current?.(
              result.actions[0]?.intent !== 'unknown'
                ? `Processed: ${result.actions[0]?.intent}`
                : '',
            );
            doneResolveRef.current = null;
            doneRejectRef.current = null;
          }

          if (msg.type === 'error') {
            console.error(TAG, 'ws error message:', msg.message);
            if (isMountedRef.current) setIsProcessing(false);
            if (doneTimeoutRef.current) { clearTimeout(doneTimeoutRef.current); doneTimeoutRef.current = null; }
            doneRejectRef.current?.(new Error(msg.message ?? 'Voice processing failed'));
            doneResolveRef.current = null;
            doneRejectRef.current = null;
          }
        } catch (e) {
          console.error(TAG, 'ws onmessage parse error:', e);
        }
      };

      ws.onerror = (ev) => {
        console.error(TAG, 'WebSocket ERROR during streaming', ev);
        if (doneTimeoutRef.current) { clearTimeout(doneTimeoutRef.current); doneTimeoutRef.current = null; }
        doneRejectRef.current?.(new Error('WebSocket error during streaming'));
        cleanup();
        if (isMountedRef.current) {
          setIsListening(false);
          setIsProcessing(false);
        }
      };

      ws.onclose = (ev) => {
        console.log(TAG, 'WebSocket CLOSED — code:', ev.code, 'reason:', ev.reason);
        if (doneTimeoutRef.current) { clearTimeout(doneTimeoutRef.current); doneTimeoutRef.current = null; }
        doneRejectRef.current?.(new Error('Connection closed'));
        doneResolveRef.current = null;
        doneRejectRef.current = null;
        cleanup();
        if (isMountedRef.current) {
          setIsListening(false);
          setIsProcessing(false);
        }
      };

      // Start MediaRecorder with 250ms timeslice
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
          ws.send(e.data);
        }
      };

      recorder.onerror = () => {
        console.error(TAG, 'MediaRecorder ERROR');
        cleanup();
        if (isMountedRef.current) setIsListening(false);
      };

      recorder.start(250);
      console.log(TAG, 'MediaRecorder started — now LISTENING');
      isListeningRef.current = true;
      if (isMountedRef.current) {
        setIsListening(true);
        setCurrentTranscript('Streaming...');
      }
    } catch (err) {
      console.error(TAG, 'startListening FAILED:', err);
      // If anything fails during setup, clean up all resources
      cleanup();
      if (isMountedRef.current) {
        setIsListening(false);
        setIsProcessing(false);
      }
      throw err;
    } finally {
      isStartingRef.current = false;
    }
  }, [isAvailable, cleanup]);

  const stopListening = useCallback(async (): Promise<string> => {
    console.log(TAG, 'stopListening called');
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      console.log(TAG, 'MediaRecorder stopped');
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      console.log(TAG, 'audio tracks stopped');
    }
    mediaRecorderRef.current = null;
    isListeningRef.current = false;
    if (isMountedRef.current) {
      setIsListening(false);
      setIsProcessing(true);
    }

    // Signal end of audio to backend
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      console.log(TAG, 'sending stop message to backend');
      ws.send(JSON.stringify({ type: 'stop' }));
    } else {
      console.log(TAG, 'WebSocket not open (readyState:', ws?.readyState, ') — skipping stop message');
      // WebSocket already closed — no point waiting for 'done'
      cleanup();
      if (isMountedRef.current) setIsProcessing(false);
      return '';
    }

    // Wait for 'done' message from server
    console.log(TAG, 'waiting for done message (15s timeout)...');
    return new Promise<string>((resolve, reject) => {
      doneResolveRef.current = resolve;
      doneRejectRef.current = reject;

      // Timeout fallback
      doneTimeoutRef.current = setTimeout(() => {
        if (doneResolveRef.current) {
          console.error(TAG, 'stopListening TIMEOUT (15s) — server never sent done');
          doneRejectRef.current?.(new Error('Voice streaming timed out'));
          doneResolveRef.current = null;
          doneRejectRef.current = null;
          doneTimeoutRef.current = null;
          cleanup();
          if (isMountedRef.current) setIsProcessing(false);
        }
      }, 15000);
    });
  }, [cleanup]);

  const getVoiceResult = useCallback(async (): Promise<VoiceUnderstandResult | null> => {
    return lastResultRef.current;
  }, []);

  return {
    isNative: false,
    isAvailable,
    isListening,
    isProcessing,
    startListening,
    stopListening,
    currentTranscript,
    getVoiceResult,
  };
}
