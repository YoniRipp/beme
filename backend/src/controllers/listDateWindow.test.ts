/**
 * `startDate`/`endDate` on the three paged list endpoints.
 *
 * The contract these tests protect is that the two params are optional and
 * additive: a request that sends neither must behave exactly as it did before
 * they existed, and a request that sends them must have them reach the service
 * untouched, as `YYYY-MM-DD` strings.
 *
 * Malformed bounds are rejected here rather than in Postgres. A bad date left to
 * reach `$n::date` raises a pg cast error, which the error handler can only
 * render as a 500; validating in the controller makes it the 400 it is.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as foodEntryController from './foodEntry.js';
import * as workoutController from './workout.js';
import * as dailyCheckInController from './dailyCheckIn.js';
import * as foodEntryService from '../services/foodEntry.js';
import * as workoutService from '../services/workout.js';
import * as dailyCheckInService from '../services/dailyCheckIn.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import { ValidationError } from '../errors.js';

vi.mock('../config/index.js', () => ({
  config: { jwtSecret: 'test', mcpSecret: null, mcpUserId: null },
}));
vi.mock('../services/foodEntry.js');
vi.mock('../services/workout.js');
vi.mock('../services/dailyCheckIn.js');
vi.mock('../middleware/auth.js');

const ENDPOINTS = [
  { name: 'food entries', list: foodEntryController.list, service: foodEntryService },
  { name: 'workouts', list: workoutController.list, service: workoutService },
  { name: 'daily check-ins', list: dailyCheckInController.list, service: dailyCheckInService },
];

/** asyncHandler resolves before its inner promise settles — drain the queue. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe.each(ENDPOINTS)('$name list — date window', ({ list, service }) => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { user: { id: 'user-1' }, params: {}, body: {}, query: {} };
    res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    next = vi.fn();
    getEffectiveUserId.mockReturnValue('user-1');
    service.list.mockResolvedValue({ data: [], total: 0 });
  });

  it('passes both bounds through to the service unchanged', async () => {
    req.query = { startDate: '2026-09-01', endDate: '2026-09-30' };

    await list(req, res, next);
    await flush();

    expect(service.list).toHaveBeenCalledWith(
      'user-1',
      { limit: 50, offset: 0 },
      { startDate: '2026-09-01', endDate: '2026-09-30' },
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('accepts one bound on its own', async () => {
    req.query = { startDate: '2026-09-01' };

    await list(req, res, next);
    await flush();

    expect(service.list).toHaveBeenCalledWith(
      'user-1',
      { limit: 50, offset: 0 },
      { startDate: '2026-09-01', endDate: undefined },
    );
  });

  it('is unchanged when neither bound is supplied', async () => {
    service.list.mockResolvedValue({ data: [{ id: '1' }], total: 1 });

    await list(req, res, next);
    await flush();

    expect(service.list).toHaveBeenCalledWith(
      'user-1',
      { limit: 50, offset: 0 },
      { startDate: undefined, endDate: undefined },
    );
    expect(res.json).toHaveBeenCalledWith({
      data: [{ id: '1' }],
      total: 1,
      limit: 50,
      offset: 0,
      hasMore: false,
    });
  });

  it('still honours limit/offset alongside a window', async () => {
    req.query = { limit: '10', offset: '20', startDate: '2026-09-01' };

    await list(req, res, next);
    await flush();

    expect(service.list).toHaveBeenCalledWith(
      'user-1',
      { limit: 10, offset: 20 },
      { startDate: '2026-09-01', endDate: undefined },
    );
  });

  it.each([
    ['not a date', 'yesterday'],
    ['a non-ISO format', '01/09/2026'],
    ['a day that does not exist', '2026-02-30'],
    ['a timestamp rather than a day', '2026-09-01T00:00:00Z'],
  ])('rejects %s with a 400 instead of querying', async (_label, startDate) => {
    req.query = { startDate };

    await list(req, res, next);
    await flush();

    expect(service.list).not.toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error).toBeInstanceOf(ValidationError);
    expect(error.statusCode).toBe(400);
    expect(error.message).toContain('startDate');
  });
});
