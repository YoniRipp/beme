import { ApiError } from '../../core/api/client';
import {
  MIC_UNSUPPORTED,
  QUOTA_EXHAUSTED_CODE,
  classifyMicFailure,
  classifyVoiceFailure,
  invalidationRootsFor,
  summariseVoiceOutcome,
} from '../voiceCommandState';

/**
 * The rules the voice sheet renders, pinned without a render.
 *
 * Each case below is a pair of outcomes that arrive looking alike and mean different things.
 * The sheet's whole job is telling them apart, and every collapse is a specific way to
 * mislead someone who has just spent a tenth of their monthly AI allowance.
 */

describe('classifyVoiceFailure', () => {
  /**
   * The quota refusal reaches this client as `ApiError('free_quota_exhausted', 403)` — the
   * transport unwraps `payload.error`, which for this one body is the machine code rather
   * than a nested object (`packages/shared/src/api/transport.ts:errorMessageFrom`). A screen
   * rendering `error.message` shows the user the literal string `free_quota_exhausted`.
   */
  it('recognises the quota refusal and never shows the user its machine code', () => {
    const failure = classifyVoiceFailure(new ApiError(QUOTA_EXHAUSTED_CODE, 403));

    expect(failure?.kind).toBe('quota');
    expect(failure?.title).not.toContain(QUOTA_EXHAUSTED_CODE);
    expect(failure?.detail).not.toContain(QUOTA_EXHAUSTED_CODE);
  });

  it('explains that the allowance is shared and monthly, rather than saying "error"', () => {
    const failure = classifyVoiceFailure(new ApiError(QUOTA_EXHAUSTED_CODE, 403));

    expect(failure?.detail).toMatch(/month/i);
    // Voice is not billed alone — chat, insights and food lookup draw on the same ten.
    expect(failure?.detail).toMatch(/chat|insights|food/i);
  });

  /**
   * Not retryable, and this is the one that costs money to get wrong: `requireAiQuota` debits
   * BEFORE the handler, so a Retry against an exhausted allowance spends another call to be
   * refused identically.
   */
  it('offers no retry for quota, an unconfigured server or an expired session', () => {
    expect(classifyVoiceFailure(new ApiError(QUOTA_EXHAUSTED_CODE, 403))?.retryable).toBe(false);
    expect(classifyVoiceFailure(new ApiError('Voice service not configured', 503))?.retryable).toBe(false);
    expect(classifyVoiceFailure(new ApiError('Session expired', 401))?.retryable).toBe(false);
  });

  it('does not name an environment variable at the person holding the phone', () => {
    // The server's own 503 message is "Voice service not configured (missing GEMINI_API_KEY)".
    const failure = classifyVoiceFailure(new ApiError('Voice service not configured (missing GEMINI_API_KEY)', 503));

    expect(failure?.kind).toBe('unconfigured');
    expect(`${failure?.title} ${failure?.detail}`).not.toMatch(/GEMINI_API_KEY/);
  });

  /**
   * A plain `Error` carrying the code, not an `ApiError`, is what a future transport change
   * or a hand-built rejection would produce. Branching on status alone would classify it as
   * generic and offer a Retry that cannot work.
   */
  it('matches the quota code even without a status to read', () => {
    expect(classifyVoiceFailure(new Error(QUOTA_EXHAUSTED_CODE))?.kind).toBe('quota');
  });

  it('is the only kind that offers a retry, and says what the retry costs', () => {
    const failure = classifyVoiceFailure(new ApiError('Failed to understand voice', 502));

    expect(failure?.kind).toBe('generic');
    expect(failure?.retryable).toBe(true);
    // The failed attempt was already debited. A user pressing Try again four times without
    // being told that loses nearly half their month.
    expect(failure?.detail).toMatch(/already used one/i);
  });

  it('returns null for no error at all, so a caller can pass its state straight through', () => {
    expect(classifyVoiceFailure(null)).toBeNull();
    expect(classifyVoiceFailure(undefined)).toBeNull();
  });
});

