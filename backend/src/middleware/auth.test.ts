import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireAuth, requireAdmin, resolveEffectiveUserId } from './auth.js';

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
    (kvGet as any).mockResolvedValueOnce('1');

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'UNAUTHORIZED', message: 'Token has been revoked' } });
    expect(next).not.toHaveBeenCalled();
  });

  describe('MCP shared secret', () => {
    // 16 characters, and 16 bytes because it is all ASCII.
    const MCP_SECRET = 'abcdefghijklmnop';

    beforeEach(() => {
      (config as any).mcpSecret = MCP_SECRET;
      (config as any).mcpUserId = 'mcp-user';
    });

    it('authenticates a request carrying the shared secret', async () => {
      req.headers.authorization = `Bearer ${MCP_SECRET}`;

      await requireAuth(req, res, next);

      expect(req.user).toEqual({ id: 'mcp-user', email: 'mcp@local', role: 'user' });
      expect(req.mcpAuth).toBe(true);
      expect(next).toHaveBeenCalled();
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('rejects a wrong token of the same length as the secret', async () => {
      req.headers.authorization = 'Bearer ponmlkjihgfedcba';
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await requireAuth(req, res, next);

      expect(req.mcpAuth).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects a multi-byte token whose character count matches the secret', async () => {
      // 16 UTF-16 code units but 32 UTF-8 bytes. String#length calls it the same size as the
      // secret; timingSafeEqual compares bytes and throws on the mismatch -- and that throw
      // is outside the try below, so it rejects requireAuth's promise and kills the process.
      req.headers.authorization = `Bearer ${'\u00e9'.repeat(16)}`;
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await requireAuth(req, res, next);

      expect(req.mcpAuth).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
      expect(next).not.toHaveBeenCalled();
    });

    it('rejects a multi-byte token delivered in the auth cookie', async () => {
      // cookie-parser percent-decodes, so `Cookie: token=%C3%A9...` arrives here multi-byte.
      req.cookies = { token: '\u00e9'.repeat(16) };
      (jwt.verify as any).mockImplementation(() => {
        throw new Error('invalid token');
      });

      await requireAuth(req, res, next);

      expect(req.mcpAuth).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
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


describe('resolveEffectiveUserId', () => {
  const TARGET_ID = '11111111-2222-3333-4444-555555555555';
  let req: any;
  let res: any;
  let next: any;

  /** Actor role as the database currently records it, plus whether the target user exists. */
  function stubUsers(actorRole: string, targetExists = true) {
    mockQuery.mockImplementation(async (sql: unknown, params: unknown) => {
      if (String(sql).includes('SELECT role')) return { rows: [{ role: actorRole }] };
      return { rows: targetExists ? [{ id: (params as string[])[0] }] : [] };
    });
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockQuery.mockReset();
    req = { user: { id: 'actor-1', email: 'admin@test.com', role: 'admin' }, query: {}, body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    next = vi.fn();
  });

  it('resolves to the caller and queries nothing when there is no override', async () => {
    await resolveEffectiveUserId(req, res, next);

    expect(req.effectiveUserId).toBe('actor-1');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('ignores an override from a non-admin claim without querying the database', async () => {
    req.user.role = 'user';
    req.query.userId = TARGET_ID;

    await resolveEffectiveUserId(req, res, next);

    expect(req.effectiveUserId).toBe('actor-1');
    expect(mockQuery).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });

  it('honours an override from an admin the database still records as an admin', async () => {
    stubUsers('admin');
    req.query.userId = TARGET_ID;

    await resolveEffectiveUserId(req, res, next);

    expect(mockQuery).toHaveBeenCalledWith('SELECT role FROM users WHERE id = $1', ['actor-1']);
    expect(req.effectiveUserId).toBe(TARGET_ID);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('refuses an override from a demoted admin whose token still claims the role', async () => {
    // Tokens last a year, so without re-reading the role a demoted admin keeps cross-user
    // read/write until their token expires. requireAdmin re-reads for this reason, but it is
    // not in the withUser chain the ?userId=-honouring routes use.
    stubUsers('user');
    req.query.userId = TARGET_ID;

    await resolveEffectiveUserId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: { code: 'FORBIDDEN', message: 'Admin access required' } });
    expect(req.effectiveUserId).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('refuses an override from an actor the database no longer has', async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    req.query.userId = TARGET_ID;

    await resolveEffectiveUserId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(req.effectiveUserId).toBeUndefined();
    expect(next).not.toHaveBeenCalled();
  });

  it('still rejects a malformed userId before touching the database', async () => {
    req.query.userId = 'not-a-uuid';

    await resolveEffectiveUserId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it('still 404s when the target user does not exist', async () => {
    stubUsers('admin', false);
    req.query.userId = TARGET_ID;

    await resolveEffectiveUserId(req, res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(next).not.toHaveBeenCalled();
  });

  it('forwards a database failure to the error handler', async () => {
    const dbError = new Error('connection lost');
    mockQuery.mockRejectedValue(dbError);
    req.query.userId = TARGET_ID;

    await resolveEffectiveUserId(req, res, next);

    expect(next).toHaveBeenCalledWith(dbError);
    expect(res.status).not.toHaveBeenCalled();
  });
});
