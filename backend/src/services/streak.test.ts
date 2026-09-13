/**
 * The streak day must be the *local* calendar day.
 *
 * `upsertActivity` compares calendar-day strings, so a UTC-derived "today" here
 * would attribute the activity to the previous day for the first hours of the
 * morning in any UTC+ zone — the entry lands on one day and its streak on another.
 *
 * TZ is forced and the clock is faked, because this only reproduces during the
 * window where the local day and the UTC day disagree.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

process.env.TZ = 'Asia/Jerusalem';

const mockUpsert = vi.fn();
vi.mock('../models/streak.js', () => ({
  upsertActivity: (...args: unknown[]) => mockUpsert(...args),
  findByUserId: vi.fn(),
}));
vi.mock('../events/publish.js', () => ({ publishEvent: vi.fn() }));

import * as streakService from './streak.js';

beforeEach(() => {
  mockUpsert.mockReset();
  mockUpsert.mockResolvedValue({
    streak: { id: 's-1', type: 'food', currentCount: 1, bestCount: 1, lastDate: null, createdAt: '' },
    milestone: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('recordActivity date fallback (TZ=Asia/Jerusalem, UTC+3)', () => {
  it('uses the local day at 01:00, when UTC is still on the previous day', async () => {
    // 2026-09-12T01:00 local == 2026-09-11T22:00Z — the failing window.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 12, 1, 0, 0));
    expect(new Date().toISOString().slice(0, 10)).toBe('2026-09-11'); // what it used to send

    await streakService.recordActivity('u-1', 'food');

    expect(mockUpsert).toHaveBeenCalledWith('u-1', 'food', '2026-09-12');
  });

  it('still uses the local day in the middle of the afternoon', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 12, 15, 0, 0));

    await streakService.recordActivity('u-1', 'food');

    expect(mockUpsert).toHaveBeenCalledWith('u-1', 'food', '2026-09-12');
  });

  it('passes an explicit date straight through', async () => {
    await streakService.recordActivity('u-1', 'food', '2026-09-10');

    expect(mockUpsert).toHaveBeenCalledWith('u-1', 'food', '2026-09-10');
  });
});
