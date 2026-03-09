/**
 * Push subscription model — stores Web Push subscriptions per user.
 */
import { getPool } from '../db/pool.js';

export interface PushSubscriptionRow {
  id: string;
  userId: string;
  endpoint: string;
  keysP256dh: string;
  keysAuth: string;
  createdAt: string;
}

function rowToSubscription(row: Record<string, unknown>): PushSubscriptionRow {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    endpoint: row.endpoint as string,
    keysP256dh: row.keys_p256dh as string,
    keysAuth: row.keys_auth as string,
    createdAt: row.created_at ? String(row.created_at) : '',
  };
}

export async function findByUserId(userId: string): Promise<PushSubscriptionRow[]> {
  const pool = getPool();
  const result = await pool.query(
    'SELECT id, user_id, endpoint, keys_p256dh, keys_auth, created_at FROM push_subscriptions WHERE user_id = $1',
    [userId],
  );
  return result.rows.map(rowToSubscription);
}

export async function upsert(userId: string, endpoint: string, keysP256dh: string, keysAuth: string): Promise<PushSubscriptionRow> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO push_subscriptions (user_id, endpoint, keys_p256dh, keys_auth)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (endpoint) DO UPDATE SET keys_p256dh = $3, keys_auth = $4
     RETURNING id, user_id, endpoint, keys_p256dh, keys_auth, created_at`,
    [userId, endpoint, keysP256dh, keysAuth],
  );
  return rowToSubscription(result.rows[0]);
}

export async function removeByEndpoint(userId: string, endpoint: string): Promise<boolean> {
  const pool = getPool();
  const result = await pool.query(
    'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
    [userId, endpoint],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function removeById(id: string): Promise<void> {
  const pool = getPool();
  await pool.query('DELETE FROM push_subscriptions WHERE id = $1', [id]);
}
