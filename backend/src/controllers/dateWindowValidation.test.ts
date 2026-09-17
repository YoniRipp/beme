/**
 * `startDate`/`endDate` on the three endpoints that predate `paginationSchema`.
 *
 * `weight`, `water` and `cycle` accepted these params by casting `req.query` and handing the
 * result straight to a `$n::date` comparison. A malformed bound therefore reached Postgres,
 * which raised a cast error, which `errorHandler` could only render as a 500 INTERNAL_ERROR —
 * telling the caller the server broke when they had in fact sent `?startDate=lastweek`.
 *
 * The other half of the contract matters just as much: these three answer with a **bare array**
 * because `parseOptionalPagination` returns `undefined` when neither bound is sent, and `cycle`
 * has no pagination at all. Validating the dates must not drag a `limit` default in behind it and
 * change three response shapes (critical rule 4), so the tests below pin the pagination argument
 * as well as the dates.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as weightController from './weight.js';
import * as waterController from './water.js';
import * as cycleController from './cycle.js';
import * as weightModel from '../models/weight.js';
import * as waterModel from '../models/water.js';
import * as cycleModel from '../models/cycle.js';
import { getEffectiveUserId } from '../middleware/auth.js';
import { ValidationError } from '../errors.js';

vi.mock('../config/index.js', () => ({
  config: { jwtSecret: 'test', mcpSecret: null, mcpUserId: null },
}));
vi.mock('../models/weight.js');
vi.mock('../models/water.js');
vi.mock('../models/cycle.js');
vi.mock('../middleware/auth.js');

/** `cycle` takes no pagination argument at all, hence `paginated`. */
const ENDPOINTS = [
  { name: 'weight', list: weightController.list, model: weightModel, paginated: true },
  { name: 'water', list: waterController.list, model: waterModel, paginated: true },
  { name: 'cycle', list: cycleController.list, model: cycleModel, paginated: false },
];

/** asyncHandler resolves before its inner promise settles — drain the queue. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe.each(ENDPOINTS)('$name list — date window validation', ({ list, model, paginated }) => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    (getEffectiveUserId as any).mockReturnValue('user-1');
    (model.findByUserId as any).mockResolvedValue([]);
    req = { query: {}, params: {}, body: {}, user: { id: 'user-1' } };
    res = { json: vi.fn(), status: vi.fn().mockReturnThis(), send: vi.fn() };
    next = vi.fn();
  });

  it('passes both bounds through as YYYY-MM-DD strings', async () => {
    req.query = { startDate: '2026-09-01', endDate: '2026-09-17' };

    await list(req, res, next);
    await flush();

    const args = (model.findByUserId as any).mock.calls[0];
    expect(args[1]).toBe('2026-09-01');
    expect(args[2]).toBe('2026-09-17');
    expect(typeof args[1]).toBe('string');
  });

  it('accepts one bound on its own', async () => {
    req.query = { startDate: '2026-09-01' };

    await list(req, res, next);
    await flush();

    const args = (model.findByUserId as any).mock.calls[0];
    expect(args[1]).toBe('2026-09-01');
    expect(args[2]).toBeUndefined();
  });

  /**
   * The behaviour this file exists for. Before, each of these reached `$n::date` and produced a
   * 500; `2026-02-30` is the one that a regex alone would let through, which is why the shared
   * `dateString` carries a real-calendar refinement.
   */
  it.each(['lastweek', '17/09/2026', '2026-9-1', '2026-02-30', ''])(
    'rejects %j with a ValidationError rather than letting Postgres 500',
    async (bad) => {
      req.query = { startDate: bad };

      await list(req, res, next);
      await flush();

      expect(model.findByUserId).not.toHaveBeenCalled();
      expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
    },
  );

  it('leaves the unpaginated default alone when neither bound is sent', async () => {
    req.query = {};

    await list(req, res, next);
    await flush();

    const args = (model.findByUserId as any).mock.calls[0];
    expect(args[1]).toBeUndefined();
    expect(args[2]).toBeUndefined();
    if (paginated) {
      // `parseOptionalPagination` returns undefined for a query with neither limit nor offset,
      // which is what keeps this endpoint answering with a bare array.
      expect(args[3]).toBeUndefined();
    }
  });

  it('still forwards limit/offset, which the date schema must not swallow', async () => {
    if (!paginated) return;
    req.query = { limit: '10', offset: '5', startDate: '2026-09-01' };

    await list(req, res, next);
    await flush();

    const args = (model.findByUserId as any).mock.calls[0];
    expect(args[1]).toBe('2026-09-01');
    expect(args[3]).toEqual({ limit: 10, offset: 5 });
  });
});
