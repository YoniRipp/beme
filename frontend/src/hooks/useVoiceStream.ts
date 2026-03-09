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

  // Promise that resolves when the 'done' message arrives
  const doneResolveRef = useRef<((transcript: string) => void) | null>(null);
  const doneRejectRef = useRef<((err: Error) => void) | null>(null);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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
    if (!isAvailable) throw new Error('Voice streaming not available');
    if (isListeningRef.current) return;

    lastResultRef.current = null;
    setCurrentTranscript('');

    const token = getToken();
    if (!token) throw new Error('Authentication required');

    const wsUrl = getVoiceStreamUrl(token);
    if (!wsUrl) throw new Error('Voice streaming not configured');

    // Get microphone first
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    const mimeType = getPreferredAudioMimeType();

    // Open WebSocket
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('WebSocket connection timeout'));
        ws.close();
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timeout);
        // Send start message with session metadata
        ws.send(JSON.stringify({
          type: 'start',
          today: toLocalDateString(new Date()),
          timezone: getUserTimezone(),
          mimeType,
        }));
      };

      // Wait for 'ready' from server (Gemini session established)
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'ready') {
            resolve();
          } else if (msg.type === 'error') {
            clearTimeout(timeout);
            reject(new Error(msg.message ?? 'Voice streaming failed'));
          }
        } catch { /* ignore parse errors during setup */ }
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('WebSocket connection failed'));
      };
    });

    // Set up ongoing message handler (replaces the setup one)
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'transcript') {
          if (isMountedRef.current) setCurrentTranscript(msg.text ?? '');
        }

        if (msg.type === 'action') {
          // Show intent as feedback during streaming
          const intent = msg.action?.intent;
          if (intent && intent !== 'unknown' && isMountedRef.current) {
            setCurrentTranscript(`Detected: ${intent.replace(/_/g, ' ')}`);
          }
        }

        if (msg.type === 'done') {
          const result = parseVoiceResult(msg);
          lastResultRef.current = result;
          if (isMountedRef.current) setIsProcessing(false);
          doneResolveRef.current?.(
            result.actions[0]?.intent !== 'unknown'
              ? `Processed: ${result.actions[0]?.intent}`
              : '',
          );
          doneResolveRef.current = null;
          doneRejectRef.current = null;
        }

        if (msg.type === 'error') {
          if (isMountedRef.current) setIsProcessing(false);
          doneRejectRef.current?.(new Error(msg.message ?? 'Voice processing failed'));
          doneResolveRef.current = null;
          doneRejectRef.current = null;
        }
      } catch { /* ignore parse errors */ }
    };

    ws.onerror = () => {
      doneRejectRef.current?.(new Error('WebSocket error during streaming'));
      cleanup();
      if (isMountedRef.current) {
        setIsListening(false);
        setIsProcessing(false);
      }
    };

    ws.onclose = () => {
      // If closed before done, reject any pending promise
      doneRejectRef.current?.(new Error('Connection closed'));
      doneResolveRef.current = null;
      doneRejectRef.current = null;
    };

    // Start MediaRecorder with 250ms timeslice — fires ondataavailable every 250ms
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
        // Send raw binary audio chunk directly over WebSocket
        ws.send(e.data);
      }
    };

    recorder.onerror = () => {
      cleanup();
      if (isMountedRef.current) setIsListening(false);
    };

    recorder.start(250); // Fire ondataavailable every 250ms
    isListeningRef.current = true;
    if (isMountedRef.current) {
      setIsListening(true);
      setCurrentTranscript('Streaming...');
    }
  }, [isAvailable, cleanup]);

  const stopListening = useCallback(async (): Promise<string> => {
    // Stop MediaRecorder
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
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
      ws.send(JSON.stringify({ type: 'stop' }));
    }

    // Wait for 'done' message from server
    return new Promise<string>((resolve, reject) => {
      doneResolveRef.current = resolve;
      doneRejectRef.current = reject;

      // Timeout fallback
      setTimeout(() => {
        if (doneResolveRef.current) {
          doneRejectRef.current?.(new Error('Voice streaming timed out'));
          doneResolveRef.current = null;
          doneRejectRef.current = null;
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
