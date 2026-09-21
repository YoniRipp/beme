import { ApiError } from '../../core/api/client';
import {
  QUOTA_EXHAUSTED_CODE,
  classifyAiFailure,
  hasNarrative,
  stripEmphasis,
  todayRecommendations,
} from '../aiInsightsState';
import type { AiInsights, TodayRecommendations } from '../../core/api/aiInsights';

/**
 * The four states the AI section can be in, pinned without a render.
 *
 * These are here rather than only in the component's suite because each one encodes a fact
 * about the backend that a screenshot cannot check — that a 403 carries a machine code where
 * the human sentence should be, that a failed generation arrives as a 200, that an insight
 * row can be saved with an empty summary. If one of those changes on the server, this is what
 * should go red.
 */

const insights = (over: Partial<AiInsights> = {}): AiInsights => ({
  summary: 'You are averaging 2,100 calories a day.',
  highlights: ['Slept 7.4h on average'],
  suggestions: ['Add 20g of protein at breakfast'],
  score: 78,
  ...over,
});

const today = (over: Partial<TodayRecommendations> = {}): TodayRecommendations => ({
  workout: 'Run 30 minutes at an easy pace.',
  sleep: 'Aim for lights out by 22:30.',
  nutrition: 'Add a protein source to lunch.',
  focus: 'Pick one thing and finish it.',
  ...over,
});

describe('classifyAiFailure', () => {
  it('has nothing to say when nothing failed', () => {
    expect(classifyAiFailure(null)).toBeNull();
    expect(classifyAiFailure(undefined)).toBeNull();
  });

  /**
   * The body is `{ error: 'free_quota_exhausted', message: "You've used all your free AI
   * calls…", remainingCalls: 0 }`, and the shared transport unwraps `payload.error` — the
   * machine code — while never reading the sibling `message`. So the only string this client
   * is handed is one no user should ever see.
   */
  it('turns the raw quota code into something a person can read', () => {
    const failure = classifyAiFailure(new ApiError(QUOTA_EXHAUSTED_CODE, 403));

    expect(failure?.kind).toBe('quota');
    expect(failure?.title).not.toContain(QUOTA_EXHAUSTED_CODE);
    expect(failure?.detail).not.toContain(QUOTA_EXHAUSTED_CODE);
    expect(failure?.detail).toMatch(/next month/i);
  });

  it('recognises the quota code even without the status, since the contract is the code', () => {
    // `middleware/aiAccess.ts` calls the code frozen because two other consumers branch on
    // it. Matching it directly means a transport change that loses the status does not lose
    // the one state the user can actually act on.
    expect(classifyAiFailure(new Error(QUOTA_EXHAUSTED_CODE))?.kind).toBe('quota');
  });

  it('does not offer a retry for a quota wall, which a retry cannot move', () => {
    expect(classifyAiFailure(new ApiError(QUOTA_EXHAUSTED_CODE, 403))?.retryable).toBe(false);
  });

  it('says a missing server key is a server problem, without naming the env var at the user', () => {
    const failure = classifyAiFailure(
      new ApiError('AI insights not configured (missing GEMINI_API_KEY)', 503)
    );

    expect(failure?.kind).toBe('unconfigured');
    expect(failure?.title).not.toContain('GEMINI_API_KEY');
    expect(failure?.retryable).toBe(false);
  });

  /**
   * The web can only reach this state by testing whether the literal characters "503" appear
   * in the message, because its own `request` throws a bare `Error`. This client is handed
   * the status, so a 503 whose sentence never mentions a number still classifies.
   */
  it('classifies a 503 by its status, not by the digits appearing in the message', () => {
    expect(classifyAiFailure(new ApiError('Service Unavailable', 503))?.kind).toBe('unconfigured');
  });

  it('treats an expired session as its own thing rather than "something went wrong"', () => {
    const failure = classifyAiFailure(new ApiError('Session expired', 401));

    expect(failure?.kind).toBe('unauthorized');
    expect(failure?.retryable).toBe(false);
  });

  it('falls back to a retryable generic failure for anything else', () => {
    const failure = classifyAiFailure(new ApiError('Internal Server Error', 500));

    expect(failure?.kind).toBe('generic');
    expect(failure?.retryable).toBe(true);
  });

  it('handles a thrown non-Error without crashing the screen', () => {
    expect(classifyAiFailure('boom')?.kind).toBe('generic');
  });
});

