import { useCallback, useRef, useState, useEffect } from 'react';
import { submitVoiceAudio, pollForVoiceResult, blobToBase64, getPreferredAudioMimeType, type VoiceUnderstandResult } from '@/lib/voiceApi';

interface UseWebSpeechOptions {
  language?: string;
  onPartialResult?: (transcript: string) => void;
}

interface UseWebSpeechReturn {
  isNative: boolean;
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
 * Hook for web-based speech recognition using MediaRecorder + backend processing.
 * Falls back to this when native speech recognition is not available.
 * Records audio, sends to backend for Gemini transcription + understanding.
 */
export function useWebSpeech(options: UseWebSpeechOptions = {}): UseWebSpeechReturn {
  const { onPartialResult } = options;
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const lastResultRef = useRef<VoiceUnderstandResult | null>(null);
  const isMountedRef = useRef(true);
  const isListeningRef = useRef(false);

  const isAvailable = isMediaRecorderSupported();

  // Cleanup helper to stop stream and recorder
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch {
        // Ignore
      }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
    isListeningRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  const startListening = useCallback(async (): Promise<void> => {
    if (!isAvailable) {
      throw new Error('MediaRecorder not supported in this browser');
    }

    // Guard against double start
    if (isListeningRef.current) {
      return;
    }

    audioChunksRef.current = [];
    lastResultRef.current = null;

    let stream: MediaStream | null = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getPreferredAudioMimeType();

      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onerror = () => {
        cleanup();
        if (isMountedRef.current) {
          setIsListening(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      isListeningRef.current = true;
      setIsListening(true);

      // Signal that we're recording (no real-time transcript for MediaRecorder)
      onPartialResult?.('Recording...');
    } catch (e) {
      // Clean up stream if MediaRecorder constructor or start failed
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      let msg: string;
      if (e instanceof Error) {
        if (e.name === 'NotAllowedError') {
          msg = 'Microphone access denied. Please allow microphone permission in your browser.';
        } else if (e.name === 'NotFoundError') {
          msg = 'No microphone found. Connect a microphone and try again.';
        } else if (e.name === 'NotReadableError') {
          msg = 'Microphone is in use by another application.';
        } else {
          msg = e.message;
        }
      } else {
        msg = 'Could not access microphone. Please check your browser permissions.';
      }
      throw new Error(msg);
    }
  }, [isAvailable, onPartialResult, cleanup]);

  const stopListening = useCallback(async (): Promise<string> => {
    return new Promise((resolve, reject) => {
      const recorder = mediaRecorderRef.current;
      const stream = streamRef.current;

      if (!recorder || recorder.state === 'inactive') {
        isListeningRef.current = false;
        if (isMountedRef.current) {
          setIsListening(false);
        }
        resolve('');
        return;
      }

      recorder.onstop = async () => {
        // Stop all tracks
        stream?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        mediaRecorderRef.current = null;
        isListeningRef.current = false;
        if (isMountedRef.current) {
          setIsListening(false);
        }

        // Process the recording
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });

        if (blob.size === 0) {
          resolve('');
          return;
        }

        if (isMountedRef.current) {
          setIsProcessing(true);
        }

        try {
          const base64 = await blobToBase64(blob);
          const { jobId } = await submitVoiceAudio(base64, mimeType);
          const result = await pollForVoiceResult(jobId);
          lastResultRef.current = result;

          // Extract transcript from the first action if available
          const firstAction = result.actions[0];
          let transcript = '';
          if (firstAction && firstAction.intent !== 'unknown') {
            transcript = `Processed: ${firstAction.intent}`;
          }

          if (isMountedRef.current) {
            setIsProcessing(false);
          }
          resolve(transcript);
        } catch (e) {
          if (isMountedRef.current) {
            setIsProcessing(false);
          }
          reject(e);
        }
      };

      recorder.stop();
    });
  }, []);

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
    currentTranscript: '',
    getVoiceResult,
  };
}
