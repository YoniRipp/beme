import { describe, it, expect, vi, beforeEach } from 'vitest';
import type pg from 'pg';

const mockQuery = vi.fn();

vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

import { deleteWithOwnedData, __piiRedactionStatements } from './user.js';

const USER_ID = '11111111-2222-3333-4444-555555555555';
const USER_EMAIL = 'deleted.person@example.com';

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
      if (sql.includes('SELECT email FROM users')) {
        return { rowCount: 1, rows: [{ email: USER_EMAIL }] };
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

/**
 * Postgres numbers a statement's parameters up to the highest `$n` the SQL mentions, and
 * rejects the statement at *parse* time with 42P18 if any index in that range is never
 * referenced -- it has nothing to infer a type from. An unreferenced `$1` therefore takes
 * down every account deletion with a 500, whether or not there is anything to redact.
 *
 * This is exactly the bug the rest of this file cannot see: those tests drive a recording
 * stub whose `query` never parses SQL, so a statement that Postgres would refuse outright
 * passes them all. Checking the placeholders against the bound arity needs no database and
 * catches the whole class.
 */
describe('PII redaction statements — placeholders vs. bound parameters', () => {
  it.each(__piiRedactionStatements.map((s, i) => [i, s] as const))(
    'statement %i references every parameter it binds, and binds every one it references',
    (_index, statement) => {
      const referenced = new Set(
        [...statement.sql.matchAll(/\$(\d+)/g)].map((m) => Number(m[1])),
      );
      const bound = statement.params('11111111-2222-3333-4444-555555555555', 'a@b.c').length;
      const highest = Math.max(...referenced);

      expect(bound, 'binds a different number of parameters than the SQL uses').toBe(highest);
      for (let n = 1; n <= highest; n += 1) {
        expect(referenced.has(n), `$${n} is bound but never referenced — Postgres raises 42P18`).toBe(true);
      }
    },
  );
});

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
    const { client, sqls } = recordingClient({
      'SELECT email FROM users': () => ({ rowCount: 0, rows: [] }),
    });

    // A second delete of the same account has to be a clean no-op at this layer; the service
    // turns it into a 404, and only because the caller asked for a user that is not there.
    await expect(deleteWithOwnedData(USER_ID, client)).resolves.toBe(false);
    // And it must bail before rewriting anyone's log rows.
    expect(sqls().some((s) => s.includes('UPDATE app_logs'))).toBe(false);
  });

  // Two concurrent deletions of the same account would otherwise both redact and both race
  // on the final DELETE. The row lock makes the second wait and then find nothing.
  it('locks the user row before touching anything else', async () => {
    const { client, sqls } = recordingClient();

    await deleteWithOwnedData(USER_ID, client);

    expect(sqls()[0]).toContain('FOR UPDATE');
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
      expect(redaction!.sql).toContain("details->>'targetId' = $1");
      expect(redaction!.params).toEqual([USER_ID, USER_EMAIL]);
    });

    // `logAction('User created', { email, role }, adminId)` (routes/users.ts) carries the
    // new user's address and *no id at all* — not targetId, not userId. Matching the
    // address itself is the only thing that reaches it.
    it('matches on the address, so the id-less "User created" row is caught too', async () => {
      const { client, calls } = recordingClient();

      await deleteWithOwnedData(USER_ID, client);

      const redaction = calls.find((c) => /UPDATE app_logs\s+SET details/.test(c.sql));
      expect(redaction!.sql).toContain("details->>'email'");
      expect(redaction!.params).toContain(USER_EMAIL);
    });

    // app_logs is an *actor* log: user_id is who performed the action, not who it was
    // about. Matching it would strip other people's emails out of an admin's audit trail
    // when that admin deletes their own account — silent, irreversible audit-trail loss.
    it('does not redact app_logs rows merely because the deleted user wrote them', async () => {
      const { client, calls } = recordingClient();

      await deleteWithOwnedData(USER_ID, client);

      const redaction = calls.find((c) => /UPDATE app_logs\s+SET details/.test(c.sql));
      expect(redaction!.sql).not.toMatch(/user_id = \$1/);
    });

    // user_activity_log is the opposite: the consumer files every row under
    // event.metadata.userId, so there user_id *is* the subject.
    it('does match user_activity_log on user_id, where the row is about its owner', async () => {
      const { client, calls } = recordingClient();

      await deleteWithOwnedData(USER_ID, client);

      const redaction = calls.find((c) => /UPDATE user_activity_log\s+SET payload/.test(c.sql));
      expect(redaction!.sql).toMatch(/user_id = \$1/);
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
