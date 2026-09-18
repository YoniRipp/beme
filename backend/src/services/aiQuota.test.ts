/**
 * The AI quota is the only thing bounding Gemini spend per account, and until now it had no
 * direct test at all — `aiQuotaGating.test.ts` mocks this whole module out. That gap is why
 * the production bypass below survived unnoticed.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockQuery, mockConfig } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  // No payment provider configured — the real deployment's shape, and the exact condition
  // that used to short-circuit the quota to unlimited.
  mockConfig: { aiMonthlyLimit: 100, lemonSqueezyApiKey: undefined as string | undefined },
}));

vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));
vi.mock('../config/index.js', () => ({ config: mockConfig }));

import { tryConsumeAiCall, checkAiQuota, monthlyLimit } from './aiQuota.js';

const thisMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

describe('aiQuota', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockConfig.aiMonthlyLimit = 100;
    mockConfig.lemonSqueezyApiKey = undefined;
  });

  describe('with no payment provider configured', () => {
    /**
     * The regression this file exists for. `tryConsumeAiCall` opened with
     * `if (!config.lemonSqueezyApiKey) return { allowed: true, remaining: -1, isPro: true }`.
     * Since no payment provider is configured in production, that branch was always taken:
     * the cap never ran, nothing was ever counted, and Gemini spend had no ceiling.
     */
    it('still enforces the cap rather than granting unlimited calls', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ subscription_status: 'free' }] })
        .mockResolvedValueOnce({ rows: [] }); // no row updated = allowance used up

      const result = await tryConsumeAiCall('user-1');

      expect(result.allowed).toBe(false);
      expect(result.isPro).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('counts a call against the allowance instead of skipping the write', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ subscription_status: 'free' }] })
        .mockResolvedValueOnce({ rows: [{ ai_calls_used: 7 }] });

      const result = await tryConsumeAiCall('user-1');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(93);
      // The UPDATE actually ran — the bypass returned before reaching it.
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('reports the remaining allowance without consuming one', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ subscription_status: 'free', ai_calls_used: 12, ai_calls_reset_month: thisMonth() }],
      });

      const result = await checkAiQuota('user-1');

      expect(result).toEqual({ allowed: true, remaining: 88, isPro: false });
      expect(mockQuery).toHaveBeenCalledTimes(1); // read only
    });
  });

  it('takes the allowance from config, so it is tunable without a deploy', async () => {
    mockConfig.aiMonthlyLimit = 25;
    expect(monthlyLimit()).toBe(25);

    mockQuery
      .mockResolvedValueOnce({ rows: [{ subscription_status: 'free' }] })
      .mockResolvedValueOnce({ rows: [{ ai_calls_used: 5 }] });

    expect((await tryConsumeAiCall('user-1')).remaining).toBe(20);
  });

  /**
   * The subscription code is dormant, not deleted. If a row is ever marked `pro` it should
   * still mean unlimited — removing the paywall must not remove that.
   */
  it('still treats a pro row as unlimited', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ subscription_status: 'pro' }] });

    const result = await tryConsumeAiCall('user-1');

    expect(result).toEqual({ allowed: true, remaining: -1, isPro: true });
    expect(mockQuery).toHaveBeenCalledTimes(1); // no increment for pro
  });
});
