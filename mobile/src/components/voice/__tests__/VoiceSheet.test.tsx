import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { useSpeechRecognition } from '../../../hooks/useSpeechRecognition';
import { voiceApi } from '../../../core/api/voice';
import { ApiError } from '../../../core/api/client';
import { QUOTA_EXHAUSTED_CODE } from '../../../lib/voiceCommandState';
import { VoiceSheet } from '../VoiceSheet';

/**
 * The hook is mocked rather than the native module, and the API is mocked rather than the
 * transport.
 *
 * `expo-speech-recognition` resolves its native module at import time, so standing it up here
 * would mean reproducing the emitter too — which is `useSpeechRecognition.test.ts`'s job and
 * is already done there. What this file is responsible for is the other half: given what the
 * recognizer and the server report, which of the sheet's states appears, and what it offers
 * to tap.
 *
 * The states below are chosen because they are easy to collapse into each other and each
 * collapse is wrong differently — and because with `AI_MONTHLY_LIMIT` defaulting to 10 and
 * `requireAiQuota` debiting before the handler, getting one wrong costs the user real calls:
 *
 *   - nothing sends on mount, or on a transcript arriving;
 *   - a refused microphone is NOT an unsupported device and NOT a server error;
 *   - a quota refusal is NOT a generic failure, and must not offer a retry that cannot work;
 *   - a 200 that parsed nothing is NOT a success, and still cost a call;
 *   - a failure retries only when a human presses the button;
 *   - a reopened sheet is NOT still holding the last sentence.
 */
jest.mock('../../../hooks/useSpeechRecognition', () => ({ useSpeechRecognition: jest.fn() }));
jest.mock('../../../core/api/voice', () => ({
  ...jest.requireActual('../../../core/api/voice'),
  voiceApi: { understand: jest.fn() },
}));

const mockUseSpeechRecognition = useSpeechRecognition as jest.Mock;
const mockUnderstand = voiceApi.understand as jest.Mock;

/**
 * The provider stack is real (settings from AsyncStorage, then the resolved Paper theme), so
 * the first render in a worker also pays for babel-transforming that whole module graph.
 * Jest's 5s default is a budget for that, not for the assertion — the same reason
 * `MobileGoalCard.test.tsx` raises it.
 */
jest.setTimeout(30_000);

/** Typed against the hook's real return so each override below still has to typecheck. */
type SpeechHook = ReturnType<typeof useSpeechRecognition>;

const idleSpeech: SpeechHook = {
  isAvailable: true,
  isListening: false,
  transcript: '',
  isFinal: false,
  error: null,
  startListening: jest.fn(async () => {}),
  stopListening: jest.fn(),
  cancelListening: jest.fn(),
};

const withSpeech = (overrides: Partial<SpeechHook> = {}) =>
  mockUseSpeechRecognition.mockReturnValue({
    ...idleSpeech,
    startListening: jest.fn(async () => {}),
    stopListening: jest.fn(),
    cancelListening: jest.fn(),
    ...overrides,
  });

/**
 * `await render(...)`: RNTL 14 made render async, and the provider stack resolves
 * asynchronously on top of that, so every query has to be a `findBy*`. A synchronous `getBy*`
 * can corrupt React 19's act queue and leave every later query in the file timing out against
 * an empty tree. `rerender` is async for the same reason, and `update` below keeps that await
 * in one place.
 *
 * EVERY PRESS IS AWAITED TOO. `fireEvent.press` returns a promise in RNTL 14
 * (`fire-event.d.ts`), and that promise carries the act scope — the send handler `await`s the
 * API, so without the await its `setOutcome`/`setSending` land outside any act scope, which
 * React reports as "The current testing environment is not configured to support act(...)"
 * and which leaves each assertion racing the state update it is about to check.
 *
 * A QueryClient per render, retries off: the sheet calls `useQueryClient()` to invalidate the
 * caches the server wrote behind React Query's back, and a shared one would carry
 * invalidations between cases.
 */
const renderSheet = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const onDismiss = jest.fn();
  const tree = (visible: boolean) => (
    <QueryClientProvider client={queryClient}>
      <SettingsProvider>
        <ThemeProvider>
          <VoiceSheet visible={visible} onDismiss={onDismiss} />
        </ThemeProvider>
      </SettingsProvider>
    </QueryClientProvider>
  );
  const r = await render(tree(true));
  /** Re-render after changing what the mocked hook returns, or after toggling `visible`. */
  const update = (visible = true) => r.rerender(tree(visible));
  return { ...r, onDismiss, update };
};

/**
 * Drive the sheet to the state where a transcript is waiting to be sent, THE WAY A USER GETS
 * THERE: the recognizer runs, then it finalises.
 *
 * A test cannot teleport a transcript in by mocking one, and that is deliberate rather than
 * awkward — the sheet ignores any transcript it did not just ask for (`captureStarted`),
 * because the hook's text outlives the sheet and a reopened sheet must not offer the previous
 * sentence to send.
 */
