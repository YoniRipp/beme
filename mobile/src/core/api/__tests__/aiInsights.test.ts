import { aiInsightsApi, DEFAULT_INSIGHT_PERIOD, INSIGHT_PERIODS } from '../aiInsights';

const mockRequest = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

/**
 * Wiring coverage for the AI Insights slice, in the shape `health.test.ts` and
 * `workouts.test.ts` already use: what path each client hits, and which parameters actually
 * reach the query string.
 *
 * The paths matter more here than in the other slices, because three of these four endpoints
 * debit one of the user's ten monthly AI calls in middleware before the handler runs
 * (`backend/src/middleware/aiAccess.ts`). A typo that hits `/api/insights` where it meant
 * `/api/insights/freshness` does not 404 — it silently charges the user for a read that was
 * supposed to be free.
 */
beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue(undefined);
});

describe('aiInsightsApi paths', () => {
  it('sends the period the caller asked for, not the server default', async () => {
    await aiInsightsApi.getInsights(7);
    expect(mockRequest).toHaveBeenCalledWith('/api/insights?days=7');
  });

  it('defaults to the same 30 days the web selector opens on', async () => {
    await aiInsightsApi.getInsights();
    expect(mockRequest).toHaveBeenCalledWith(`/api/insights?days=${DEFAULT_INSIGHT_PERIOD}`);
    expect(DEFAULT_INSIGHT_PERIOD).toBe(30);
  });

  it('refreshes with POST and carries the period, so the right cached row is replaced', async () => {
    await aiInsightsApi.refreshInsights(90);
    expect(mockRequest).toHaveBeenCalledWith('/api/insights/refresh?days=90', { method: 'POST' });
  });

  /**
   * No `days`, on purpose. `getTodayRecommendations` calls `getOrGenerateInsights(userId)`
   * with no period argument (`backend/src/controllers/insights.ts:60`), so the handler would
   * ignore one. Sending it anyway would imply a period selector affects today's advice.
   */
  it('asks for today without a period, because the handler has none', async () => {
    await aiInsightsApi.getTodayRecommendations();
    expect(mockRequest).toHaveBeenCalledWith('/api/insights/today');
  });

  it('reads freshness from the one endpoint that spends nothing', async () => {
    await aiInsightsApi.getFreshness();
    expect(mockRequest).toHaveBeenCalledWith('/api/insights/freshness');
  });

  /**
   * A GET would be a different route. `/api/insights/refresh` is POST-only
   * (`backend/src/routes/insights.ts`), and getting this wrong turns the one control that can
   * regenerate anything into a 404.
   */
  it('never sends a body-less POST as a GET', async () => {
    await aiInsightsApi.refreshInsights(14);
    const [, options] = mockRequest.mock.calls[0];
    expect(options).toEqual({ method: 'POST' });
  });
});

describe('the periods offered', () => {
  /**
   * These four are not a design choice — `services/insights.ts:ALL_PERIODS` caches one
   * `ai_insights` row per value in exactly this set, and `refreshAllPeriods` regenerates
   * exactly these. Offering a fifth would mean a period that can never hit a cached row and
   * therefore always costs a full Gemini generation.
   */
  it('offers exactly the four periods the backend caches a row for', () => {
    expect([...INSIGHT_PERIODS]).toEqual([7, 14, 30, 90]);
  });

  it('opens on one of them', () => {
    expect(INSIGHT_PERIODS).toContain(DEFAULT_INSIGHT_PERIOD);
  });
});
