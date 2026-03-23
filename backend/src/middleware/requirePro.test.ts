import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requirePro } from './requirePro.js';

const mockTryConsumeAiCall = vi.fn();

vi.mock('../services/aiQuota.js', () => ({
  tryConsumeAiCall: (...args: unknown[]) => mockTryConsumeAiCall(...args),
}));

describe('requirePro', () => {
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

    await requirePro(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next when user has pro subscription', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: true, remaining: -1, isPro: true });

    await requirePro(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('calls next for free user with remaining quota', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: true, remaining: 7, isPro: false });

    await requirePro(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.locals.remainingCalls).toBe(7);
  });

  it('returns 403 when free user quota is exhausted', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requirePro(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      error: 'free_quota_exhausted',
      message: "You've used all your free AI calls this month. Exciting updates coming soon!",
      remainingCalls: 0,
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has canceled subscription', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requirePro(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when user has past_due subscription', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requirePro(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when subscription_status is null (defaults to free)', async () => {
    mockTryConsumeAiCall.mockResolvedValue({ allowed: false, remaining: 0, isPro: false });

    await requirePro(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next(error) on database failure', async () => {
    const dbError = new Error('DB connection failed');
    mockTryConsumeAiCall.mockRejectedValue(dbError);

    await requirePro(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.status).not.toHaveBeenCalled();
  });
});