const renderWithTranscript = async (text: string) => {
  withSpeech({ isListening: true, transcript: text });
  const r = await renderSheet();
  withSpeech({ transcript: text, isFinal: true });
  await r.update();
  return r;
};

beforeEach(() => {
  mockUseSpeechRecognition.mockReset();
  mockUnderstand.mockReset();
  mockUnderstand.mockResolvedValue({ actions: [], results: [] });
});

describe('before anything is said', () => {
  it('offers the microphone and states the price up front', async () => {
    withSpeech();
    const r = await renderSheet();

    expect(await r.findByLabelText('Start listening')).toBeTruthy();
    // Same wording as the insights screen. A control that quietly spends a tenth of ten is
    // not a control a user can consent to.
    expect(await r.findByText(/Uses one of your monthly AI calls/i)).toBeTruthy();
  });

  it('does not send anything just because it rendered', async () => {
    withSpeech();
    await renderSheet();

    expect(mockUnderstand).not.toHaveBeenCalled();
  });

  it('says the audio stays on the device, which is the reason this flow exists', async () => {
    withSpeech();
    const r = await renderSheet();

    expect(await r.findByText(/audio never leaves it/i)).toBeTruthy();
  });
});

describe('while listening', () => {
  it('shows the interim transcript rather than an opaque spinner', async () => {
    withSpeech({ isListening: true, transcript: 'I ate two hundred grams of' });
    const r = await renderSheet();

    expect(await r.findByText('Listening…')).toBeTruthy();
    expect(await r.findByText('I ate two hundred grams of')).toBeTruthy();
  });

  it('offers a deliberate stop, and does not send on its own', async () => {
    const stopListening = jest.fn();
    withSpeech({ isListening: true, transcript: 'slept seven hours', stopListening });
    const r = await renderSheet();

    await fireEvent.press(await r.findByLabelText('Stop listening'));

    expect(stopListening).toHaveBeenCalledTimes(1);
    expect(mockUnderstand).not.toHaveBeenCalled();
  });
});

describe('once a transcript has arrived', () => {
  /**
   * The load-bearing case for the whole design. A recognizer that mis-hears is normal; one
   * that mis-hears and immediately spends a tenth of the month is not, so the transcript
   * arriving must be a review step and nothing else.
   */
  it('waits for a press instead of sending the moment it hears something', async () => {
    const r = await renderWithTranscript('I ate 200 grams of rice');

    expect(await r.findByText('I ate 200 grams of rice')).toBeTruthy();
    expect(await r.findByLabelText('Send voice command')).toBeTruthy();
    expect(mockUnderstand).not.toHaveBeenCalled();
  });

  it('reports what the server did, in the words the server used', async () => {
    mockUnderstand.mockResolvedValue({
      actions: [{ intent: 'add_food' }],
      results: [{ intent: 'add_food', success: true, message: 'Added rice (200g)' }],
    });
    const r = await renderWithTranscript('I ate 200 grams of rice');

    await fireEvent.press(await r.findByLabelText('Send voice command'));

    expect(await r.findByText('Added rice (200g)')).toBeTruthy();
    expect(await r.findByText('Logged')).toBeTruthy();
    expect(mockUnderstand).toHaveBeenCalledTimes(1);
  });

  it('sends only the text, and the locale it listened in', async () => {
    const r = await renderWithTranscript('slept 7 hours');

    await fireEvent.press(await r.findByLabelText('Send voice command'));
    await r.findByLabelText('Done');

    expect(mockUnderstand).toHaveBeenCalledWith('slept 7 hours', { lang: 'en-US' });
  });

  /**
   * A 200 carrying only `{ intent: 'unknown' }` is what Gemini answers when it cannot parse
   * the sentence (`services/voice.ts:fallbackOrUnknown`). It is not a failure, it is not a
   * success, and the call is gone either way — so the one thing it must not do is look like
   * either of the other two.
   */
  it('treats an unparsed command as its own outcome, and says the call was spent', async () => {
    mockUnderstand.mockResolvedValue({
      actions: [{ intent: 'unknown' }],
      results: [{ intent: 'unknown', success: false, message: 'Could not understand' }],
    });
    const r = await renderWithTranscript('mmm hmm yes');

    await fireEvent.press(await r.findByLabelText('Send voice command'));

    expect(await r.findByText(/could not turn that into an entry/i)).toBeTruthy();
    expect(await r.findByText(/still used one of your monthly AI calls/i)).toBeTruthy();
    // Not dressed as breakage, and not dressed as a save.
    expect(r.queryByText('Logged')).toBeNull();
  });

  /**
   * The hook's `transcript` outlives the sheet — it is only cleared by the next
   * `startListening()`. So without a session flag, reopening after a successful command lands
   * in the review state holding the previous sentence, one tap from spending another call on
   * a command nobody just gave.
   */
  it('does not re-offer the previous sentence when the sheet is reopened', async () => {
    const r = await renderWithTranscript('I ate 200 grams of rice');
    await fireEvent.press(await r.findByLabelText('Send voice command'));
    await r.findByLabelText('Done');

    await r.update(false);
    await r.update(true);

    expect(await r.findByLabelText('Start listening')).toBeTruthy();
    expect(r.queryByText('I ate 200 grams of rice')).toBeNull();
    expect(r.queryByLabelText('Send voice command')).toBeNull();
  });
});

