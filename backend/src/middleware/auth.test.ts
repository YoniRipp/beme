import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireAdmin } from './auth.js';

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

vi.mock('../config/index.js', () => ({
  config: {
    jwtSecret: 'test-secret',
    mcpSecret: null,
    mcpUserId: null,
  },
}));

vi.mock('../lib/keyValueStore.js', () => ({
  kvGet: vi.fn().mockResolvedValue(null),
}));

const mockQuery = vi.fn();
vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: (...args: unknown[]) => mockQuery(...args) }),
}));

const jwt = (await import('jsonwebtoken')).default;
const { config } = await import('../config/index.js');
const { kvGet } = await import('../lib/keyValueStore.js');

describe('requireAuth', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { headers: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
    (config as any).mcpSecret = null;
    (config as any).mcpUserId = null;
  });

  it('returns 401 when Authorization header is missing', async () => {
    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer ', async () => {
    req.headers.authorization = 'Basic xyz';
    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid Authorization header' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is invalid or expired', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    (jwt.verify as any).mockImplementation(() => {
      throw new Error('invalid token');
    });

    await requireAuth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('invalid-token', 'test-secret', { algorithms: ['HS256'] });
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    expect(next).not.toHaveBeenCalled();
  });

  it('calls next and attaches user when token is valid', async () => {
    req.headers.authorization = 'Bearer valid-token';
    (jwt.verify as any).mockReturnValue({
      sub: 'user-123',
      email: 'user@example.com',
      role: 'user',
    });

    await requireAuth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret', { algorithms: ['HS256'] });
    expect(req.user).toEqual({
      id: 'user-123',
      email: 'user@example.com',
      role: 'user',
    });
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 401 when token is in blocklist', async () => {
    req.headers.authorization = 'Bearer blocked-token';
    (jwt.verify as any).mockReturnValue({
      sub: 'user-123',
      email: 'user@example.com',
      role: 'user',
    });
    (kvGet as any).mockImplementation(async (key: string) =>
      key.startsWith('blocked:') ? '1' : null,
    );

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'UNAUTHORIZED', message: 'Token has been revoked' } });
    expect(next).not.toHaveBeenCalled();
  });

  // Account deletion blocklists the whole user, not just the token that asked for it. This
  // middleware never looks the user up, so without the per-user entry every *other* device
  // the deleted user was signed in on keeps authenticating until its own token expires --
  // up to a year on the 365-day default TTL.
  it('returns 401 for a still-valid token belonging to a deleted user', async () => {
    req.headers.authorization = 'Bearer someone-elses-live-token';
    (jwt.verify as any).mockReturnValue({
      sub: 'user-123',
      email: 'user@example.com',
      role: 'user',
    });
    // This exact token was never blocklisted -- only the user was.
    (kvGet as any).mockImplementation(async (key: string) =>
      key === 'blockedUser:user-123' ? '1' : null,
    );

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('checks both blocklists in one round trip rather than serially', async () => {
    req.headers.authorization = 'Bearer live-token';
    (jwt.verify as any).mockReturnValue({
      sub: 'user-123',
      email: 'user@example.com',
      role: 'user',
    });
    // Explicit: `clearAllMocks` resets recorded calls but keeps an implementation set by an
    // earlier test, so nothing else here guarantees a clean blocklist.
    (kvGet as any).mockImplementation(async () => null);

    await requireAuth(req, res, next);

    const keys = (kvGet as any).mock.calls.map(([key]: [string]) => key);
    expect(keys).toHaveLength(2);
    expect(keys.some((k: string) => k.startsWith('blocked:'))).toBe(true);
    expect(keys).toContain('blockedUser:user-123');
    expect(next).toHaveBeenCalled();
  });
});

describe('requireAdmin', () => {
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { user: { id: 'user-1', email: 'admin@test.com', role: 'admin' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('allows a user the database still records as an admin', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'admin' }] });

    await requireAdmin(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith('SELECT role FROM users WHERE id = $1', ['user-1']);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects a token whose admin claim the database no longer backs', async () => {
    // Tokens last a year, so a demoted admin would otherwise keep admin access for that
    // long on the strength of a stale role claim.
    mockQuery.mockResolvedValueOnce({ rows: [{ role: 'user' }] });

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a deleted user', async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects a non-admin claim without querying the database', async () => {
    req.user.role = 'user';

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('returns 401 when there is no authenticated user', async () => {
    req.user = undefined;

    await requireAdmin(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('forwards a database failure to the error handler', async () => {
    const dbError = new Error('connection lost');
    mockQuery.mockRejectedValueOnce(dbError);

    await requireAdmin(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.status).not.toHaveBeenCalled();
  });
});
