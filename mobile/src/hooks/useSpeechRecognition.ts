import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  type ExpoSpeechRecognitionErrorCode,
} from 'expo-speech-recognition';

/**
 * Platform speech recognition — Apple's `SFSpeechRecognizer` on iOS, Android's
 * `SpeechRecognizer` on Android. Audio never reaches a TrackVibe server and no Gemini
 * transcription call is made; the recognizer hands back text directly.
 *
 * REQUIRES A DEV CLIENT. `expo-speech-recognition` resolves its native module at import
 * time, so this file throws inside Expo Go, which does not contain that module. Nothing
 * imports this hook yet, which is why `npm start` still works against Expo Go today — the
 * first screen that imports it is the point of no return. Build with
 * `eas build --profile development` before wiring it into a screen.
 *
 * The surface deliberately mirrors the web's `frontend/src/hooks/useSpeechRecognition.ts`
 * (`isAvailable` / `isListening` / `startListening` / `stopListening`) so the voice-logging
 * flow can be ported across without reshaping its call sites.
 */

export interface UseSpeechRecognitionOptions {
  /** BCP-47 language tag handed to the recognizer. */
  lang?: string;
  /** Stream partial text while the user is still talking, instead of only on the pause. */
  interimResults?: boolean;
  /** Keep listening past the first pause instead of finalising on it. */
  continuous?: boolean;
  /**
   * Force the offline recognizer and fail rather than fall back to the platform's network
   * one. Off by default: iOS needs the locale's offline model downloaded and Android needs
   * `com.google.android.as`, so requiring it turns a working transcript into a
   * `service-not-allowed` error on plenty of real devices. Audio stays out of TrackVibe's
   * backend either way — this flag is only about Apple's and Google's own servers.
   */
  requiresOnDeviceRecognition?: boolean;
}

export interface SpeechRecognitionFailure {
  code: ExpoSpeechRecognitionErrorCode;
  message: string;
}

export interface UseSpeechRecognitionResult {
  /** False when the device has no usable recognizer at all — hide the mic rather than fail on tap. */
  isAvailable: boolean;
  isListening: boolean;
  /** Best transcript so far. Interim until the recognizer finalises, then the final text. */
  transcript: string;
  /** Whether `transcript` is the recognizer's final answer for this utterance. */
  isFinal: boolean;
  error: SpeechRecognitionFailure | null;
  /** Requests permissions if needed, then starts. Resolves once the request is issued. */
  startListening: () => Promise<void>;
  /** Asks for a final result. Use for a deliberate "done" tap. */
  stopListening: () => void;
  /** Drops the session with no final result. Use for cancel. */
  cancelListening: () => void;
}

function readAvailability(): boolean {
  try {
    return ExpoSpeechRecognitionModule.isRecognitionAvailable();
  } catch {
    // Simulators and unsupported platforms can throw rather than answer.
    return false;
  }
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionResult {
  const {
    lang = 'en-US',
    interimResults = true,
    continuous = false,
    requiresOnDeviceRecognition = false,
  } = options;

  const [isAvailable] = useState(readAvailability);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [error, setError] = useState<SpeechRecognitionFailure | null>(null);

  // Read by the unmount cleanup, which must not re-run every time listening toggles.
  const isListeningRef = useRef(false);
  isListeningRef.current = isListening;

  useSpeechRecognitionEvent('start', () => {
    setIsListening(true);
  });

  useSpeechRecognitionEvent('end', () => {
    setIsListening(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    setTranscript(event.results[0]?.transcript ?? '');
    setIsFinal(event.isFinal);
  });

  useSpeechRecognitionEvent('error', (event) => {
    setError({ code: event.error, message: event.message });
    setIsListening(false);
  });

  const startListening = useCallback(async () => {
    setTranscript('');
    setIsFinal(false);
    setError(null);

    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) {
      setError({
        code: 'not-allowed',
        message: 'Microphone and speech recognition permission is required.',
      });
      return;
    }

    ExpoSpeechRecognitionModule.start({
      lang,
      interimResults,
      continuous,
      requiresOnDeviceRecognition,
    });
  }, [lang, interimResults, continuous, requiresOnDeviceRecognition]);

  const stopListening = useCallback(() => {
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const cancelListening = useCallback(() => {
    ExpoSpeechRecognitionModule.abort();
  }, []);

  // Leaving the screen mid-utterance must release the mic, or the audio session stays
  // captured and the next start fails with `busy`.
  useEffect(() => {
    return () => {
      if (isListeningRef.current) {
        ExpoSpeechRecognitionModule.abort();
      }
    };
  }, []);

  return {
    isAvailable,
    isListening,
    transcript,
    isFinal,
    error,
    startListening,
    stopListening,
    cancelListening,
  };
}
