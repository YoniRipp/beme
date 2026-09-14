import { describe, it, expect, vi, beforeEach } from 'vitest';
import type pg from 'pg';

const mockQuery = vi.fn();

vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

import { deleteWithOwnedData } from './user.js';

const USER_ID = '11111111-2222-3333-4444-555555555555';

/**
 * `deleteWithOwnedData` is handed a transaction client, so the tests drive a recording stub
 * rather than a pool. Every call is captured in order -- the ordering is the contract here,
 * not an incidental detail (see the redaction test below).
 */
function recordingClient(overrides: Record<string, () => unknown> = {}) {
  const calls: { sql: string; params: unknown[] }[] = [];
  const client = {
    query: vi.fn(async (sql: string, params: unknown[] = []) => {
      calls.push({ sql, params });
      for (const [needle, behaviour] of Object.entries(overrides)) {
        if (sql.includes(needle)) return behaviour();
      }
      return { rowCount: 1, rows: [{ id: USER_ID }] };
    }),
  } as unknown as pg.PoolClient;
  return { client, calls, sqls: () => calls.map((c) => c.sql) };
}

/** Index of the first captured statement containing `needle`, or -1. */
function indexOf(sqls: string[], needle: string) {
  return sqls.findIndex((sql) => sql.includes(needle));
}

describe('user model — deleteWithOwnedData', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('deletes the user row last, after the owned rows are gone', async () => {
    const { client, sqls } = recordingClient();

    await deleteWithOwnedData(USER_ID, client);

    const statements = sqls();
    const userDelete = indexOf(statements, 'DELETE FROM users');
    expect(userDelete).toBeGreaterThan(-1);
    for (const table of ['food_entries', 'workouts', 'goals', 'daily_check_ins']) {
      expect(indexOf(statements, `DELETE FROM ${table}`)).toBeLessThan(userDelete);
    }
  });

  it('reports the user as absent instead of throwing when the row is already gone', async () => {
    const { client } = recordingClient({
      'DELETE FROM users': () => ({ rowCount: 0, rows: [] }),
    });

    // A second delete of the same account has to be a clean no-op at this layer; the service
    // turns it into a 404, and only because the caller asked for a user that is not there.
    await expect(deleteWithOwnedData(USER_ID, client)).resolves.toBe(false);
  });

  // The PII redaction is the whole reason these statements exist. `app_logs.user_id` and
  // `user_activity_log.user_id` are set to NULL a few statements later, and once that has
  // happened `WHERE user_id = $1` matches nothing -- so redacting afterwards would silently
  // scrub zero rows and leave the deleted user's email in both tables.
  describe('PII redaction', () => {
    it('scrubs the deleted user’s email and name out of app_logs.details', async () => {
      const { client, sqls } = recordingClient();

      await deleteWithOwnedData(USER_ID, client);

      const redaction = sqls().find((sql) => /UPDATE app_logs\s+SET details/.test(sql));
      expect(redaction, 'app_logs.details is never redacted').toBeDefined();
      expect(redaction).toContain("- 'email'");
      expect(redaction).toContain("- 'targetEmail'");
      expect(redaction).toContain("- 'name'");
    });

    it('scrubs the auth.UserRegistered payload out of user_activity_log', async () => {
      const { client, sqls } = recordingClient();

      await deleteWithOwnedData(USER_ID, client);

      const redaction = sqls().find((sql) => /UPDATE user_activity_log\s+SET payload/.test(sql));
      expect(redaction, 'user_activity_log.payload is never redacted').toBeDefined();
      expect(redaction).toContain("- 'email'");
      expect(redaction).toContain("- 'name'");
    });

    it('runs both redactions before user_id is set to NULL, or they would match no rows', async () => {
      const { client, sqls } = recordingClient();

      await deleteWithOwnedData(USER_ID, client);

      const statements = sqls();
      const appLogRedaction = statements.findIndex((s) => /UPDATE app_logs\s+SET details/.test(s));
      const appLogSetNull = statements.findIndex((s) => /UPDATE app_logs SET user_id = NULL/.test(s));
      const activityRedaction = statements.findIndex((s) => /UPDATE user_activity_log\s+SET payload/.test(s));
      const activitySetNull = statements.findIndex((s) => /UPDATE user_activity_log SET user_id = NULL/.test(s));

      expect(appLogRedaction).toBeGreaterThan(-1);
      expect(activityRedaction).toBeGreaterThan(-1);
      expect(appLogRedaction).toBeLessThan(appLogSetNull);
      expect(activityRedaction).toBeLessThan(activitySetNull);
    });

    // `logAction('User updated', { targetId, email }, adminId)` files the *subject's* email
    // under the *admin's* user_id, so a WHERE clause that only looks at user_id leaves it
    // behind. The id is bound twice because `user_id = $1` deduces uuid and
    // `details->>'targetId' = $2` deduces text, and one placeholder cannot be both.
    it('matches admin-written rows about the user, not only rows attributed to them', async () => {
      const { client, calls } = recordingClient();

      await deleteWithOwnedData(USER_ID, client);

      const redaction = calls.find((c) => /UPDATE app_logs\s+SET details/.test(c.sql));
      expect(redaction!.sql).toContain("details->>'targetId' = $2");
      expect(redaction!.params).toEqual([USER_ID, USER_ID]);
    });
  });

  describe('savepoint tolerance', () => {
    it('skips a cleanup statement whose table does not exist and still deletes the user', async () => {
      const { client, sqls } = recordingClient({
        'UPDATE exercises': () => {
          throw Object.assign(new Error('relation "exercises" does not exist'), { code: '42P01' });
        },
      });

      await expect(deleteWithOwnedData(USER_ID, client)).resolves.toBe(true);
      expect(sqls()).toContain('ROLLBACK TO SAVEPOINT delete_user_stmt');
      expect(indexOf(sqls(), 'DELETE FROM users')).toBeGreaterThan(-1);
    });

    it('rethrows an error it is not meant to tolerate rather than deleting half the data', async () => {
      const { client } = recordingClient({
        'UPDATE exercises': () => {
          throw Object.assign(new Error('deadlock detected'), { code: '40P01' });
        },
      });

      await expect(deleteWithOwnedData(USER_ID, client)).rejects.toThrow('deadlock detected');
    });
  });
});
