/**
 * User model -- typed data access layer for the users table.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  created_at: string;
  password_hash: string | null;
  auth_provider: string | null;
  provider_id: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  reset_token_hash: string | null;
  reset_token_expires: string | null;
  subscription_status: string | null;
  subscription_plan: string | null;
  subscription_current_period_end: string | null;
  subscription_source: string | null;
  ai_calls_used: number | null;
  ai_calls_reset_month: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt?: string;
  subscriptionStatus: string;
  subscriptionPlan: string | null;
  subscriptionCurrentPeriodEnd: string | null;
  aiCallsRemaining: number;
}

const USER_COLS = 'id, email, name, role, created_at, subscription_status, subscription_plan, subscription_current_period_end, ai_calls_used, ai_calls_reset_month';
const FULL_USER_COLS = USER_COLS + ', password_hash, auth_provider, provider_id, failed_login_attempts, locked_until';

export function rowToUser(row: UserRow): User {
  const status = row.subscription_status || 'free';
  const remaining = getAiCallsRemainingSync(status, row.ai_calls_used, row.ai_calls_reset_month);
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    subscriptionStatus: status,
    subscriptionPlan: row.subscription_plan || null,
    subscriptionCurrentPeriodEnd: row.subscription_current_period_end || null,
    aiCallsRemaining: remaining,
  };
}

/** Compute remaining AI calls synchronously from row data (no DB query needed). */
function getAiCallsRemainingSync(status: string, used: number | null, resetMonth: string | null): number {
  if (status === 'pro') return -1;
  const FREE_TIER_LIMIT = 10;
  const d = new Date();
  const currentMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  if (resetMonth !== currentMonth) return FREE_TIER_LIMIT;
  return Math.max(0, FREE_TIER_LIMIT - (used || 0));
}

export async function findByEmail(email: string, client?: pg.Pool | pg.PoolClient): Promise<UserRow | null> {
  const db = client ?? getPool();
  const result = await db.query(
    `SELECT ${FULL_USER_COLS} FROM users WHERE email = $1`,
    [email.trim().toLowerCase()]
  );
  return (result.rows[0] as UserRow) ?? null;
}

export async function findById(id: string, client?: pg.Pool | pg.PoolClient): Promise<UserRow | null> {
  const db = client ?? getPool();
  const result = await db.query(
    `SELECT ${USER_COLS} FROM users WHERE id = $1`,
    [id]
  );
  return (result.rows[0] as UserRow) ?? null;
}

export async function create(
  data: { email: string; passwordHash: string; name: string },
  client?: pg.Pool | pg.PoolClient
): Promise<UserRow> {
  const db = client ?? getPool();
  const result = await db.query(
    `INSERT INTO users (email, password_hash, name, role)
     VALUES ($1, $2, $3, 'user')
     RETURNING ${USER_COLS}`,
    [data.email.trim().toLowerCase(), data.passwordHash, data.name.trim()]
  );
  return result.rows[0] as UserRow;
}

export async function findOrCreateProviderUser(
  data: { authProvider: string; providerId: string; email: string; name: string },
  client?: pg.Pool | pg.PoolClient
): Promise<UserRow> {
  const db = client ?? getPool();
  const emailNorm = data.email ? data.email.trim().toLowerCase() : '';
  const nameTrim = data.name ? data.name.trim() : 'Unknown';

  if (!emailNorm && !data.providerId) {
    throw new Error('email or provider_id required');
  }

  // Check by provider
  let result = await db.query(
    `SELECT ${USER_COLS} FROM users WHERE auth_provider = $1 AND provider_id = $2`,
    [data.authProvider, data.providerId]
  );
  if (result.rows.length > 0) {
    return result.rows[0] as UserRow;
  }

  // Check by email
  if (emailNorm) {
    result = await db.query(
      `SELECT ${USER_COLS} FROM users WHERE email = $1`,
      [emailNorm]
    );
    if (result.rows.length > 0) {
      await db.query(
        'UPDATE users SET auth_provider = $1, provider_id = $2 WHERE id = $3',
        [data.authProvider, data.providerId, result.rows[0].id]
      );
      return result.rows[0] as UserRow;
    }
  }

  // Create new user
  const insertEmail = emailNorm || `${data.authProvider}-${data.providerId}@social.local`;
  result = await db.query(
    `INSERT INTO users (email, password_hash, name, role, auth_provider, provider_id)
     VALUES ($1, NULL, $2, 'user', $3, $4)
     RETURNING ${USER_COLS}`,
    [insertEmail, nameTrim, data.authProvider, data.providerId]
  );
  return result.rows[0] as UserRow;
}

