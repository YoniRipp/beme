import { request } from './client';
import { toLocalDateString } from '../../lib/dateRanges';

/**
 * The voice slice — one endpoint, `POST /api/voice/understand`.
 *
 * Read off `backend/src/routes/voice.ts` and `backend/src/controllers/voice.ts` rather than
 * transcribed from the web's `frontend/src/lib/voiceApi.ts`, because the two clients do not
 * use the same half of that endpoint. The controller branches on the body:
 *
 *   - `{ audio, mimeType }` → enqueues a Redis job and answers `202`-shaped
 *     `{ jobId, status, pollUrl }`, which the caller then polls. That is the web's path: a
 *     browser records a blob and Gemini transcribes it.
 *   - `{ transcript }`      → parses SYNCHRONOUSLY and answers the result in the same
 *     response. That is this client's path, and the only one modelled below.
 *
 * **This client never sends audio, and that is a privacy property, not a preference.**
 * `mobile/src/hooks/useSpeechRecognition.ts` runs `SFSpeechRecognizer` / Android's
 * `SpeechRecognizer` on the handset, so the microphone stream never leaves the device and no
 * TrackVibe server ever receives it. Only the text the recognizer produced is sent. Adding an
 * `audio` field here would quietly undo that, which is why the `audio` branch is absent from
 * this module rather than present-but-unused — and why it also needs no Redis (the queue path
 * 503s when `REDIS_URL` is unset).
 *
 * **EVERY CALL BELOW SPENDS ONE OF THE USER'S MONTHLY AI CALLS.** `routes/voice.ts` mounts
 * `requireAiQuota`, which debits in middleware *before* `understand` runs
 * (`middleware/aiAccess.ts` → `services/aiQuota.ts:tryConsumeAiCall`). The allowance is
 * `AI_MONTHLY_LIMIT`, unset in production and defaulting to **10 per calendar month**
 * (`backend/src/config/index.ts:61`), shared with chat, insights and food lookup. Three
 * consequences this module's callers have to live with:
 *
 *   1. A debit happens even when the handler then FAILS — a Gemini 502, a malformed reply,
 *      anything. So **never retry this automatically.** A retry is a second tenth of the
 *      month's allowance spent to be told the same thing. The sheet makes the user ask.
 *   2. A debit happens even when Gemini understands nothing. `parseTranscript` falls back to
 *      `{ actions: [{ intent: 'unknown' }] }` with a 200 (`services/voice.ts`), so "we could
 *      not make sense of that" arrives as a success and still cost a call. `understood()`
 *      below exists so a caller cannot mistake the two.
 *   3. Nothing may fire on mount. There is no read here that is free the way
 *      `/api/insights/freshness` is — the route has no `requireAiAccess` sibling — so the
 *      only honest way to learn the user is out of calls is to have them spend one.
 */

/**
 * One parsed intent. Deliberately open: `services/voice/actionBuilders.ts` builds a different
 * payload per intent (`add_food` carries macros, `log_sleep` carries hours, and so on) and
 * this client renders none of those fields — the server already applied them. Modelling all
 * twenty-odd shapes here would be twenty-odd shapes to keep in step with a backend that owes
 * this client no compatibility (`mobile/CLAUDE.md`: don't change API shapes to suit a client).
 */
export interface VoiceAction {
  intent: string;
  [key: string]: unknown;
}

/**
 * What the server did about one action, from `services/voiceExecutor.ts:ExecuteResult`.
 *
 * `message` is the human sentence the executor wrote ("Logged weight: 72.5 kg", "Workout not
 * found") and is what the sheet shows. It is optional in the type because the interface says
 * so, though every branch of `executeOne` in fact sets one.
 */
export interface VoiceExecuteResult {
  intent: string;
  success: boolean;
  message?: string;
}

