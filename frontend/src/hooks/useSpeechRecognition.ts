import { useCallback, useRef, useState, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { useNativeSpeech } from './useNativeSpeech';
import { useWebSpeech } from './useWebSpeech';
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
}

/**
 * Unified speech recognition hook that automatically selects the best
 * implementation based on the platform:
 * 
 * - Native iOS/Android: Uses Apple/Android Speech framework (real-time, ~200ms)
 * - Web browsers: Uses MediaRecorder + backend Gemini processing (~2-3s)
 * 
 * Provides a consistent API regardless of the underlying implementation.
 */
export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { language = '', onPartialResult } = options;
  const [isProcessing, setIsProcessing] = useState(false);
  const lastResultRef = useRef<VoiceUnderstandResult | null>(null);

  const isNative = Capacitor.isNativePlatform();

  const native = useNativeSpeech({ language, onPartialResult });
  const web = useWebSpeech({ language, onPartialResult });

  // Memoize implementation selection to prevent callback recreation every render
  const useNativeImpl = isNative && native.isAvailable;
  const impl = useMemo(
    () => (useNativeImpl ? native : web),
    [useNativeImpl, native, web]
  );

  const startListening = useCallback(async (): Promise<void> => {
    lastResultRef.current = null;
    await impl.startListening();
  }, [impl]);

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
    } else {
      // Web: the result was already processed in useWebSpeech
      const webResult = await web.getVoiceResult();
      lastResultRef.current = webResult;
    }
  }, [impl, useNativeImpl, web, language]);

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
  };
}