describe('when the microphone will not work', () => {
  /**
   * Refused and unavailable are different sentences with different next steps. Sending a user
   * with a working microphone into Settings to fix a permission that is already granted is
   * the collapse this pins.
   */
  it('sends a refused permission to Settings, and offers nothing to tap that cannot help', async () => {
    withSpeech({ error: { code: 'not-allowed', message: 'denied' } });
    const r = await renderSheet();

    expect(await r.findByText('Microphone access is off')).toBeTruthy();
    expect(await r.findByText(/speech recognition/i)).toBeTruthy();
    // iOS prompts once per install; a Try again would silently do nothing forever.
    expect(r.queryByLabelText('Start listening')).toBeNull();
  });

  it('reports a device with no recognizer as unsupported, not as a permission problem', async () => {
    withSpeech({ isAvailable: false });
    const r = await renderSheet();

    expect(await r.findByText('Voice is not available on this device')).toBeTruthy();
    expect(r.queryByText('Microphone access is off')).toBeNull();
    expect(r.queryByLabelText('Start listening')).toBeNull();
  });

  it('lets the user try again after the recognizer simply heard nothing', async () => {
    withSpeech({ error: { code: 'no-speech', message: 'no speech' } });
    const r = await renderSheet();

    expect(await r.findByText('I did not catch that')).toBeTruthy();
    // The one microphone state where tapping again is the right move.
    expect(await r.findByLabelText('Start listening')).toBeTruthy();
  });

  it("does not report the user's own cancellation back to them as an error", async () => {
    withSpeech({ error: { code: 'aborted', message: 'aborted' } });
    const r = await renderSheet();

    // Straight back to the idle offer, with no panel claiming something went wrong.
    expect(await r.findByLabelText('Start listening')).toBeTruthy();
    expect(r.queryByText(/stopped unexpectedly/i)).toBeNull();
  });
});

describe('when the server refuses', () => {
  /**
   * The refusal that costs money to get wrong. `requireAiQuota` debits before the handler, so
   * a Retry against an exhausted allowance spends another call to be refused identically —
   * and the raw code must never reach the screen, because the transport hands it over as
   * `ApiError.message`.
   */
  it('explains the monthly limit and offers no retry', async () => {
    mockUnderstand.mockRejectedValue(new ApiError(QUOTA_EXHAUSTED_CODE, 403));
    const r = await renderWithTranscript('I ate rice');

    await fireEvent.press(await r.findByLabelText('Send voice command'));

    expect(await r.findByText("You've used this month's AI calls")).toBeTruthy();
    expect(r.queryByLabelText('Send again')).toBeNull();
    // The machine code is a contract with the backend, not copy.
    expect(r.queryByText(QUOTA_EXHAUSTED_CODE)).toBeNull();
    expect(r.queryByText(/Could not send that command/i)).toBeNull();
  });

  /**
   * A generic failure DOES get a retry — but only one a human presses, labelled with what it
   * costs. Nothing on this surface retries by itself, which is why the send is a plain call
   * rather than a `useMutation` whose defaults could decide otherwise.
   */
  it('retries only when a person presses the button, and prices the button', async () => {
    mockUnderstand.mockRejectedValue(new ApiError('Failed to understand voice', 502));
    const r = await renderWithTranscript('I ate rice');

    await fireEvent.press(await r.findByLabelText('Send voice command'));

    expect(await r.findByText('Could not send that command')).toBeTruthy();
    expect(mockUnderstand).toHaveBeenCalledTimes(1);

    const again = await r.findByLabelText('Send again');
    expect(await r.findByText(/Send again \(1 call\)/)).toBeTruthy();

    await fireEvent.press(again);
    await r.findByText('Could not send that command');
    expect(mockUnderstand).toHaveBeenCalledTimes(2);
  });

  it('tells the user the failed attempt was already charged', async () => {
    mockUnderstand.mockRejectedValue(new ApiError('Failed to understand voice', 502));
    const r = await renderWithTranscript('I ate rice');

    await fireEvent.press(await r.findByLabelText('Send voice command'));

    expect(await r.findByText(/already used one of your monthly AI calls/i)).toBeTruthy();
  });

  /**
   * `VOICE_EXECUTE_ON_SERVER=false` answers parsed actions and no `results`
   * (`services/voice.ts:maybeExecuteAndPublish`). Nothing was written, and this client has no
   * executor of its own — so reporting the intents as a receipt would be a lie about the
   * user's data.
   */
  it('does not claim a save when the server parsed but executed nothing', async () => {
    mockUnderstand.mockResolvedValue({ actions: [{ intent: 'add_food', food: 'rice' }] });
    const r = await renderWithTranscript('I ate rice');

    await fireEvent.press(await r.findByLabelText('Send voice command'));

    expect(await r.findByText('Understood, but nothing was saved')).toBeTruthy();
    expect(r.queryByText('Logged')).toBeNull();
  });
});
