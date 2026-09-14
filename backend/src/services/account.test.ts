import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockDeleteWithOwnedData = vi.fn();
const mockDeleteUserFiles = vi.fn();
const mockBlockToken = vi.fn();
const mockBlockAllUserTokens = vi.fn();
const mockLogAction = vi.fn();
const mockLogError = vi.fn();

vi.mock('../db/pool.js', () => ({
  getPool: () => ({ connect: async () => ({ query: vi.fn(), release: vi.fn() }) }),
}));

// The service composes a transaction; the transaction helper itself is covered by its own
// callers. Running the callback directly keeps these tests about the composition.
vi.mock('../db/transaction.js', () => ({
  withTransaction: (_pool: unknown, fn: (client: unknown) => Promise<unknown>) =>
    fn({ query: vi.fn() }),
}));

vi.mock('../models/user.js', () => ({
  deleteWithOwnedData: (...args: unknown[]) => mockDeleteWithOwnedData(...args),
}));

vi.mock('./storage.js', () => ({
  deleteUserFiles: (...args: unknown[]) => mockDeleteUserFiles(...args),
  userFilePrefix: (userId: string) => `users/${userId}/`,
}));

vi.mock('./auth.js', () => ({
  blockToken: (...args: unknown[]) => mockBlockToken(...args),
  blockAllUserTokens: (...args: unknown[]) => mockBlockAllUserTokens(...args),
}));

vi.mock('./appLog.js', () => ({
  logAction: (...args: unknown[]) => mockLogAction(...args),
  logError: (...args: unknown[]) => mockLogError(...args),
}));

import { deleteAccount } from './account.js';
import { ConflictError, NotFoundError } from '../errors.js';

const USER_ID = 'user-1';
const ADMIN_ID = 'admin-9';

