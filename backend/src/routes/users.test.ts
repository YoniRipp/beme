/**
 * Admin user routes — the delete half.
 *
 * The deletion transaction moved into `services/account.ts` so `DELETE /api/auth/account`
 * could reuse it. These tests pin the admin route's HTTP surface in place across that move:
 * the web client, the Expo app and the MCP server all read this route, and it answers in the
 * legacy bare-`{ error: string }` shape rather than the modern error envelope.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

const mockDeleteAccount = vi.fn();
const mockQuery = vi.fn();

vi.mock('../services/account.js', () => ({
  deleteAccount: (...args: unknown[]) => mockDeleteAccount(...args),
}));

vi.mock('../db/index.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

vi.mock('../services/appLog.js', () => ({
  logAction: vi.fn(),
}));

let actingUserId = 'admin-9';

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req: any, _res: any, next: any) => {
    req.user = { id: actingUserId, email: 'admin@test.com', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

import usersRouter from './users.js';
import { errorHandler } from '../middleware/errorHandler.js';
import { ConflictError, NotFoundError } from '../errors.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(usersRouter);
  app.use(errorHandler);
  return app;
}

const TARGET = 'user-1';

describe('DELETE /api/users/:id', () => {
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    actingUserId = 'admin-9';
    mockDeleteAccount.mockResolvedValue({ filesDeleted: 0 });
    app = createApp();
  });

  it('delegates to the shared deletion service and returns 204', async () => {
    await request(app).delete(`/api/users/${TARGET}`).expect(204);

    expect(mockDeleteAccount).toHaveBeenCalledWith({ userId: TARGET, actorId: 'admin-9' });
  });

  // The admin holds their own token, not the subject's; there is nothing here to blocklist.
  it('asks for no token revocation, because the admin’s token is not the subject’s', async () => {
    await request(app).delete(`/api/users/${TARGET}`).expect(204);

    expect(mockDeleteAccount.mock.calls[0][0].revokeToken).toBeUndefined();
  });

  it('still refuses self-deletion, which is what /api/auth/account is for', async () => {
    actingUserId = TARGET;

    const res = await request(app).delete(`/api/users/${TARGET}`).expect(400);

    expect(res.body).toEqual({ error: 'Cannot delete your own account' });
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('answers 404 in the legacy bare-error shape', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new NotFoundError('User not found'));

    const res = await request(app).delete(`/api/users/${TARGET}`).expect(404);

    expect(res.body).toEqual({ error: 'User not found' });
  });

  // The wording is admin console copy and stays that way; the service's own conflict message
  // is deliberately different because it reaches an end user on the self-service route.
  it('keeps the admin-facing migration hint on 409', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new ConflictError('related records remain'));

    const res = await request(app).delete(`/api/users/${TARGET}`).expect(409);

    expect(res.body).toEqual({
      error: 'Cannot delete user: related records exist. Run database migrations to enable cascading delete.',
    });
  });

  it('answers 500 in the legacy bare-error shape', async () => {
    mockDeleteAccount.mockRejectedValueOnce(new Error('connection reset'));

    const res = await request(app).delete(`/api/users/${TARGET}`).expect(500);

    expect(res.body).toEqual({ error: 'connection reset' });
  });
});
