import { ApiError } from '../core/api/client';
import { UNKNOWN_INTENT, type VoiceUnderstandResponse } from '../core/api/voice';

/**
 * What the voice sheet is currently able to say, as pure functions.
 *
 * Same split, and the same reason, as `lib/aiInsightsState.ts`: the decisions are the part
 * worth pinning, and pinning them by plain assertion is cheaper and sharper than pinning them
 * only through a render. The component keeps the layout; this file keeps the rules.
 *
 * Voice has more ways to go sideways than any other AI surface here, because two systems can
 * refuse independently and they fail for unrelated reasons:
 *
 *   1. **The recognizer, on the device.** It can be absent (simulator, or a handset with no
 *      speech service), refused (the user said no to the microphone), unsupported for the
 *      locale, or it can simply hear nothing. None of those is "something went wrong", and
 *      three of them have a different next step.
 *   2. **The parser, on the server.** It can refuse for quota, be unconfigured, or fail —
 *      and, uniquely here, it can SUCCEED and still have done nothing, twice over: Gemini
 *      answers `{ actions: [{ intent: 'unknown' }] }` with a 200 when it cannot parse the
 *      sentence, and a deployment with `VOICE_EXECUTE_ON_SERVER=false` answers parsed actions
 *      that nobody applied.
 *
 * Collapsing any of those into a single "Something went wrong" is how a user spends a tenth
 * of their monthly allowance and cannot tell whether their lunch was logged.
 */

/**
 * The machine code the backend sends when the monthly AI allowance is gone.
 *
 * Frozen on the backend side — `middleware/aiAccess.ts` says the web client and the MCP
 * server both branch on it — so matching the string is matching a contract, not sniffing a
 * message.
 *
 * It arrives as `ApiError.message`, which looks wrong and is not. The body is
 * `{ error: 'free_quota_exhausted', message: "You've used all your free AI calls…",
 * remainingCalls: 0 }`, and the shared transport's `errorMessageFrom` unwraps `payload.error`
 * (`packages/shared/src/api/transport.ts`). The sibling `message` — the only human sentence in
 * the body — is never read. So this client supplies its own copy, and a screen that rendered
 * `error.message` verbatim would show the user the string `free_quota_exhausted`.
 *
 * Duplicated from `lib/aiInsightsState.ts` on the AI-insights branch rather than shared,
 * because that branch is not merged and neither is this one; they should converge on one
 * `classifyAiFailure` once both land.
 */
export const QUOTA_EXHAUSTED_CODE = 'free_quota_exhausted';

export type VoiceFailureKind = 'quota' | 'unconfigured' | 'unauthorized' | 'generic';

export interface VoiceFailure {
  kind: VoiceFailureKind;
  /** One line, in the user's terms. Never the raw server string. */
  title: string;
  detail: string;
  /**
   * Whether offering a retry is honest.
   *
   * Stricter here than on any other AI surface, and the difference is the debit. `requireAiQuota`
   * charges in middleware before the handler runs, so the failed attempt has ALREADY cost a
   * call — a retry is a second one. False for the three that cannot change until something
   * outside the app does (a deploy, a new calendar month, a sign-in); true only for the
   * generic case, and even then the button says what it costs and the user has to press it.
   * Nothing on this surface retries by itself.
   */
  retryable: boolean;
}

/**
 * Classify a failed `POST /api/voice/understand`.
 *
 * Branches on `ApiError.status`, not on message text: the shared transport gives this client
 * the real status (`packages/shared/src/api/transport.ts`), so there is no reason to inherit
 * the web's `String(error.message).includes('503')` guess. The message is only consulted for
 * the quota code, which is a documented contract string rather than prose.
 */