describe('classifyMicFailure', () => {
  /**
   * `aborted` is what `cancelListening()` raises — the sheet's own Cancel button. Reporting a
   * user's cancellation back to them as a microphone error is the most obvious way to get
   * this wrong, and the hook cannot distinguish it for us: it sets `error` either way.
   */
  it('says nothing when the user cancelled, which is not a failure', () => {
    expect(classifyMicFailure({ code: 'aborted' })).toBeNull();
    expect(classifyMicFailure(null)).toBeNull();
  });

  /**
   * iOS shows its permission prompt once per install, so after a denial
   * `requestPermissionsAsync` resolves `granted: false` without asking again — a Try again
   * button would be a control that silently does nothing, forever.
   */
  it('treats a refused permission as a trip to Settings, not as something to retry', () => {
    const failure = classifyMicFailure({ code: 'not-allowed' });

    expect(failure?.kind).toBe('denied');
    expect(failure?.canRetry).toBe(false);
    expect(failure?.detail).toMatch(/settings/i);
  });

  /** Both permissions, because iOS asks for them separately and either refusal lands here. */
  it('names both permissions iOS asks for, not just the microphone', () => {
    const failure = classifyMicFailure({ code: 'not-allowed' });

    expect(failure?.detail).toMatch(/microphone/i);
    expect(failure?.detail).toMatch(/speech recognition/i);
  });

  /**
   * "The device cannot" and "the user said no" are different sentences with different next
   * steps, and the recognizer reports them as different codes. Collapsing them sends a user
   * with a working microphone into Settings to fix a permission that is already granted.
   */
  it.each([['service-not-allowed'], ['language-not-supported']])(
    'separates an unavailable recognizer (%s) from a refused one',
    (code) => {
      const failure = classifyMicFailure({ code });

      expect(failure?.kind).toBe('unsupported');
      expect(failure?.canRetry).toBe(false);
    }
  );

  /**
   * Hearing nothing is a routine outcome of holding a phone at arm's length, not breakage —
   * and it is the only microphone state where tapping again is exactly the right move.
   */
  it.each([['no-speech'], ['speech-timeout']])('treats silence (%s) as retryable, not broken', (code) => {
    const failure = classifyMicFailure({ code });

    expect(failure?.kind).toBe('silent');
    expect(failure?.canRetry).toBe(true);
  });

  /**
   * `network` here is Apple's or Google's recognition service, since the hook leaves
   * `requiresOnDeviceRecognition` off by default. Saying "the device recognizer" rather than
   * "the server" keeps a user from reporting a TrackVibe outage that is not happening.
   */
  it('blames the device recognizer for its own network, not the TrackVibe backend', () => {
    const failure = classifyMicFailure({ code: 'network' });

    expect(failure?.kind).toBe('failed');
    expect(failure?.title).toMatch(/device recognizer/i);
  });

  it('has an answer for a code it has never seen', () => {
    // The union grows with the library; an unmapped code must still produce copy rather than
    // an empty panel.
    const failure = classifyMicFailure({ code: 'something-the-library-added-later' });

    expect(failure?.kind).toBe('failed');
    expect(failure?.title.length).toBeGreaterThan(0);
  });

  it('never puts the recognizer\'s own message on screen', () => {
    // The platform writes "Error: 7" and "retry" into `message`. That is debugging output.
    for (const code of ['busy', 'audio-capture', 'client', 'interrupted', 'unknown']) {
      const failure = classifyMicFailure({ code });
      expect(failure?.title).not.toMatch(/error: \d/i);
    }
  });

  it('offers nothing to tap when the device has no recognizer at all', () => {
    expect(MIC_UNSUPPORTED.canRetry).toBe(false);
    expect(MIC_UNSUPPORTED.kind).toBe('unsupported');
  });
});

