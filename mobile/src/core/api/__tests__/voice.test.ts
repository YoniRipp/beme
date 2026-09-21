import {
  UNDERSTAND_TIMEOUT_MS,
  buildUnderstandBody,
  getDeviceTimezone,
  voiceApi,
} from '../voice';

const mockRequest = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

/**
 * Wiring coverage for the voice slice, in the shape `health.test.ts` and `aiInsights`-style
 * slices already use: what path is hit, what reaches the body, and what does not.
 *
 * "What does not" carries more weight here than anywhere else in this directory, for two
 * reasons. `/api/voice/understand` debits one of the user's ten monthly AI calls in
 * middleware before the handler runs (`backend/src/middleware/aiAccess.ts`), so a body the
 * server rejects is not a 400 the client can shrug off — it is a tenth of the month spent on
 * a validation error. And the same endpoint accepts base64 audio on another branch, so
 * "sends no audio" is a privacy claim about this client that only a test can keep true.
 */
beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue({ actions: [], results: [] });
});

describe('voiceApi.understand', () => {
  it('posts the transcript to the endpoint the route actually mounts', async () => {
    await voiceApi.understand('I ate 200 grams of rice', { lang: 'en-US' });

    const [path, options] = mockRequest.mock.calls[0];
    expect(path).toBe('/api/voice/understand');
    expect(options.method).toBe('POST');
    expect(options.body.transcript).toBe('I ate 200 grams of rice');
  });

  /**
   * The privacy property, as a test rather than a sentence in a docblock.
   *
   * `controllers/voice.ts` checks `audio` FIRST and, when it is present, enqueues a Redis job
   * instead of parsing — so an `audio` key appearing here would not just leak the microphone
   * stream to a TrackVibe server, it would silently change which half of the endpoint this
   * client is talking to and break every caller expecting a synchronous result.
   */
  it('sends only text — never audio, which is the whole point of on-device recognition', async () => {
    await voiceApi.understand('slept 7 hours', { lang: 'en-US' });

    const [, options] = mockRequest.mock.calls[0];
    expect(Object.keys(options.body).sort()).toEqual(['lang', 'timezone', 'today', 'transcript']);
    expect(options.body).not.toHaveProperty('audio');
    expect(options.body).not.toHaveProperty('mimeType');
  });

  /**
   * The transport's default is 30s and the server can take longer: a Gemini function-calling
   * round trip plus a USDA lookup per food item inside `executeActions`. Aborting does not
   * abort the server — it finishes, writes the rows, and keeps the call it already charged —
   * so a short timeout reports a failure for work that succeeded and invites a second debit.
   */
  it('waits longer than the transport default, because a timeout here is worse than waiting', async () => {
    await voiceApi.understand('logged a workout', { lang: 'en-US' });

    const [, options] = mockRequest.mock.calls[0];
    expect(options.timeoutMs).toBe(UNDERSTAND_TIMEOUT_MS);
    expect(UNDERSTAND_TIMEOUT_MS).toBeGreaterThan(30_000);
  });

  it('declares the locale the recognizer actually listened in', async () => {
    await voiceApi.understand('hello', { lang: 'he-IL' });

    expect(mockRequest.mock.calls[0][1].body.lang).toBe('he-IL');
  });
});

describe('buildUnderstandBody', () => {
  /**
   * Both cases are local times that straddle a day boundary, so in any zone other than UTC at
   * least one of them disagrees with `new Date().toISOString().slice(0, 10)` — which is
   * exactly the fallback the server applies when `today` is absent or malformed
   * (`services/voice.ts:parseTranscript`). East of UTC the late one slips forward a day and
   * files tonight's dinner under tomorrow; west of UTC the early one slips back.
   */
  it.each([
    ['just before midnight', new Date(2026, 0, 31, 23, 45), '2026-01-31'],
    ['just after midnight', new Date(2026, 1, 1, 0, 15), '2026-02-01'],
  ])('dates the command by the local calendar day (%s)', (_label, now, expected) => {
    expect(buildUnderstandBody('x', { lang: 'en-US', now, timezone: 'UTC' }).today).toBe(expected);
  });

  /**
   * An empty transcript is a 400 from the controller — AFTER `requireAiQuota` has debited. So
   * whitespace has to be gone before the request exists, not diagnosed from the response.
   */
  it('trims, so a transcript of spaces is visibly empty to the caller that guards on it', () => {
    expect(buildUnderstandBody('   ate rice  ', { lang: 'en-US' }).transcript).toBe('ate rice');
    expect(buildUnderstandBody('   ', { lang: 'en-US' }).transcript).toBe('');
  });
});

describe('getDeviceTimezone', () => {
  it('reports the zone when the runtime has one', () => {
    // Not asserting a specific name — the value is the machine's, and pinning one would make
    // this test a property of whoever's laptop ran it.
    expect(typeof getDeviceTimezone()).toBe('string');
    expect(getDeviceTimezone().length).toBeGreaterThan(0);
  });

  /**
   * Hermes ships `Intl`, but a stripped ICU build can resolve `timeZone` to nothing or throw
   * outright. The server re-validates and drops an unusable zone anyway
   * (`controllers/voice.ts:isValidTimezone`), so degrading to 'UTC' matches what it would do
   * — where throwing here would fail a request that had already been charged.
   */
  it("falls back to UTC rather than throwing when the runtime has no ICU", () => {
    const real = Intl.DateTimeFormat;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Intl as any).DateTimeFormat = () => {
      throw new Error('no ICU in this build');
    };
    try {
      expect(getDeviceTimezone()).toBe('UTC');
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (Intl as any).DateTimeFormat = real;
    }
  });
});
