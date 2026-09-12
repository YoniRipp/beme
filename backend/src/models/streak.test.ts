/**
 * Streak continuity across timezones.
 *
 * `last_date` arrives from pg as a Date at local midnight. Reading it with
 * `.toISOString()` rendered it a day early in every timezone ahead of UTC, while
 * the incoming activity date (a plain `YYYY-MM-DD`) was read correctly — so the
 * two sides of every comparison disagreed by one day. That silently turned a
 * same-day re-log into an increment and a genuine consecutive day into a reset.
 *
 * TZ is forced here because CI runs in UTC, where this bug cannot reproduce.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.TZ = 'Asia/Jerusalem';

const mockQuery = vi.fn();
vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

import * as streakModel from './streak.js';

/** What node-postgres hands back for a DATE: a Date at local midnight. */
const pgDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const existingRow = (lastDate: string, current = 4, best = 9) => ({
  id: 's-1',
  type: 'food',
  current_count: current,
  best_count: best,
  last_date: pgDate(lastDate),
  created_at: '2026-01-01T00:00:00.000Z',
});

beforeEach(() => {
  mockQuery.mockReset();
});

describe('streak upsertActivity (TZ=Asia/Jerusalem, UTC+3)', () => {
  it('treats a re-log on the same day as a no-op', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [existingRow('2026-09-12')], rowCount: 1 });

    const { streak, milestone } = await streakModel.upsertActivity('u-1', 'food', '2026-09-12');

    expect(streak.currentCount).toBe(4);
    expect(milestone).toBeNull();
    // Only the SELECT ran — no UPDATE.
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('increments on a genuinely consecutive day', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [existingRow('2026-09-12')], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...existingRow('2026-09-13'), current_count: 5 }], rowCount: 1 });

    const { streak } = await streakModel.upsertActivity('u-1', 'food', '2026-09-13');

    expect(streak.currentCount).toBe(5);
    const [, params] = mockQuery.mock.calls[1];
    expect(params[0]).toBe(5); // current_count
  });

  it('resets after a real gap', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [existingRow('2026-09-09')], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...existingRow('2026-09-12'), current_count: 1 }], rowCount: 1 });

    await streakModel.upsertActivity('u-1', 'food', '2026-09-12');

    const [, params] = mockQuery.mock.calls[1];
    expect(params[0]).toBe(1);
  });

  it('does not regress the streak for a backfilled past date', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [existingRow('2026-09-12')], rowCount: 1 });

    const { streak } = await streakModel.upsertActivity('u-1', 'food', '2026-09-10');

    expect(streak.currentCount).toBe(4);
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it('carries continuity across a month boundary', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [existingRow('2026-08-31')], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ ...existingRow('2026-09-01'), current_count: 5 }], rowCount: 1 });

    await streakModel.upsertActivity('u-1', 'food', '2026-09-01');

    const [, params] = mockQuery.mock.calls[1];
    expect(params[0]).toBe(5);
  });

  it('exposes lastDate as a YYYY-MM-DD string, not a JS Date string', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [existingRow('2026-09-12')], rowCount: 1 });

    const streaks = await streakModel.findByUserId('u-1');

    expect(streaks[0].lastDate).toBe('2026-09-12');
  });
});