describe('summariseVoiceOutcome', () => {
  /**
   * THE ORDERING CASE. Gemini answering nothing usable comes back as a 200 carrying
   * `{ actions: [{ intent: 'unknown' }] }` (`services/voice.ts:fallbackOrUnknown`), which
   * `voiceExecutor.executeOne` turns into an ordinary-looking failed result. Counted rather
   * than recognised, "I could not parse your sentence" renders as "an action failed" — which
   * sends the user hunting for a broken feature instead of rephrasing.
   */
  it('recognises an unparsed command instead of counting it as a failed action', () => {
    const outcome = summariseVoiceOutcome({
      actions: [{ intent: 'unknown' }],
      results: [{ intent: 'unknown', success: false, message: 'Could not understand' }],
    });

    expect(outcome.kind).toBe('not-understood');
    expect(outcome.kind).not.toBe('failed');
  });

  it('says a call was spent on a command it could not parse, because that is the surprise', () => {
    const outcome = summariseVoiceOutcome({ actions: [{ intent: 'unknown' }] });

    expect(outcome.lines.join(' ')).toMatch(/nothing was logged/i);
    expect(outcome.lines.join(' ')).toMatch(/AI call/i);
  });

  /**
   * `results` is absent exactly when `VOICE_EXECUTE_ON_SERVER=false`
   * (`services/voice.ts:maybeExecuteAndPublish`), and this client has no executor of its own.
   * Listing the parsed intents as though they were done is the failure mode: "Add food" reads
   * as a receipt, not as a plan nobody carried out.
   */
  it('does not report parsed-but-unexecuted actions as logged', () => {
    const outcome = summariseVoiceOutcome({ actions: [{ intent: 'add_food', food: 'rice' }] });

    expect(outcome.kind).toBe('not-applied');
    expect(outcome.title).toMatch(/nothing was saved/i);
  });

  it('reports what the executor actually wrote, in the executor\'s own words', () => {
    const outcome = summariseVoiceOutcome({
      actions: [{ intent: 'log_weight' }],
      results: [{ intent: 'log_weight', success: true, message: 'Logged weight: 72.5 kg' }],
    });

    expect(outcome.kind).toBe('applied');
    expect(outcome.lines).toEqual(['Logged weight: 72.5 kg']);
  });

  /**
   * A partial result is its own state. "Saved 1 of 2" is actionable; "Logged" hides a missing
   * entry and "Nothing could be saved" tells the user to redo work that is already done —
   * which, on this endpoint, costs another call.
   */
  it('separates a partial result from both success and total failure', () => {
    const outcome = summariseVoiceOutcome({
      actions: [{ intent: 'add_food' }, { intent: 'edit_workout' }],
      results: [
        { intent: 'add_food', success: true, message: 'Added rice' },
        { intent: 'edit_workout', success: false, message: 'Workout not found' },
      ],
    });

    expect(outcome.kind).toBe('partial');
    expect(outcome.title).toBe('Saved 1 of 2');
    expect(outcome.lines).toEqual(['Added rice', 'Workout not found']);
  });

  it('reports a wholly failed execution as such, without calling it unparsed', () => {
    const outcome = summariseVoiceOutcome({
      actions: [{ intent: 'delete_goal' }],
      results: [{ intent: 'delete_goal', success: false, message: 'Goal not found' }],
    });

    expect(outcome.kind).toBe('failed');
  });

  it('handles a null body rather than rendering a card with nothing in it', () => {
    expect(summariseVoiceOutcome(null).kind).toBe('not-understood');
  });
});

describe('invalidationRootsFor', () => {
  /**
   * The server writes straight to the database (`services/voiceExecutor.ts`), so React Query
   * here has no idea anything happened. Without an invalidation the meal the user just logged
   * by voice is absent from Home, and the reasonable conclusion is that voice failed.
   */
  it('names the caches a logged meal actually moved', () => {
    const roots = invalidationRootsFor([{ intent: 'add_food', success: true }]);

    expect(roots).toContain('foodEntries');
    expect(roots).toContain('streaks');
  });

  /** A failed action wrote nothing; refetching on it spends a round trip to re-read stale-free data. */
  it('ignores actions that failed, which moved nothing', () => {
    expect(invalidationRootsFor([{ intent: 'add_food', success: false }])).toEqual([]);
  });

  /**
   * Two food actions in one command must not produce two identical refetches — and the whole
   * point of deriving roots rather than calling `invalidateQueries()` bare is that a bare
   * call refetches every active query in the app over a phone connection.
   */
  it('de-duplicates, so one command is not several copies of the same refetch', () => {
    const roots = invalidationRootsFor([
      { intent: 'add_food', success: true },
      { intent: 'edit_food_entry', success: true },
    ]);

    expect(roots).toEqual([...new Set(roots)]);
    expect(roots.filter((r) => r === 'foodEntries')).toHaveLength(1);
  });

  it('says nothing for an intent it has no cache for, rather than guessing', () => {
    expect(invalidationRootsFor([{ intent: 'unknown', success: false }])).toEqual([]);
    expect(invalidationRootsFor([{ intent: 'query_user_data', success: true }])).toEqual([]);
  });

  /**
   * `waterToday` is keyed by day (`lib/queryKeys.ts`) and a voice command can be dated to any
   * of them, so the ROOT is what has to be invalidated — React Query's prefix matching then
   * reaches every day's entry, which is what `queryKeys.waterTodayAll` exists for.
   */
  it('returns the water root, not one day of it', () => {
    expect(invalidationRootsFor([{ intent: 'add_water', success: true }])).toEqual(['waterToday']);
  });
});