export async function updateFailedAttempts(
  userId: string,
  attempts: number,
  lockUntil: Date | null,
  client?: pg.Pool | pg.PoolClient
): Promise<void> {
  const db = client ?? getPool();
  await db.query(
    'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE id = $3',
    [attempts, lockUntil, userId]
  );
}

export async function clearFailedAttempts(userId: string, client?: pg.Pool | pg.PoolClient): Promise<void> {
  const db = client ?? getPool();
  await db.query(
    'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
    [userId]
  );
}

export async function setResetToken(
  userId: string,
  hash: string,
  expiresAt: Date,
  client?: pg.Pool | pg.PoolClient
): Promise<void> {
  const db = client ?? getPool();
  await db.query(
    'UPDATE users SET reset_token_hash = $1, reset_token_expires = $2 WHERE id = $3',
    [hash, expiresAt, userId]
  );
}

export async function findByResetToken(
  email: string,
  tokenHash: string,
  client?: pg.Pool | pg.PoolClient
): Promise<UserRow | null> {
  const db = client ?? getPool();
  const result = await db.query(
    'SELECT id FROM users WHERE email = $1 AND reset_token_hash = $2 AND reset_token_expires > NOW()',
    [email.trim().toLowerCase(), tokenHash]
  );
  return (result.rows[0] as UserRow) ?? null;
}

export async function updatePassword(
  userId: string,
  passwordHash: string,
  client?: pg.Pool | pg.PoolClient
): Promise<void> {
  const db = client ?? getPool();
  await db.query(
    'UPDATE users SET password_hash = $1, reset_token_hash = NULL, reset_token_expires = NULL WHERE id = $2',
    [passwordHash, userId]
  );
}

export interface SubscriptionGrant {
  plan?: string | null;
  currentPeriodEnd?: Date | string | null;
}

export async function getSubscriptionGrant(userId: string): Promise<SubscriptionGrant> {
  const db = getPool();
  const result = await db.query(
    `SELECT subscription_plan, subscription_current_period_end
     FROM users
     WHERE id = $1`,
    [userId],
  );
  return {
    plan: result.rows[0]?.subscription_plan ?? null,
    currentPeriodEnd: result.rows[0]?.subscription_current_period_end ?? null,
  };
}

/**
 * Historical `subscription_source = 'trainer'` grants are left alone. The role that created
 * them is gone, but the Pro they bought those users is theirs to keep.
 */

// ---------------------------------------------------------------------------
// Account deletion
//
// One definition of "delete this user and everything hanging off them", shared by the admin
// route (`DELETE /api/users/:id`) and self-service deletion (`DELETE /api/auth/account`).
// This used to live inline in `routes/users.ts`; a second caller is the moment to extract
// it, not the moment to copy it.
// ---------------------------------------------------------------------------

/**
 * Strip the deleted user's own PII out of the two tables whose rows outlive them.
 *
 * `migrations/1776000000000_cascade-user-delete-fks.js` sets `app_logs.user_id` and
 * `user_activity_log.user_id` to NULL on delete, which drops the *link* and keeps the
 * *payload*. Three writers put PII into that payload:
 *
 *   - `services/auth.ts` publishes `auth.UserRegistered` as `{ userId, email, name }`, and
 *     `events/consumers/userActivityLog.ts` stores the event body verbatim.
 *   - `routes/users.ts` logs `'User updated'` as `{ targetId, email, ... }`.
 *   - `routes/users.ts` logs `'User created'` as `{ email, role }` — **no id of any kind**.
 *
 * Without this a "deleted" user's email and name survive in both tables, which makes the
 * privacy policy false.
 *
 * The two tables need different predicates, because they are different kinds of log:
 *
 *   - **`app_logs` is an actor log.** `user_id` is whoever *performed* the action, not who
 *     it was about: all three rows above are filed under the admin's id. Matching on
 *     `user_id` would therefore both miss the subject's rows and, when the deleted user is
 *     themselves an admin, strip other people's emails out of unrelated audit entries. So
 *     match the address itself (which also catches the id-less `'User created'` row), plus
 *     the subject-id keys for rows that name a target without repeating their email.
 *   - **`user_activity_log` is a subject log.** The consumer files every row under
 *     `event.metadata.userId`, so `user_id` *is* the subject and matching on it is correct.
 *
 * Runs before the `SET NULL` statements below, while `user_id` still points at the user.
 *
 * `jsonb - 'key'` is a no-op when the key is absent but raises `cannot delete from scalar`
 * on a non-object value, hence the `jsonb_typeof` guard. The `?` pre-filter keeps the UPDATE
 * from rewriting every log row in order to remove nothing.
 *
 * Parameters are `$1` uuid, `$2` the same id as text (one statement cannot deduce two types
 * for one placeholder) and `$3` the email. The JSON arms are a sequential scan either way --
 * account deletion is rare and off the request-latency path.
 */