export function classifyVoiceFailure(error: unknown): VoiceFailure | null {
  if (error == null) return null;

  const status = error instanceof ApiError ? error.status : null;
  const message = error instanceof Error ? error.message : '';

  if (status === 403 || message === QUOTA_EXHAUSTED_CODE) {
    return {
      kind: 'quota',
      title: "You've used this month's AI calls",
      // No number. The allowance is `AI_MONTHLY_LIMIT` on the server and this client has no
      // endpoint that reports it, so naming one would be inventing it. The reset is real and
      // checkable — `services/aiQuota.ts` keys usage to the calendar month.
      detail:
        'Voice commands share one monthly allowance with chat, insights and food lookup. It resets at the start of next month.',
      retryable: false,
    };
  }

  if (status === 503) {
    return {
      kind: 'unconfigured',
      // The server's own words are "Voice service not configured (missing GEMINI_API_KEY)",
      // which names an environment variable at someone holding a phone.
      title: 'Voice is not set up on this server',
      detail: 'The backend has no AI provider key, so it cannot interpret commands yet.',
      retryable: false,
    };
  }

  if (status === 401) {
    return {
      kind: 'unauthorized',
      // The transport has already cleared the token and told AuthContext by the time this is
      // read, so this is a frame or two before the sign-in screen replaces the tree. It exists
      // so that frame does not say "something went wrong".
      title: 'Your session expired',
      detail: 'Sign in again to use voice.',
      retryable: false,
    };
  }

  return {
    kind: 'generic',
    title: 'Could not send that command',
    // Says the quiet part, because the alternative is a user pressing Try again four times
    // and losing half their month without being told.
    detail: 'That attempt already used one of your monthly AI calls, and so would another.',
    retryable: true,
  };
}

/**
 * Why the microphone is not going to work, or is not working right now.
 *
 * Four kinds, because four different sentences and three different next steps:
 *
 *   - `unsupported` — there is no recognizer on this device at all. Nothing to retry; the
 *     control should not be offered.
 *   - `denied` — there IS one and the user refused it. Only recoverable in Settings: iOS
 *     shows the system prompt once per install, so `requestPermissionsAsync` after a denial
 *     resolves `granted: false` without ever asking again, and a "Try again" button would be
 *     a button that silently does nothing.
 *   - `silent` — the recognizer worked and heard nothing. Not a failure at all; the only one
 *     of the four where tapping the mic again is exactly the right move.
 *   - `failed` — everything else, including the recognizer's own network path.
 */
export type MicFailureKind = 'unsupported' | 'denied' | 'silent' | 'failed';

export interface MicFailure {
  kind: MicFailureKind;
  title: string;
  detail: string;
  /** Whether tapping the mic again can plausibly do something different. */
  canRetry: boolean;
}

/** No recognizer on this device — `isAvailable` was false before anything was attempted. */
export const MIC_UNSUPPORTED: MicFailure = {
  kind: 'unsupported',
  title: 'Voice is not available on this device',
  // True on the iOS simulator (`isRecognitionAvailable()` throws there, which the hook
  // catches) and on handsets with no speech service installed. Naming both stops it reading
  // as a TrackVibe outage.
  detail:
    'This device has no speech recognizer, so there is nothing to listen with. Logging by hand still works everywhere.',
  canRetry: false,
};

/**
 * Classify an error from `useSpeechRecognition`.
 *
 * Takes the hook's `{ code }` shape rather than the raw event, and returns `null` for
 * `aborted` — that code means `cancelListening()` was called, which is this sheet's own
 * cancel button. Reporting the user's own cancellation back to them as an error is the most
 * obvious way to get this wrong.
 *
 * NOTHING BELOW RENDERS THE RECOGNIZER'S OWN `message`. The platform writes things like
 * "Error: 7" and "retry", which is debugging output, not copy.
 */
