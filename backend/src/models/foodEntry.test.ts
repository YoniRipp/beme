/**
 * Regression guard: DATE columns must serialize as the stored local calendar day.
 *
 * node-postgres parses a PostgreSQL DATE into a JS Date at *local* midnight.
 * Rendering that with `.toISOString()` converts to UTC and rolls back a day for
 * every timezone ahead of UTC (UTC+1..UTC+14), so an entry logged today came
 * back dated yesterday and the Food log's "Daily" totals read 0.
 *
 * The timezone is forced here rather than relying on the runner's TZ: CI runs in
 * UTC, where this class of bug is invisible.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

process.env.TZ = 'Asia/Jerusalem';

const mockQuery = vi.fn();
vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

import * as foodEntryModel from './foodEntry.js';

/** What node-postgres hands back for `DATE '2026-09-12'`: local midnight. */
const pgDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const row = (date: Date | string) => ({
  id: 'fe-1',
  date,
  name: 'Greek yogurt',
  calories: 120,
  protein: 12,
  carbs: 7,
  fats: 4,
  portion_amount: 170,
  portion_unit: 'g',
  serving_type: null,
  start_time: null,
  end_time: null,
  meal_type: 'breakfast',
});

beforeEach(() => {
  mockQuery.mockReset();
});

describe('foodEntry DATE serialization (TZ=Asia/Jerusalem, UTC+3)', () => {
  it('sanity: the test really is running ahead of UTC', () => {
    expect(-new Date(2026, 8, 12).getTimezoneOffset() / 60).toBe(3);
  });

  it('returns the stored day for findByUserIdAndDate, not the day before', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row(pgDate('2026-09-12'))], rowCount: 1 });

    const [entry] = await foodEntryModel.findByUserIdAndDate('u-1', '2026-09-12');

    expect(entry.date).toBe('2026-09-12');
  });

  it('returns the stored day from create', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row(pgDate('2026-09-12'))], rowCount: 1 });

    const entry = await foodEntryModel.create({
      userId: 'u-1',
      date: '2026-09-12',
      name: 'Greek yogurt',
      calories: 120,
      protein: 12,
      carbs: 7,
      fats: 4,
    });

    expect(entry.date).toBe('2026-09-12');
  });

  it('returns the stored day from findByUserId', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 1 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [row(pgDate('2026-09-12'))], rowCount: 1 });

    const { data } = await foodEntryModel.findByUserId('u-1');

    expect(data[0].date).toBe('2026-09-12');
  });

  it('returns the stored day from deleteById (feeds the event payload)', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ date: pgDate('2026-09-12') }], rowCount: 1 });

    const deleted = await foodEntryModel.deleteById('fe-1', 'u-1');

    expect(deleted).toEqual({ date: '2026-09-12' });
  });

  it('holds across a DST boundary and at the start of a month', async () => {
    for (const day of ['2026-01-01', '2026-03-27', '2026-10-25', '2026-12-31']) {
      mockQuery.mockResolvedValueOnce({ rows: [row(pgDate(day))], rowCount: 1 });
      const [entry] = await foodEntryModel.findByUserIdAndDate('u-1', day);
      expect(entry.date).toBe(day);
    }
  });

  it('still passes through a plain string date unchanged', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [row('2026-09-12')], rowCount: 1 });

    const [entry] = await foodEntryModel.findByUserIdAndDate('u-1', '2026-09-12');

    expect(entry.date).toBe('2026-09-12');
  });
});