describe('account service — deleteAccount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDeleteWithOwnedData.mockResolvedValue(true);
    mockDeleteUserFiles.mockResolvedValue(0);
  });

  it('deletes the user’s rows', async () => {
    await deleteAccount({ userId: USER_ID, actorId: null });

    expect(mockDeleteWithOwnedData).toHaveBeenCalledWith(USER_ID, expect.anything());
  });

  it('raises NotFound when there was no such user', async () => {
    mockDeleteWithOwnedData.mockResolvedValue(false);

    await expect(deleteAccount({ userId: USER_ID, actorId: null })).rejects.toBeInstanceOf(NotFoundError);
  });

  // The route layer turns this into a 409. The message matters: the admin route substitutes
  // its own "run database migrations" wording, and the service's must not be that, because
  // the self-service route shows it to whoever is deleting their own account.
  it('translates a foreign-key violation into a Conflict that says nothing about migrations', async () => {
    mockDeleteWithOwnedData.mockRejectedValue(Object.assign(new Error('fk'), { code: '23503' }));

    const error = await deleteAccount({ userId: USER_ID, actorId: null }).catch((e) => e);

    expect(error).toBeInstanceOf(ConflictError);
    expect(error.message).not.toMatch(/migration/i);
  });

  // `services/storage.ts` writes uploads to `users/<id>/…` and no database column records
  // the key, so the prefix is the only handle deletion has. Without this the objects outlive
  // the account forever.
  describe('S3 objects', () => {
    it('empties the deleted user’s file prefix', async () => {
      mockDeleteUserFiles.mockResolvedValue(4);

      const result = await deleteAccount({ userId: USER_ID, actorId: null });

      expect(mockDeleteUserFiles).toHaveBeenCalledWith(USER_ID);
      expect(result.filesDeleted).toBe(4);
    });

    it('sweeps for an admin-initiated deletion too, not only for self-service', async () => {
      await deleteAccount({ userId: USER_ID, actorId: ADMIN_ID });

      expect(mockDeleteUserFiles).toHaveBeenCalledWith(USER_ID);
    });

    // The rows are already committed by the time the sweep runs, so failing the request
    // would tell the caller their account still exists when it does not. It is logged with
    // the prefix instead, which is the only thing left to re-run the sweep from.
    it('still succeeds when the sweep fails, and records the prefix so it can be re-run', async () => {
      mockDeleteUserFiles.mockRejectedValue(new Error('S3 unavailable'));

      await expect(deleteAccount({ userId: USER_ID, actorId: null })).resolves.toEqual({ filesDeleted: 0 });
      expect(mockLogError).toHaveBeenCalledWith(
        expect.stringMatching(/file prefix/i),
        expect.objectContaining({ prefix: `users/${USER_ID}/` }),
      );
    });
  });

  // `middleware/auth.ts` verifies the JWT signature and checks a blocklist -- it never looks
  // the user up. With a 365-day default TTL, a token that is not blocklisted keeps
  // authenticating as a user who no longer exists for up to a year.
  describe('session revocation', () => {
    // The per-token blocklist can only reach the session that presented its token. Every
    // other device the user is signed in on needs the per-user entry, or it keeps
    // authenticating against a deleted account until its token expires.
    it('revokes every session the user has, not just the one making the request', async () => {
      await deleteAccount({ userId: USER_ID, actorId: null, revokeToken: 'jwt-abc' });

      expect(mockBlockAllUserTokens).toHaveBeenCalledWith(USER_ID);
    });

    it('blocklists the token the deletion request arrived with', async () => {
      await deleteAccount({ userId: USER_ID, actorId: null, revokeToken: 'jwt-abc' });

      expect(mockBlockToken).toHaveBeenCalledWith('jwt-abc');
    });

    // An admin presents their own token, so there is nothing session-specific to revoke --
    // but the subject's own sessions still have to die, and only the per-user entry can do
    // that. This path had no revocation at all before.
    it('revokes the subject’s sessions on the admin path too', async () => {
      await deleteAccount({ userId: USER_ID, actorId: ADMIN_ID });

      expect(mockBlockAllUserTokens).toHaveBeenCalledWith(USER_ID);
      expect(mockBlockToken).not.toHaveBeenCalled();
    });

    it('still succeeds when the blocklist write fails, and says so in the log', async () => {
      mockBlockAllUserTokens.mockRejectedValue(new Error('redis down'));

      await expect(
        deleteAccount({ userId: USER_ID, actorId: null, revokeToken: 'jwt-abc' }),
      ).resolves.toBeDefined();
      expect(mockLogError).toHaveBeenCalledWith(
        expect.stringMatching(/session/i),
        expect.objectContaining({ targetId: USER_ID }),
      );
    });
  });

  describe('audit entry', () => {
    // The old inline handler logged `{ targetId, targetEmail }` *after* the delete, writing
    // the address the deletion had just removed straight back into app_logs.details.
    it('records no email, undoing the point of the redaction if it did', async () => {
      await deleteAccount({ userId: USER_ID, actorId: ADMIN_ID });

      const [, details] = mockLogAction.mock.calls[0];
      expect(JSON.stringify(details)).not.toMatch(/email/i);
      expect(details).toMatchObject({ targetId: USER_ID });
    });

    // app_logs.user_id references users(id) and the entry is written after the commit, so
    // attributing a self-deletion to the deleted user fails the insert -- and logAction
    // swallows insert failures, so the audit record would disappear without a sound.
    it('attributes a self-deletion to nobody rather than to the row it just deleted', async () => {
      await deleteAccount({ userId: USER_ID, actorId: null, revokeToken: 'jwt-abc' });

      expect(mockLogAction).toHaveBeenCalledWith('User deleted', expect.anything(), null);
    });

    it('attributes an admin deletion to the admin', async () => {
      await deleteAccount({ userId: USER_ID, actorId: ADMIN_ID });

      expect(mockLogAction).toHaveBeenCalledWith('User deleted', expect.anything(), ADMIN_ID);
    });
  });
});
