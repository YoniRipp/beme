import { useCallback, useRef, useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

interface UseNativeSpeechOptions {
  language?: string;
  onPartialResult?: (transcript: string) => void;
}

interface UseNativeSpeechReturn {
  isNative: boolean;
  isAvailable: boolean;
  isListening: boolean;
  isProcessing: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<string>;
  currentTranscript: string;
}

/**
 * Hook for native speech recognition using Capacitor plugin.
 * Uses Apple's Speech framework on iOS and Android's Speech API on Android.
 * Returns empty/no-op implementations when not running in a native context.
 */
export function useNativeSpeech(options: UseNativeSpeechOptions = {}): UseNativeSpeechReturn {
  const { language = '', onPartialResult } = options;
  const [isListening, setIsListening] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const transcriptRef = useRef('');
  const isListeningRef = useRef(false);
  const onPartialResultRef = useRef(onPartialResult);

  const isNative = Capacitor.isNativePlatform();

  // Keep onPartialResult ref up to date to avoid stale closures
  useEffect(() => {
    onPartialResultRef.current = onPartialResult;
  }, [onPartialResult]);

  useEffect(() => {
    if (isNative) {
      SpeechRecognition.available().then(({ available }) => {
        setIsAvailable(available);
      }).catch(() => {
        setIsAvailable(false);
      });
    }
  }, [isNative]);

  const startListening = useCallback(async (): Promise<void> => {
    if (!isNative || !isAvailable) {
      throw new Error('Native speech recognition not available');
    }

    // Guard against double start
    if (isListeningRef.current) {
      return;
    }

    const permResult = await SpeechRecognition.requestPermissions();
    if (!permResult.speechRecognition || permResult.speechRecognition === 'denied') {
      throw new Error('Speech recognition permission denied');
    }

    transcriptRef.current = '';
    setCurrentTranscript('');

    // Add listener before starting
    await SpeechRecognition.addListener('partialResults', (data) => {
      const text = data.matches?.[0] ?? '';
      transcriptRef.current = text;
      setCurrentTranscript(text);
      onPartialResultRef.current?.(text);
    });

    try {
      await SpeechRecognition.start({
        language,
        partialResults: true,
        popup: false,
      });
      // Only set listening state AFTER successful start
      isListeningRef.current = true;
      setIsListening(true);
    } catch (e) {
      // Remove listener if start failed
      await SpeechRecognition.removeAllListeners().catch(() => {});
      throw e;
    }
  }, [isNative, isAvailable, language]);

  const stopListening = useCallback(async (): Promise<string> => {
    if (!isNative) return '';

    try {
      await SpeechRecognition.stop();
    } catch {
      // Ignore stop errors
    }

    await SpeechRecognition.removeAllListeners();
    isListeningRef.current = false;
    setIsListening(false);

    return transcriptRef.current;
  }, [isNative]);

  // Cleanup on unmount - use ref to avoid stale closure issues
  useEffect(() => {
    return () => {
      if (isNative && isListeningRef.current) {
        SpeechRecognition.stop().catch(() => {});
        SpeechRecognition.removeAllListeners().catch(() => {});
      }
    };
  }, [isNative]);

  return {
    isNative,
    isAvailable: isNative && isAvailable,
    isListening,
    isProcessing: false,
    startListening,
    stopListening,
    currentTranscript,
  };
}
