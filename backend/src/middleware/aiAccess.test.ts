import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAiAccess, requireAiQuota } from './aiAccess.js';

const mockTryConsumeAiCall = vi.fn();
const mockCheckAiQuota = vi.fn();

vi.mock('../services/aiQuota.js', () => ({
  tryConsumeAiCall: (...args: unknown[]) => mockTryConsumeAiCall(...args),
  checkAiQuota: (...args: unknown[]) => mockCheckAiQuota(...args),
}));

/** The exhausted-quota body is a contract: the web client and the MCP server branch on it. */
const EXHAUSTED_BODY = {
  error: 'free_quota_exhausted',
  message: "You've used all your free AI calls this month. Exciting updates coming soon!",
  remainingCalls: 0,
};

describe('requireAiQuota', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { user: { id: 'user-123' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    };
    next = vi.fn();
  });

  it('returns 401 when user is not authenticated', async () => {
    req.user = null;

    await requireAiQuota(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(mockTryConsumeAiCall).not.toHaveBeenCalled();
  });

  it('calls next when user has pro subscription', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: true, remaining: -1, isPro: true });

    await requireAiQuota(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for free user with remaining quota', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: true, remaining: 7, isPro: false });

    await requireAiQuota(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.locals.remainingCalls).toBe(7);
  });

  it('debits exactly one call per request', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: true, remaining: 7, isPro: false });

    await requireAiQuota(req, res, next);

    expect(mockTryConsumeAiCall).toHaveBeenCalledTimes(1);
    expect(mockTryConsumeAiCall).toHaveBeenCalledWith('user-123');
    expect(mockCheckAiQuota).not.toHaveBeenCalled();
  });

  it('returns 403 when free user quota is exhausted', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requireAiQuota(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(EXHAUSTED_BODY);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has canceled subscription', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requireAiQuota(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has past_due subscription', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requireAiQuota(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when subscription_status is null (defaults to free)', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requireAiQuota(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(error) on database failure', async () => {
    const dbError = new Error('DB connection failed');
    mockTryConsumeAiCall.mockRejectedValue(dbError);

    await requireAiQuota(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('requireAiAccess', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { user: { id: 'user-123' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      locals: {},
    };
    next = vi.fn();
  });

  it('returns 401 when user is not authenticated', async () => {
    req.user = null;

    await requireAiAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('never consumes a call — this is the whole point of the split', async () => {
    mockCheckAiQuota.mockResolvedValue({ allowed: true, remaining: 4, isPro: false });

    await requireAiAccess(req, res, next);

    expect(mockTryConsumeAiCall).not.toHaveBeenCalled();
    expect(mockCheckAiQuota).toHaveBeenCalledTimes(1);
    expect(mockCheckAiQuota).toHaveBeenCalledWith('user-123');
  });

  it('calls next when user has pro subscription', async () => {
    mockCheckAiQuota.mockResolvedValue({ allowed: true, remaining: -1, isPro: true });

    await requireAiAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for free user with remaining quota and reports the undebited balance', async () => {
    mockCheckAiQuota.mockResolvedValue({ allowed: true, remaining: 4, isPro: false });

    await requireAiAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.locals.remainingCalls).toBe(4);
  });

  it('allows a free user with exactly one call left without spending it', async () => {
    mockCheckAiQuota.mockResolvedValue({ allowed: true, remaining: 1, isPro: false });

    await requireAiAccess(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.locals.remainingCalls).toBe(1);
    expect(mockTryConsumeAiCall).not.toHaveBeenCalled();
  });

  it('returns the byte-identical 403 body when the quota is exhausted', async () => {
    mockCheckAiQuota.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requireAiAccess(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(EXHAUSTED_BODY);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(error) on database failure', async () => {
    const dbError = new Error('DB connection failed');
    mockCheckAiQuota.mockRejectedValue(dbError);

    await requireAiAccess(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.status).not.toHaveBeenCalled();
  });
});

describe('quota-exhausted response parity', () => {
  it('both guards deny with the same serialized body', async () => {
    vi.clearAllMocks();
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });
    mockCheckAiQuota.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    const bodies: unknown[] = [];
    const statuses: number[] = [];
    const makeRes = () => ({
      status: vi.fn(function (this: any, s: number) {
        statuses.push(s);
        return this;
      }),
      json: vi.fn(function (this: any, b: unknown) {
        bodies.push(b);
        return this;
      }),
      locals: {},
    });

    await requireAiQuota({ user: { id: 'u' } } as any, makeRes() as any, vi.fn());
    await requireAiAccess({ user: { id: 'u' } } as any, makeRes() as any, vi.fn());

    expect(statuses).toEqual([403, 403]);
    expect(JSON.stringify(bodies[0])).toBe(JSON.stringify(bodies[1]));
    expect(JSON.stringify(bodies[0])).toBe(JSON.stringify(EXHAUSTED_BODY));
  });
});