const PII_REDACTION_STATEMENTS = [
  `UPDATE app_logs
      SET details = details - 'email' - 'targetEmail' - 'name'
    WHERE jsonb_typeof(details) = 'object'
      AND (details ? 'email' OR details ? 'targetEmail' OR details ? 'name')
      AND (
        lower(details->>'email') = lower($3)
        OR lower(details->>'targetEmail') = lower($3)
        OR details->>'targetId' = $2
        OR details->>'userId' = $2
      )`,
  `UPDATE user_activity_log
      SET payload = payload - 'email' - 'name'
    WHERE jsonb_typeof(payload) = 'object'
      AND (payload ? 'email' OR payload ? 'name')
      AND (user_id = $1 OR payload->>'userId' = $2 OR lower(payload->>'email') = lower($3))`,
];

/**
 * Drop the link to the user without removing the row. The cascade migration also sets these
 * FKs to `ON DELETE SET NULL`, so on a migrated database this is belt-and-braces -- but it
 * is the only thing that does it on a database that predates the migration.
 */
const SET_NULL_STATEMENTS = [
  `UPDATE app_logs SET user_id = NULL WHERE user_id = $1`,
  `UPDATE user_activity_log SET user_id = NULL WHERE user_id = $1`,
  `UPDATE exercises SET created_by = NULL WHERE created_by = $1`,
  `UPDATE foods SET verified_by = NULL WHERE verified_by = $1`,
];

/**
 * Delete user-owned rows. Most have `ON DELETE CASCADE` in newer migrations, but the
 * baseline tables don't on a database that predates the cascade migration.
 */
const DELETE_STATEMENTS = [
  `DELETE FROM food_entries WHERE user_id = $1`,
  `DELETE FROM workouts WHERE user_id = $1`,
  `DELETE FROM goals WHERE user_id = $1`,
  `DELETE FROM daily_check_ins WHERE user_id = $1`,
];

/** Postgres codes for "no such table" and "no such column". */
const MISSING_TABLE = '42P01';
const MISSING_COLUMN = '42703';

/**
 * Run one cleanup statement inside a savepoint. A failed statement aborts the whole
 * transaction otherwise, so catching the error is not enough -- the savepoint is what makes
 * "this table is not in this database" survivable.
 */
async function runTolerantly(
  client: pg.PoolClient,
  sql: string,
  params: unknown[],
  tolerated: readonly string[],
): Promise<void> {
  await client.query('SAVEPOINT delete_user_stmt');
  try {
    await client.query(sql, params);
    await client.query('RELEASE SAVEPOINT delete_user_stmt');
  } catch (err: unknown) {
    const code = (err as { code?: string } | null)?.code;
    if (!code || !tolerated.includes(code)) throw err;
    await client.query('ROLLBACK TO SAVEPOINT delete_user_stmt');
  }
}

/**
 * Redact the user's PII from surviving log rows, clear attribution columns, delete owned
 * rows, then delete the user. Must run inside a transaction -- it uses savepoints.
 *
 * The address is read up front, under `FOR UPDATE`, because the redaction predicates match
 * on it and it is gone by the end. The lock also serialises two concurrent deletions of the
 * same account: the second waits, then finds no row. The address is used only inside this
 * function and is never returned -- `services/account.ts` deliberately has no way to log it.
 *
 * @returns false when no such user existed, so a repeated delete of the same account is a
 *   clean no-op at this layer rather than an error.
 */
export async function deleteWithOwnedData(userId: string, client: pg.PoolClient): Promise<boolean> {
  const existing = await client.query('SELECT email FROM users WHERE id = $1 FOR UPDATE', [userId]);
  if (existing.rowCount === 0) return false;
  const email: string = existing.rows[0].email ?? '';

  for (const sql of PII_REDACTION_STATEMENTS) {
    await runTolerantly(client, sql, [userId, userId, email], [MISSING_TABLE, MISSING_COLUMN]);
  }
  for (const sql of SET_NULL_STATEMENTS) {
    await runTolerantly(client, sql, [userId], [MISSING_TABLE, MISSING_COLUMN]);
  }
  for (const sql of DELETE_STATEMENTS) {
    await runTolerantly(client, sql, [userId], [MISSING_TABLE]);
  }

  const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING id', [userId]);
  return (result.rowCount ?? 0) > 0;
}