export function classifyMicFailure(error: { code: string } | null | undefined): MicFailure | null {
  if (!error) return null;

  switch (error.code) {
    case 'aborted':
      return null;

    case 'not-allowed':
      return {
        kind: 'denied',
        title: 'Microphone access is off',
        // Both permissions, because iOS asks for them separately
        // (`NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`, both
        // declared in `mobile/app.config.js`) and either one refused lands here.
        detail:
          'Turn on Microphone and Speech Recognition for TrackVibe in your device settings, then come back.',
        canRetry: false,
      };

    case 'service-not-allowed':
    case 'language-not-supported':
      return {
        kind: 'unsupported',
        title: 'This device cannot recognize speech right now',
        // `service-not-allowed` is the recognizer reporting itself unavailable — on Android
        // typically a missing or disabled Google speech service, on iOS a locale with no model.
        detail: 'Its speech recognizer is unavailable or does not support this language.',
        canRetry: false,
      };

    case 'no-speech':
    case 'speech-timeout':
      return {
        kind: 'silent',
        title: 'I did not catch that',
        detail: 'Nothing was heard. Tap the microphone and speak after the tone.',
        canRetry: true,
      };

    case 'network':
      return {
        kind: 'failed',
        // Whose network matters, because the obvious reading is wrong. This is Apple's or
        // Google's recognition service, not TrackVibe's — the hook leaves
        // `requiresOnDeviceRecognition` off by default so the platform may use its own
        // servers. Either way no audio reached a TrackVibe backend.
        title: 'The device recognizer could not reach its service',
        detail: 'Check the connection and try again, or type the entry instead.',
        canRetry: true,
      };

    default:
      return {
        kind: 'failed',
        title: 'The microphone stopped unexpectedly',
        // `busy` is the one worth a hint: the audio session is still held, usually by a call,
        // Siri, or a previous session that was not released.
        detail: 'Something else may be using audio. Try again in a moment.',
        canRetry: true,
      };
  }
}

/**
 * What the server actually did, once a 200 came back.
 *
 *   - `applied`        — every action was executed and succeeded.
 *   - `partial`        — some executed, some did not (e.g. "Workout not found").
 *   - `failed`         — it parsed the command and every action failed.
 *   - `not-understood` — 200, one `unknown` action, nothing attempted. A call was still spent.
 *   - `not-applied`    — actions parsed, no `results` at all, so nothing was written.
 */
export type VoiceOutcomeKind = 'applied' | 'partial' | 'failed' | 'not-understood' | 'not-applied';

export interface VoiceOutcome {
  kind: VoiceOutcomeKind;
  title: string;
  /** One line per action, in the executor's own words where it wrote any. */
  lines: string[];
}

/**
 * `add_food` -> `Add food`. Only reached on the `not-applied` path, where the server sent
 * intents and no sentences, so there is nothing better to show than the intent itself.
 */