/**
 * The transcript path's 200 body, which is `maybeExecuteAndPublish`'s return value verbatim.
 *
 * `results` is present only when the server executed the actions itself — i.e. when
 * `config.voiceExecuteOnServer` is on AND the request is authenticated
 * (`services/voice.ts:maybeExecuteAndPublish`). It defaults ON
 * (`VOICE_EXECUTE_ON_SERVER !== 'false'`), and `requireAuth` guarantees the user, so in every
 * deployment we run it IS there. It is optional here anyway, because the one deployment where
 * it is missing is the one where nothing was written to the user's account — and a client that
 * assumed the field would report "logged" for a command that did nothing. See
 * `lib/voiceCommandState.ts:summariseVoiceOutcome`, which treats its absence as its own state.
 */
export interface VoiceUnderstandResponse {
  actions?: VoiceAction[];
  results?: VoiceExecuteResult[];
}

/** What Gemini answers when it could not turn the transcript into anything (`services/voice.ts`). */
export const UNKNOWN_INTENT = 'unknown';

/**
 * The IANA zone name, for dating entries in the user's own day rather than the server's.
 *
 * Guarded because `Intl` is the one browser API React Native does not promise: Hermes ships
 * it, but a stripped ICU build resolves `timeZone` to `'UTC'` or throws outright. The backend
 * re-validates whatever arrives (`controllers/voice.ts:isValidTimezone` runs it through
 * `Intl.DateTimeFormat`) and silently drops an unusable one, so a wrong answer here degrades
 * to the server's `'UTC'` default rather than failing the request.
 */
export function getDeviceTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export interface UnderstandBody {
  transcript: string;
  lang: string;
  today: string;
  timezone: string;
}

/**
 * The request body, as a pure function of the moment it is built.
 *
 * Split out from `understand` so the `today` rule can be pinned without a clock: it is the
 * device's LOCAL calendar day, never `toISOString().slice(0, 10)`. The server falls back to
 * exactly that UTC slice when `today` is absent or malformed
 * (`controllers/voice.ts` → `services/voice.ts:parseTranscript`), which west of UTC after
 * ~17:00 files the user's dinner under tomorrow. `toLocalDateString` is the same helper every
 * other write on this client dates itself with.
 *
 * The transcript is trimmed here rather than at the call site because the server rejects an
 * empty one with a 400 — and by then `requireAiQuota` has already taken the call. A blank
 * send must be stopped before the request, not diagnosed after it.
 */
export function buildUnderstandBody(
  transcript: string,
  options: { lang: string; now?: Date; timezone?: string }
): UnderstandBody {
  return {
    transcript: transcript.trim(),
    lang: options.lang,
    today: toLocalDateString(options.now ?? new Date()),
    timezone: options.timezone ?? getDeviceTimezone(),
  };
}

/**
 * 45 seconds, against the transport's 30.
 *
 * Not generosity — the debit is the reason. One request can be a Gemini function-calling round
 * trip plus, for `add_food`, a USDA lookup per item inside `executeActions`, and the transport
 * aborting at 30s does not abort any of that: the server finishes, writes the rows and keeps
 * the call it already charged. A client timeout is therefore the worst outcome available — the
 * user is told it failed, is invited to spend a second call, and the first one landed. Waiting
 * longer is strictly better than guessing, and the web already runs its own voice endpoint at
 * 45s (`frontend/src/lib/voiceApi.ts:transcribeAudio`).
 */
export const UNDERSTAND_TIMEOUT_MS = 45_000;

export const voiceApi = {
  /**
   * Costs one AI call, every time, including when it fails or understands nothing.
   *
   * `lang` is required rather than defaulted, because the recognizer that produced the text
   * was started with a specific BCP-47 tag and the parser should be told the same one. The
   * server's own default is the string `'auto'`, which it interpolates into the prompt
   * ("User transcript (lang: auto)") — true but less useful than the tag we actually know.
   */
  understand: (transcript: string, options: { lang: string }) =>
    request<VoiceUnderstandResponse>('/api/voice/understand', {
      method: 'POST',
      body: buildUnderstandBody(transcript, options),
      timeoutMs: UNDERSTAND_TIMEOUT_MS,
    }),
};
