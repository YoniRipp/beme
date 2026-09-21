import { ApiError } from '../core/api/client';
import type { AiInsights, TodayRecommendations } from '../core/api/aiInsights';

/**
 * What the AI half of the Insights screen is currently able to say, as pure functions.
 *
 * It lives here rather than in the component for the same mechanical reason
 * `insightsViewState.ts` does: `screens/InsightsScreen.tsx` imports
 * `react-native-gifted-charts`, which Jest cannot transform, so nothing that reaches that
 * screen's module graph can be unit-tested. Keeping the decisions out here means the rules
 * below are pinned by plain assertions instead of only by a render.
 *
 * Three of the four states this file exists for are not obvious from the endpoints, and each
 * one was a way to look broken:
 *
 *   1. **Failure is not one thing.** A 503 (no `GEMINI_API_KEY` on the server), a 403 (the
 *      user is out of monthly AI calls) and a 500 want three different sentences and two
 *      different answers to "is a Retry button honest here?". Only one of them is the user's
 *      to act on, and none of them is "something went wrong".
 *   2. **An empty success is not a failure and not a loading state.**
 *      `generateTodayRecommendations` catches every error it can hit — a Gemini timeout, a
 *      malformed JSON reply — and returns `{ workout: '', sleep: '', nutrition: '', focus: '' }`
 *      with a 200 (`backend/src/services/insights.ts:481`). The same is true of the narrative:
 *      `saveInsight` writes `data.summary ?? ''`, so a cached row from a partial generation
 *      reads back as an empty summary and empty arrays. Rendering those straight gives a card
 *      with a heading and nothing under it, which reads as a bug rather than as "the coach has
 *      nothing to say yet".
 *   3. **`**bold**` reaches the client as literal asterisks.** The model is asked for JSON, not
 *      for plain text, and it routinely emphasises numbers. The web strips the markers
 *      (`AiInsightsSection.tsx`) because React Native has no markdown renderer here either.
 */

/**
 * The machine code the backend sends when the monthly AI allowance is gone.
 *
 * Frozen on the backend side on purpose — `middleware/aiAccess.ts` says the web client and
 * the MCP server both branch on it — so matching the string is matching a contract, not
 * sniffing a message.
 *
 * It arrives here as `ApiError.message`, which looks wrong and is not: the body is
 * `{ error: 'free_quota_exhausted', message: "You've used all your free AI calls…",
 * remainingCalls: 0 }`, and the shared transport's `errorMessageFrom` unwraps `payload.error`
 * (`packages/shared/src/api/transport.ts:82`). The sibling `message` — the only human sentence
 * in the body — is never read. So this client has to supply its own copy, and a screen that
 * renders `error.message` verbatim would show the user the string `free_quota_exhausted`.
 */
export const QUOTA_EXHAUSTED_CODE = 'free_quota_exhausted';

export type AiFailureKind = 'unconfigured' | 'quota' | 'unauthorized' | 'generic';

export interface AiFailure {
  kind: AiFailureKind;
  /** One line, in the user's terms. Never the raw server string. */
  title: string;
  /** What, if anything, they can do about it. */
  detail: string;
  /**
   * Whether offering a retry is honest. False for the two that cannot change until something
   * outside the app does — a deploy, or a new calendar month. A Retry button that is
   * guaranteed to fail is worse than no button, and against `requireAiQuota` it would also
   * spend another call to prove it.
   */
  retryable: boolean;
}

/**
 * Classify a failed AI read.
 *
 * Branches on `ApiError.status`, not on the message text. The web has to do the opposite —
 * its `request` throws a bare `Error`, so `AiInsightsSection.tsx` tests
 * `String(error.message).includes('503')` and only works because that number happens to be in
 * the sentence. `packages/shared/src/api/transport.ts` gives this client the real status, so
 * there is no reason to inherit the guess.
 */
