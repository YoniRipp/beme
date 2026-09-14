import { act, renderHook } from '@testing-library/react-native';
import { useSpeechRecognition } from '../useSpeechRecognition';

/**
 * `expo-speech-recognition` resolves its native module at import time, so it cannot load
 * under Jest at all — same reason `jest.setup.js` mocks `expo-secure-store`. The mock is
 * local rather than global because this hook is the module's only consumer; move it to
 * `jest.setup.js` when a rendered screen needs it too.
 *
 * What this covers is the hook's state machine and its contract with the native module:
 * that permission is requested before the mic opens, that a denial never reaches `start()`,
 * and that leaving the screen mid-utterance releases the audio session. Whether the
 * recognizer itself produces text can only be checked on a dev client build.
 */
jest.mock('expo-speech-recognition', () => {
  const { useEffect } = require('react');
  const listeners: Record<string, ((event: unknown) => void)[]> = {};

  return {
    __esModule: true,
    __listeners: listeners,
    ExpoSpeechRecognitionModule: {
      isRecognitionAvailable: jest.fn(() => true),
      requestPermissionsAsync: jest.fn(async () => ({ granted: true })),
      start: jest.fn(),
      stop: jest.fn(),
      abort: jest.fn(),
    },
    // Mirrors expo's `useEventListener`: subscribes for the lifetime of the component and
    // re-subscribes each render so the listener never closes over stale state.
    useSpeechRecognitionEvent: (name: string, listener: (event: unknown) => void) => {
      useEffect(() => {
        const bucket = (listeners[name] ??= []);
        bucket.push(listener);
        return () => {
          bucket.splice(bucket.indexOf(listener), 1);
        };
      });
    },
  };
});

type SpeechMock = {
  __listeners: Record<string, ((event: unknown) => void)[]>;
  ExpoSpeechRecognitionModule: {
    isRecognitionAvailable: jest.Mock<boolean, []>;
    requestPermissionsAsync: jest.Mock<Promise<{ granted: boolean }>, []>;
    start: jest.Mock;
    stop: jest.Mock;
    abort: jest.Mock;
  };
};

const speech = jest.requireMock<SpeechMock>('expo-speech-recognition');
const nativeModule = speech.ExpoSpeechRecognitionModule;

/** Fires a native event at every mounted subscriber, the way the real emitter would. */
async function emit(name: string, event?: unknown): Promise<void> {
  await act(async () => {
    for (const listener of [...(speech.__listeners[name] ?? [])]) listener(event);
  });
}

beforeEach(() => {
  for (const key of Object.keys(speech.__listeners)) delete speech.__listeners[key];
  jest.clearAllMocks();
  nativeModule.isRecognitionAvailable.mockReturnValue(true);
  nativeModule.requestPermissionsAsync.mockResolvedValue({ granted: true });
});

describe('useSpeechRecognition', () => {
  it('starts idle with nothing transcribed', async () => {
    const { result } = await renderHook(() => useSpeechRecognition());

    expect(result.current.isAvailable).toBe(true);
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe('');
    expect(result.current.isFinal).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('reports unavailable when the device has no recognizer, instead of throwing on tap', async () => {
    nativeModule.isRecognitionAvailable.mockReturnValue(false);

    const { result } = await renderHook(() => useSpeechRecognition());

    expect(result.current.isAvailable).toBe(false);
  });

  it('reports unavailable when the availability check itself throws', async () => {
    nativeModule.isRecognitionAvailable.mockImplementation(() => {
      throw new Error('unsupported platform');
    });

    const { result } = await renderHook(() => useSpeechRecognition());

    expect(result.current.isAvailable).toBe(false);
  });

  it('requests permission before opening the mic, then starts with the resolved options', async () => {
    const { result } = await renderHook(() =>
      useSpeechRecognition({ lang: 'he-IL', continuous: true, requiresOnDeviceRecognition: true })
    );

    await act(async () => {
      await result.current.startListening();
    });

    expect(nativeModule.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(nativeModule.start).toHaveBeenCalledWith({
      lang: 'he-IL',
      interimResults: true,
      continuous: true,
      requiresOnDeviceRecognition: true,
    });
  });

  it('never opens the mic when permission is denied, and says why', async () => {
    nativeModule.requestPermissionsAsync.mockResolvedValue({ granted: false });

    const { result } = await renderHook(() => useSpeechRecognition());

    await act(async () => {
      await result.current.startListening();
    });

    expect(nativeModule.start).not.toHaveBeenCalled();
    expect(result.current.error).toEqual({
      code: 'not-allowed',
      message: 'Microphone and speech recognition permission is required.',
    });
  });

  it('tracks the recognizer session and surfaces interim then final text', async () => {
    const { result } = await renderHook(() => useSpeechRecognition());

    await emit('start');
    expect(result.current.isListening).toBe(true);

    await emit('result', {
      isFinal: false,
      results: [{ transcript: 'two eggs', confidence: 0.4 }],
    });
    expect(result.current.transcript).toBe('two eggs');
    expect(result.current.isFinal).toBe(false);

    await emit('result', {
      isFinal: true,
      results: [{ transcript: 'two eggs and toast', confidence: 0.9 }],
    });
    expect(result.current.transcript).toBe('two eggs and toast');
    expect(result.current.isFinal).toBe(true);

    await emit('end');
    expect(result.current.isListening).toBe(false);
  });

  it('surfaces a recognizer error and stops listening', async () => {
    const { result } = await renderHook(() => useSpeechRecognition());

    await emit('start');
    await emit('error', { error: 'no-speech', message: 'No speech detected' });

    expect(result.current.error).toEqual({ code: 'no-speech', message: 'No speech detected' });
    expect(result.current.isListening).toBe(false);
  });

  it('clears the previous transcript and error when a new session starts', async () => {
    const { result } = await renderHook(() => useSpeechRecognition());

    await emit('result', { isFinal: true, results: [{ transcript: 'stale', confidence: 1 }] });
    await emit('error', { error: 'network', message: 'Network error' });

    await act(async () => {
      await result.current.startListening();
    });

    expect(result.current.transcript).toBe('');
    expect(result.current.isFinal).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('releases the audio session when unmounted mid-utterance', async () => {
    const { result, unmount } = await renderHook(() => useSpeechRecognition());

    await emit('start');
    expect(result.current.isListening).toBe(true);

    await unmount();

    expect(nativeModule.abort).toHaveBeenCalledTimes(1);
  });

  it('does not abort on unmount when it was never listening', async () => {
    const { unmount } = await renderHook(() => useSpeechRecognition());

    await unmount();

    expect(nativeModule.abort).not.toHaveBeenCalled();
  });
});
