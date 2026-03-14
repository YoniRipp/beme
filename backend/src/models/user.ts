/**
 * User model -- typed data access layer for the users table.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';

export interface UserRow {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'trainer';
  created_at: string;
  password_hash: string | null;
  auth_provider: string | null;
  provider_id: string | null;
  failed_login_attempts: number;
  locked_until: string | null;
  reset_token_hash: string | null;
  reset_token_expires: string | null;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  subscription_source: string | null;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'trainer';
  createdAt?: string;
  subscriptionStatus: string;
  subscriptionCurrentPeriodEnd: string | null;
}

const USER_COLS = 'id, email, name, role, created_at, subscription_status, subscription_current_period_end';
const FULL_USER_COLS = USER_COLS + ', password_hash, auth_provider, provider_id, failed_login_attempts, locked_until';

export function rowToUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    subscriptionStatus: row.subscription_status || 'free',
    subscriptionCurrentPeriodEnd: row.subscription_current_period_end || null,
  };
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

/** Grant pro subscription from trainer link (only upgrades free users). */
export async function grantTrainerSubscription(userId: string): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE users SET subscription_status = 'pro', subscription_source = 'trainer'
     WHERE id = $1 AND (subscription_status IS NULL OR subscription_status = 'free')`,
    [userId],
  );
}

/** Revoke trainer-granted pro (only affects users whose pro came from a trainer). */
export async function revokeTrainerSubscription(userId: string): Promise<void> {
  const db = getPool();
  await db.query(
    `UPDATE users SET subscription_status = 'free', subscription_source = 'self'
     WHERE id = $1 AND subscription_source = 'trainer'`,
    [userId],
  );
}