function humaniseIntent(intent: string): string {
  const words = intent.replace(/_/g, ' ').trim();
  return words.length === 0 ? 'Unknown' : words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Turn a 200 into the one thing the sheet should say.
 *
 * The `unknown` check comes FIRST, before the results are counted, and that ordering is the
 * point. `services/voice.ts:fallbackOrUnknown` answers `{ actions: [{ intent: 'unknown' }] }`
 * when Gemini returns nothing usable, and `voiceExecutor.executeOne` turns that into
 * `{ intent: 'unknown', success: false, message: 'Could not understand' }` — a perfectly
 * ordinary-looking failed result. Counted rather than recognised, "I could not parse your
 * sentence" renders as "an action failed", which sends the user looking for a broken feature
 * instead of rephrasing.
 */
export function summariseVoiceOutcome(response: VoiceUnderstandResponse | null): VoiceOutcome {
  const actions = response?.actions ?? [];
  const results = response?.results;

  if (actions.length === 0 || actions.every((a) => a.intent === UNKNOWN_INTENT)) {
    return {
      kind: 'not-understood',
      title: 'I could not turn that into an entry',
      // Says the cost, because this is the outcome where a user is most likely to assume the
      // attempt was free and immediately try three rephrasings.
      lines: [
        'Nothing was logged, and the attempt still used one of your monthly AI calls.',
        'Try naming the thing and the amount — "ate 200 grams of rice", "slept 7 hours".',
      ],
    };
  }

  // No `results` key: `config.voiceExecuteOnServer` is off, so the server parsed and stopped.
  // This client has no executor of its own, so the honest report is that nothing happened —
  // NOT a list of things it understood, which reads as a list of things it did.
  if (!results) {
    return {
      kind: 'not-applied',
      title: 'Understood, but nothing was saved',
      lines: [
        'This server is set not to apply voice commands itself, and this app cannot apply them for it.',
        `Heard: ${actions.map((a) => humaniseIntent(a.intent)).join(', ')}.`,
      ],
    };
  }

  const lines = results.map((r) => r.message ?? humaniseIntent(r.intent));
  const succeeded = results.filter((r) => r.success).length;

  if (succeeded === results.length) {
    return { kind: 'applied', title: results.length === 1 ? 'Logged' : 'Logged everything', lines };
  }
  if (succeeded === 0) {
    return { kind: 'failed', title: 'Nothing could be saved', lines };
  }
  return {
    kind: 'partial',
    title: `Saved ${succeeded} of ${results.length}`,
    lines,
  };
}

/**
 * The query keys a voice command can have invalidated, given what the server says it did.
 *
 * The server writes DIRECTLY to the database (`services/voiceExecutor.ts`), so React Query
 * here has no idea any of it happened — without this, a logged breakfast does not appear on
 * Home until something else refetches, and the user's reasonable conclusion is that voice
 * silently failed.
 *
 * Derived from the intents rather than blanket-invalidating everything: `queryClient
 * .invalidateQueries()` with no key refetches every active query in the app, which on this
 * client is a dozen requests over a phone connection to reflect one glass of water. Keyed off
 * the intent prefix because the executor's intents are `<verb>_<noun>` and it is the noun that
 * names the cache.
 *
 * Only successful results count. A failed action wrote nothing, so invalidating on it spends
 * a refetch to re-read data that did not move.
 */
const KEY_ROOTS_BY_INTENT: Record<string, readonly string[]> = {
  add_workout: ['workouts', 'streaks'],
  edit_workout: ['workouts', 'streaks'],
  delete_workout: ['workouts', 'streaks'],
  add_food: ['foodEntries', 'streaks'],
  edit_food_entry: ['foodEntries', 'streaks'],
  delete_food_entry: ['foodEntries', 'streaks'],
  log_sleep: ['checkIns', 'streaks'],
  edit_check_in: ['checkIns', 'streaks'],
  delete_check_in: ['checkIns', 'streaks'],
  add_goal: ['goals'],
  edit_goal: ['goals'],
  delete_goal: ['goals'],
  log_weight: ['weightEntries', 'profile'],
  edit_weight: ['weightEntries', 'profile'],
  delete_weight: ['weightEntries', 'profile'],
  add_water: ['waterToday'],
  remove_water: ['waterToday'],
  log_cycle: ['cycleEntries'],
  edit_cycle: ['cycleEntries'],
  delete_cycle: ['cycleEntries'],
  update_profile: ['profile'],
};

/**
 * Query-key ROOTS to invalidate, de-duplicated. Roots rather than whole keys because
 * `waterToday` is parameterised by day (`lib/queryKeys.ts`) and the executor's action may be
 * dated to any of them; React Query's default prefix matching invalidates every day's entry
 * from the root, which is what `queryKeys.waterTodayAll` exists for.
 */
export function invalidationRootsFor(results: readonly { intent: string; success: boolean }[]): string[] {
  const roots = new Set<string>();
  for (const result of results) {
    if (!result.success) continue;
    for (const root of KEY_ROOTS_BY_INTENT[result.intent] ?? []) roots.add(root);
  }
  return [...roots];
}