describe('hasNarrative', () => {
  it('is false before anything has been fetched', () => {
    expect(hasNarrative(undefined)).toBe(false);
  });

  /**
   * `saveInsight` writes `data.summary ?? ''` and `JSON.stringify(data.highlights ?? [])`, so
   * a row cached from a generation that produced no text reads back exactly like this — with
   * a 200. Without this check the screen draws a heading over nothing.
   */
  it('is false for the empty row a partial generation leaves behind', () => {
    expect(hasNarrative(insights({ summary: '', highlights: [], suggestions: [] }))).toBe(false);
  });

  it('is false when the strings are present but blank', () => {
    expect(hasNarrative(insights({ summary: '   ', highlights: [''], suggestions: ['  '] }))).toBe(
      false
    );
  });

  /**
   * A score on its own is not content. `generateInsights` defaults an unparseable score to 50
   * and `saveInsight` defaults it to 0, so a lone number would render as a confident wellness
   * ring with no evidence behind it.
   */
  it('is false for a score with no text behind it', () => {
    expect(hasNarrative(insights({ summary: '', highlights: [], suggestions: [], score: 50 }))).toBe(
      false
    );
  });

  it.each([
    ['a summary', insights({ highlights: [], suggestions: [] })],
    ['only highlights', insights({ summary: '', suggestions: [] })],
    ['only suggestions', insights({ summary: '', highlights: [] })],
  ])('is true with %s', (_label, data) => {
    expect(hasNarrative(data)).toBe(true);
  });
});

describe('todayRecommendations', () => {
  it('lists the four slots in the web order', () => {
    expect(todayRecommendations(today()).map((r) => r.key)).toEqual([
      'workout',
      'sleep',
      'nutrition',
      'focus',
    ]);
  });

  /**
   * THE state this helper exists for. `generateTodayRecommendations` catches every error it
   * can hit and returns four empty strings with a 200
   * (`backend/src/services/insights.ts:481`), so "the model call failed" and "the request
   * succeeded" are the same response. An empty list is how the screen tells them apart from
   * still-loading.
   */
  it('returns nothing for the four empty strings a failed generation returns as a 200', () => {
    expect(todayRecommendations({ workout: '', sleep: '', nutrition: '', focus: '' })).toEqual([]);
  });

  it('drops only the blank slots, keeping the rest', () => {
    const recs = todayRecommendations(today({ sleep: '', focus: '   ' }));

    expect(recs.map((r) => r.key)).toEqual(['workout', 'nutrition']);
  });

  it('returns nothing before the request has been made', () => {
    expect(todayRecommendations(undefined)).toEqual([]);
  });

  it('strips the emphasis markers the model writes into plain prose', () => {
    const [rec] = todayRecommendations(today({ workout: 'Run **30 minutes** today.' }));

    expect(rec.text).toBe('Run 30 minutes today.');
  });

  it('names a glyph for every slot, so none renders as a blank square', () => {
    for (const rec of todayRecommendations(today())) {
      expect(rec.icon).toMatch(/^[a-z0-9-]+$/);
      expect(rec.label.length).toBeGreaterThan(0);
    }
  });
});

describe('stripEmphasis', () => {
  it('removes the markers and keeps the words', () => {
    expect(stripEmphasis('You averaged **2,100** kcal')).toBe('You averaged 2,100 kcal');
  });

  it('leaves prose with no markers alone', () => {
    expect(stripEmphasis('No markers here')).toBe('No markers here');
  });

  it('leaves a lone unmatched marker rather than eating the rest of the line', () => {
    expect(stripEmphasis('5 ** 2 is not emphasis')).toBe('5 ** 2 is not emphasis');
  });
});
