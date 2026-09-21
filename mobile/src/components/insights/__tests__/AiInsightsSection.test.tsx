import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { useAiInsights } from '../../../hooks/useAiInsights';
import { classifyAiFailure } from '../../../lib/aiInsightsState';
import { ApiError } from '../../../core/api/client';
import { AiInsightsSection } from '../AiInsightsSection';

jest.mock('../../../hooks/useAiInsights', () => ({ useAiInsights: jest.fn() }));

const mockUseAiInsights = useAiInsights as jest.Mock;

jest.setTimeout(30_000);

/**
 * The hook is mocked rather than the API, because what this component is responsible for is
 * choosing a state to render from what the hook reports — not fetching. The fetching rules
 * (nothing paid on mount, no retry on a 403) are the hook's own and are covered where they
 * live.
 *
 * What is pinned here is the set of states that are easy to collapse into each other and
 * wrong in different ways if you do:
 *
 *  - nothing generated yet is NOT an error, and must not spend a call to discover that;
 *  - a quota refusal is NOT a generic failure, and must not offer a retry that cannot work;
 *  - a 200 carrying nothing is NOT a failure either, and must not render a blank card.
 *
 * That last one is the reason this file exists. `generateTodayRecommendations` swallows every
 * error and answers 200 with four empty strings (`backend/src/services/insights.ts:481`), so
 * "success" and "the model gave us nothing" arrive looking identical and a naive component
 * renders an empty box that reads as broken.
 */

/**
 * Typed against the hook's real return rather than inferred from this literal: inferring
 * would fix `insights` at `undefined` and `insightsFailure` at `null`, and every override
 * below would then fail to typecheck against its own narrowed type.
 */
type AiHook = ReturnType<typeof useAiInsights>;

/** Everything the component reads, in its nothing-has-happened-yet state. */
const idleHook: AiHook = {
  insights: undefined,
  insightsLoading: false,
  insightsFailure: null,
  today: undefined,
  todayLoading: false,
  todayFailure: null,
  freshness: undefined,
  isStale: false,
  entitlementFailure: null,
  hasContent: false,
  requesting: false,
  generate: jest.fn(),
  refresh: jest.fn(),
  refreshing: false,
  refreshFailure: null,
  canRefresh: false,
};

const withHook = (overrides: Partial<AiHook> = {}) =>
  mockUseAiInsights.mockReturnValue({ ...idleHook, ...overrides, generate: jest.fn(), refresh: jest.fn() });

// `await render(...)`: RNTL 14 made render async, and the provider stack (settings, fonts,
// theme) resolves asynchronously on top of that, so every query has to be a `findBy*`.
const renderSection = () =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <AiInsightsSection />
      </ThemeProvider>
    </SettingsProvider>
  );

beforeEach(() => {
  mockUseAiInsights.mockReset();
});

describe('AiInsightsSection', () => {
  it('offers to generate rather than generating, and says a call is spent', async () => {
    withHook();
    const r = await renderSection();

    expect(await r.findByLabelText('Generate AI insights')).toBeTruthy();
    // The cost is stated up front. With AI_MONTHLY_LIMIT defaulting to 10, a control that
    // quietly spends one of ten is not a control a user can consent to.
    expect(await r.findByText(/Uses one of your monthly AI calls/i)).toBeTruthy();
  });

  it('does not call generate just because it rendered', async () => {
    withHook();
    const hook = mockUseAiInsights.mock.results;
    await renderSection();

    // Mounting must not spend anything. The web's equivalent fires five or six calls per
    // mount; this is the check that keeps that from being copied over.
    const returned = hook[0].value as AiHook;
    expect(returned.generate).not.toHaveBeenCalled();
    expect(returned.refresh).not.toHaveBeenCalled();
  });

  it('reports a quota refusal as itself, with no retry offered', async () => {
    const failure = classifyAiFailure(new ApiError('free_quota_exhausted', 403));
    withHook({ insightsFailure: failure, requesting: true });
    const r = await renderSection();

    expect(await r.findByText("You've used this month's AI calls")).toBeTruthy();
    // Not retryable: the allowance resets monthly, so a Retry button would be a lie.
    expect(r.queryByLabelText('Retry AI insights')).toBeNull();
    // And it must not be dressed as breakage — the charts below still work.
    expect(r.queryByText(/Could not load AI insights right now/i)).toBeNull();
  });

  it('treats an empty 200 as "nothing to say", not as a failure or a blank card', async () => {
    withHook({
      insights: { summary: '', highlights: [], suggestions: [], score: 0 },
      hasContent: true,
      requesting: true,
    });
    const r = await renderSection();

    expect(await r.findByText('No insight for this period yet')).toBeTruthy();
    // The wording matters as much as the state: nothing failed, so nothing should say it did.
    expect(r.queryByText(/Could not load/i)).toBeNull();
    expect(r.queryByLabelText('Retry AI insights')).toBeNull();
  });

  it('renders real content, and flags it as stale when newer activity exists', async () => {
    withHook({
      insights: {
        summary: 'Sleep is steady, training is not.',
        highlights: ['Seven hours a night, six nights running'],
        suggestions: ['Add one more session this week'],
        score: 72,
      },
      hasContent: true,
      requesting: true,
      isStale: true,
      canRefresh: true,
    });
    const r = await renderSection();

    expect(await r.findByText('Sleep is steady, training is not.')).toBeTruthy();
    expect(
      await r.findByText(/You have logged new activity since these were generated/i)
    ).toBeTruthy();
    // Stale is a prompt to refresh, not an automatic refresh — refreshing costs a call.
    expect(await r.findByLabelText('Refresh AI insights')).toBeTruthy();
  });
});
