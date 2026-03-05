import { useCallback, useRef, useState, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeSpeech } from './useNativeSpeech';
import { useWebSpeech } from './useWebSpeech';
import { useVoiceStream } from './useVoiceStream';
import { understandTranscript, type VoiceUnderstandResult } from '@/lib/voiceApi';

interface UseSpeechRecognitionOptions {
  language?: string;
  onPartialResult?: (transcript: string) => void;
}

interface UseSpeechRecognitionReturn {
  isNative: boolean;
  isAvailable: boolean;
  isListening: boolean;
  isProcessing: boolean;
  currentTranscript: string;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  getVoiceResult: () => Promise<VoiceUnderstandResult>;
  /** True when using real-time WebSocket streaming instead of batch. */
  isStreaming: boolean;
}

/**
 * Unified speech recognition hook that automatically selects the best
 * implementation based on the platform:
 *
 * - Native iOS/Android: Uses Apple/Android Speech framework (real-time, ~200ms)
 * - Web (streaming): Uses MediaRecorder + WebSocket → Gemini Live API (~200-800ms)
 * - Web (batch fallback): Uses MediaRecorder + backend batch Gemini (~2-3s)
 *
 * Provides a consistent API regardless of the underlying implementation.
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { language = '', onPartialResult } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const lastResultRef = useRef<VoiceUnderstandResult | null>(null);
  const streamingFailedRef = useRef(false);

  const isNative = Capacitor.isNativePlatform();

  const native = useNativeSpeech({ language, onPartialResult });
  const stream = useVoiceStream();
  const web = useWebSpeech({ language, onPartialResult });

  // Priority: native > streaming > batch
  const useNativeImpl = isNative && native.isAvailable;
  const useStreamImpl = !useNativeImpl && stream.isAvailable && !streamingFailedRef.current;

  const impl = useMemo(
    () => (useNativeImpl ? native : useStreamImpl ? stream : web),
    [useNativeImpl, useStreamImpl, native, stream, web]
  );

  const startListening = useCallback(async (): Promise<void> => {
    lastResultRef.current = null;

    if (useStreamImpl) {
      try {
        await stream.startListening();
        return;
      } catch {
        // Streaming failed to connect — fall back to batch for this session
        streamingFailedRef.current = true;
      }
    }

    await impl.startListening();
  }, [impl, useStreamImpl, stream]);

  const stopListening = useCallback(async (): Promise<void> => {
    const transcript = await impl.stopListening();

    if (useNativeImpl) {
      // Native: we have a transcript, send to backend for Gemini understanding
      if (transcript.trim()) {
        setIsProcessing(true);
        try {
          const result = await understandTranscript(transcript, language);
          lastResultRef.current = result;
        } catch (e) {
          console.error('Failed to understand transcript:', e);
          const errorResult: VoiceUnderstandResult = {
            actions: [{ intent: 'unknown', message: e instanceof Error ? e.message : 'Could not understand. Please try again.' }],
          };
          lastResultRef.current = errorResult;
        } finally {
          setIsProcessing(false);
        }
      } else {
        const emptyResult: VoiceUnderstandResult = { actions: [{ intent: 'unknown' }] };
        lastResultRef.current = emptyResult;
      }
    } else if (useStreamImpl) {
      // Streaming: result was set in the stream hook via done message
      const streamResult = await stream.getVoiceResult();
      lastResultRef.current = streamResult;
    } else {
      // Web batch: the result was already processed in useWebSpeech
      const webResult = await web.getVoiceResult();
      lastResultRef.current = webResult;
    }
  }, [impl, useNativeImpl, useStreamImpl, web, stream, language]);

  const getVoiceResult = useCallback(async (): Promise<VoiceUnderstandResult> => {
    return lastResultRef.current ?? { actions: [{ intent: 'unknown' }] };
  }, []);

  return {
    isNative: useNativeImpl,
    isAvailable: impl.isAvailable,
    isListening: impl.isListening,
    isProcessing: isProcessing || impl.isProcessing,
    currentTranscript: impl.currentTranscript,
    startListening,
    stopListening,
    getVoiceResult,
    isStreaming: useStreamImpl && !streamingFailedRef.current,
  };
}
