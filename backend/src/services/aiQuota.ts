/**
 * Per-user AI call quota.
 *
 * TrackVibe is free and has no paid tier, so this is NOT a paywall — it is the ceiling on
 * Gemini spend any single account can cause. Every user gets `config.aiMonthlyLimit` calls
 * per calendar month across chat, voice, insights and food search.
 *
 * This used to be inert in production. Both entry points opened with
 * `if (!config.lemonSqueezyApiKey) return { allowed: true, remaining: -1, isPro: true }`,
 * labelled "dev mode" — but no payment provider is configured, so the branch was always
 * taken and every user had unlimited calls on the owner's bill. Not having a payment
 * provider is exactly what disabled the cost control.
 *
 * The `PRO_STATUSES` path is kept: the subscription code is dormant rather than deleted, and
 * if a row is ever marked `pro` it should still mean unlimited.
 */
import { getPool } from '../db/pool.js';
import { config } from '../config/index.js';

/**
 * The monthly allowance. Reads config so it can be tuned by env without a code deploy.
 * A function rather than a constant because `config` is resolved at import time in tests.
 */
export function monthlyLimit(): number {
  return config.aiMonthlyLimit;
}

const PRO_STATUSES = ['pro'];

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export interface QuotaResult {
  allowed: boolean;
  remaining: number;
  isPro: boolean;
}

/**
 * Check whether the user can make an AI call and consume one unit if allowed.
 * - Pro users: always allowed, remaining = -1 (unlimited).
 * - Free users: allowed if ai_calls_used < the monthly limit; atomically increments.
 * - Month rollover is handled inline (no cron needed).
 */
export async function tryConsumeAiCall(userId: string): Promise<QuotaResult> {
  const pool = getPool();
  const month = currentMonth();

  // First check subscription status
  const { rows: userRows } = await pool.query(
    'SELECT subscription_status FROM users WHERE id = $1',
    [userId],
  );

  const status = userRows[0]?.subscription_status || 'free';
  if (PRO_STATUSES.includes(status)) {
    return { allowed: true, remaining: -1, isPro: true };
  }

  // Atomic increment for free users: resets if month changed, increments if under limit
  const { rows } = await pool.query(
    `UPDATE users
     SET ai_calls_used = CASE
           WHEN ai_calls_reset_month IS DISTINCT FROM $2 THEN 1
           ELSE ai_calls_used + 1
         END,
         ai_calls_reset_month = $2
     WHERE id = $1
       AND (
         ai_calls_reset_month IS DISTINCT FROM $2
         OR ai_calls_used < $3
       )
     RETURNING ai_calls_used`,
    [userId, month, monthlyLimit()],
  );

  if (rows.length === 0) {
    // No row updated = quota exhausted
    return { allowed: false, remaining: 0, isPro: false };
  }

  const used = rows[0].ai_calls_used as number;
  return { allowed: true, remaining: monthlyLimit() - used, isPro: false };
}

/**
 * Check whether the user may make an AI call WITHOUT consuming one.
 * Use to gate a session at the start (e.g. WebSocket connect) and only
 * `tryConsumeAiCall` once there is a real, successful result — so empty or
 * failed attempts don't burn a free-tier call.
 */
export async function checkAiQuota(userId: string): Promise<QuotaResult> {
  const pool = getPool();
  const { rows } = await pool.query(
    'SELECT subscription_status, ai_calls_used, ai_calls_reset_month FROM users WHERE id = $1',
    [userId],
  );
  const row = rows[0];
  const status = row?.subscription_status || 'free';
  if (PRO_STATUSES.includes(status)) {
    return { allowed: true, remaining: -1, isPro: true };
  }

  const used = row?.ai_calls_reset_month === currentMonth() ? Number(row?.ai_calls_used || 0) : 0;
  const remaining = Math.max(0, monthlyLimit() - used);
  return { allowed: remaining > 0, remaining, isPro: false };
}

/**
 * Get remaining AI calls without consuming one. Used for profile/status endpoints.
 */
export async function getAiCallsRemaining(userId: string, subscriptionStatus?: string): Promise<number> {
  const status = subscriptionStatus || 'free';
  if (PRO_STATUSES.includes(status)) return -1;

  const pool = getPool();
  const month = currentMonth();

  const { rows } = await pool.query(
    'SELECT ai_calls_used, ai_calls_reset_month FROM users WHERE id = $1',
    [userId],
  );

  if (rows.length === 0) return monthlyLimit();

  const row = rows[0];
  if (row.ai_calls_reset_month !== month) return monthlyLimit();

  return Math.max(0, monthlyLimit() - (row.ai_calls_used || 0));
}
