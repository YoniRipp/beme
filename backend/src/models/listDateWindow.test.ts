/**
 * Server-side date filtering for the three paged list models.
 *
 * These endpoints were read whole by the clients — `listAll()` in
 * packages/shared pages at 200 x 25, so mounting a screen could pull 5,000 rows
 * per collection. `startDate`/`endDate` exist to bound that, which only works if
 * two things hold, and both are asserted here:
 *
 *  1. With neither bound supplied the SQL is exactly the SQL that shipped
 *     before — same WHERE, same placeholders, same params. The window is
 *     additive, never a behaviour change for an existing client.
 *  2. The `SELECT COUNT(*)` and the page query carry the IDENTICAL filter.
 *     `total` drives `hasMore` (see utils/response.ts `sendPaginated`), so an
 *     unfiltered count next to filtered rows leaves a client paging past the
 *     end of a window that has already been fully read.
 *
 * Dates are asserted to reach pg as `YYYY-MM-DD` strings against `::date`, never
 * as Date objects — `new Date('2026-09-01')` is UTC midnight and lands on the
 * previous calendar day for every user west of UTC.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockQuery = vi.fn();
vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

import * as foodEntryModel from './foodEntry.js';
import * as workoutModel from './workout.js';
import * as dailyCheckInModel from './dailyCheckIn.js';
import type { PaginationParams } from '../types/domain.js';

type ListModel = {
  name: string;
  table: string;
  findByUserId: (
    userId: string,
    startDate?: string,
    endDate?: string,
    pagination?: PaginationParams,
  ) => Promise<{ data: unknown[]; total: number }>;
};

const LIST_MODELS: ListModel[] = [
  { name: 'foodEntry', table: 'food_entries', findByUserId: foodEntryModel.findByUserId },
  { name: 'workout', table: 'workouts', findByUserId: workoutModel.findByUserId },
  { name: 'dailyCheckIn', table: 'daily_check_ins', findByUserId: dailyCheckInModel.findByUserId },
];

const PAGE: PaginationParams = { limit: 50, offset: 0 };

/** Both queries resolve empty — these tests are about the SQL, not the rows. */
function stubEmptyResult() {
  mockQuery
    .mockResolvedValueOnce({ rows: [{ total: 0 }], rowCount: 1 })
    .mockResolvedValueOnce({ rows: [], rowCount: 0 });
}

const countCall = () => mockQuery.mock.calls[0] as [string, unknown[]];
const pageCall = () => mockQuery.mock.calls[1] as [string, unknown[]];

/** The predicate list, so the count and the page query can be compared directly. */
function whereClause(sql: string): string {
  const after = sql.slice(sql.indexOf('WHERE '));
  const end = after.indexOf(' ORDER BY ');
  return end === -1 ? after : after.slice(0, end);
}

beforeEach(() => {
  mockQuery.mockReset();
});

describe.each(LIST_MODELS)('$name.findByUserId date window', ({ table, findByUserId }) => {
  it('is byte-identical to the unfiltered query when no dates are supplied', async () => {
    stubEmptyResult();

    await findByUserId('u-1', undefined, undefined, PAGE);

    expect(countCall()[0]).toBe(`SELECT COUNT(*)::int AS total FROM ${table} WHERE user_id = $1`);
    expect(countCall()[1]).toEqual(['u-1']);
    expect(pageCall()[0]).toContain(`FROM ${table} WHERE user_id = $1 ORDER BY date DESC, created_at DESC LIMIT $2 OFFSET $3`);
    expect(pageCall()[0]).not.toContain('::date');
    expect(pageCall()[1]).toEqual(['u-1', 50, 0]);
  });

  it('keeps returning the whole history unpaginated when nothing is supplied at all', async () => {
    stubEmptyResult();

    await findByUserId('u-1');

    expect(pageCall()[0]).not.toContain('LIMIT');
    expect(pageCall()[1]).toEqual(['u-1']);
  });

  it('filters on startDate alone, and shifts LIMIT/OFFSET past it', async () => {
    stubEmptyResult();

    await findByUserId('u-1', '2026-09-01', undefined, PAGE);

    expect(pageCall()[0]).toContain('WHERE user_id = $1 AND date >= $2::date ORDER BY');
    expect(pageCall()[0]).toContain('LIMIT $3 OFFSET $4');
    expect(pageCall()[1]).toEqual(['u-1', '2026-09-01', 50, 0]);
  });

  it('filters on endDate alone', async () => {
    stubEmptyResult();

    await findByUserId('u-1', undefined, '2026-09-30', PAGE);

    expect(pageCall()[0]).toContain('WHERE user_id = $1 AND date <= $2::date ORDER BY');
    expect(pageCall()[1]).toEqual(['u-1', '2026-09-30', 50, 0]);
  });

  it('filters on both ends, inclusive, in placeholder order', async () => {
    stubEmptyResult();

    await findByUserId('u-1', '2026-09-01', '2026-09-30', PAGE);

    expect(pageCall()[0]).toContain('WHERE user_id = $1 AND date >= $2::date AND date <= $3::date ORDER BY');
    expect(pageCall()[0]).toContain('LIMIT $4 OFFSET $5');
    expect(pageCall()[1]).toEqual(['u-1', '2026-09-01', '2026-09-30', 50, 0]);
  });

  it('counts through the same window it pages through', async () => {
    mockQuery
      .mockResolvedValueOnce({ rows: [{ total: 7 }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });

    const { total } = await findByUserId('u-1', '2026-09-01', '2026-09-30', PAGE);

    // The count must be narrowed exactly like the page query, or `hasMore`
    // reports rows that the window can never return.
    expect(whereClause(countCall()[0])).toBe(whereClause(pageCall()[0]));
    expect(countCall()[0]).toBe(`SELECT COUNT(*)::int AS total FROM ${table} WHERE user_id = $1 AND date >= $2::date AND date <= $3::date`);
    expect(countCall()[1]).toEqual(['u-1', '2026-09-01', '2026-09-30']);
    // ...and the count must not pick up the page's LIMIT/OFFSET params.
    expect(countCall()[0]).not.toContain('LIMIT');
    expect(total).toBe(7);
  });

  it('sends the bounds as YYYY-MM-DD strings, never Date objects', async () => {
    stubEmptyResult();

    await findByUserId('u-1', '2026-09-01', '2026-09-30', PAGE);

    for (const params of [countCall()[1], pageCall()[1]]) {
      expect(params[1]).toBe('2026-09-01');
      expect(params[2]).toBe('2026-09-30');
      expect(typeof params[1]).toBe('string');
      expect(typeof params[2]).toBe('string');
    }
  });

  it('treats an empty-string bound as "no bound" rather than an empty filter', async () => {
    stubEmptyResult();

    await findByUserId('u-1', '', '', PAGE);

    expect(pageCall()[0]).not.toContain('::date');
    expect(pageCall()[1]).toEqual(['u-1', 50, 0]);
  });
});