export function classifyAiFailure(error: unknown): AiFailure | null {
  if (error == null) return null;

  const status = error instanceof ApiError ? error.status : null;
  const message = error instanceof Error ? error.message : '';

  if (status === 403 || message === QUOTA_EXHAUSTED_CODE) {
    return {
      kind: 'quota',
      title: "You've used this month's AI calls",
      // No number: the allowance is `AI_MONTHLY_LIMIT` on the server and this client has no
      // endpoint that reports it, so naming one would be inventing it. The reset is real and
      // checkable — `aiQuota.ts` keys usage to the calendar month.
      detail: 'Your allowance resets at the start of next month. Charts and stats below are unaffected.',
      retryable: false,
    };
  }

  if (status === 503) {
    return {
      kind: 'unconfigured',
      title: 'AI insights are not set up on this server',
      // The server's own words are "AI insights not configured (missing GEMINI_API_KEY)",
      // which names an environment variable at a user. This says the same thing to the
      // person holding the phone.
      detail: 'The backend is missing its AI provider key, so nothing can be generated yet.',
      retryable: false,
    };
  }

  if (status === 401) {
    return {
      kind: 'unauthorized',
      // The transport has already cleared the token and told AuthContext by the time this is
      // read, so this is a frame or two before the sign-in screen replaces the whole tree.
      // It exists so that frame does not say "something went wrong".
      title: 'Your session expired',
      detail: 'Sign in again to see your AI insights.',
      retryable: false,
    };
  }

  return {
    kind: 'generic',
    title: 'Could not load AI insights right now',
    detail: 'The AI service may be temporarily unavailable.',
    retryable: true,
  };
}

/**
 * Drops the `**…**` emphasis the model writes into what is meant to be plain prose.
 *
 * Same expression as the web's, deliberately: two clients stripping the same markers
 * differently is how one of them starts showing asterisks.
 */
export function stripEmphasis(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

/**
 * True when the narrative has something on it worth drawing a card for.
 *
 * `score` alone does not count. A row saved from a generation that produced no text still
 * carries a number (`saveInsight` defaults it to 0, and a live generation defaults it to 50),
 * so a ring on its own would be a confident-looking wellness score with no evidence under it.
 */
export function hasNarrative(insights: AiInsights | undefined): boolean {
  if (!insights) return false;
  return (
    insights.summary.trim().length > 0 ||
    insights.highlights.some((h) => h.trim().length > 0) ||
    insights.suggestions.some((s) => s.trim().length > 0)
  );
}

/** One of the four recommendation slots the `ai_insights` row carries. */
export interface TodayRecommendation {
  key: keyof TodayRecommendations;
  label: string;
  /** MaterialCommunityIcons name, for Paper's `<Icon source>`. */
  icon: string;
  text: string;
}

/**
 * The four slots in the order the web lists them, with the glyph each gets here.
 *
 * The web uses emoji (💪 😴 🥗 🧠). This client has an icon set and a tone per domain already
 * — `SectionCard`'s `food`/`workout`/`sleep` tones, and the same `dumbbell`/`food-apple`
 * names Home and Body use — so matching the app is a better reading of parity than matching
 * the glyph. The labels and the order are the web's.
 */
const TODAY_SLOTS: readonly { key: keyof TodayRecommendations; label: string; icon: string }[] = [
  { key: 'workout', label: 'Workout', icon: 'dumbbell' },
  { key: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent' },
  { key: 'nutrition', label: 'Nutrition', icon: 'food-apple' },
  { key: 'focus', label: 'Focus', icon: 'brain' },
];

/**
 * The slots that actually have text, in the web's order.
 *
 * An empty array is the state the coordinator's audit is about: it means the request
 * SUCCEEDED and the model still produced nothing, which `generateTodayRecommendations`'
 * catch-all makes a routine outcome rather than an edge case. The caller must render that as
 * its own thing — not as a spinner that never resolves, and not as an empty card.
 */
export function todayRecommendations(
  data: TodayRecommendations | undefined
): TodayRecommendation[] {
  if (!data) return [];
  return TODAY_SLOTS.flatMap(({ key, label, icon }) => {
    const text = (data[key] ?? '').trim();
    return text.length > 0 ? [{ key, label, icon, text: stripEmphasis(text) }] : [];
  });
}
