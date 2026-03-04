import { getPool } from '../db/pool.js';

const APP_TABLES = ['users', 'workouts', 'food_entries', 'daily_check_ins', 'goals', 'app_logs', 'user_activity_log', 'user_daily_stats', 'foods'];

export async function getOverviewStats() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int AS "totalUsers",
      (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE)::int AS "newUsersToday",
      (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS "newUsersThisWeek",
      (SELECT COUNT(*) FROM workouts WHERE date = CURRENT_DATE::text)::int AS "workoutsToday",
      (SELECT COUNT(*) FROM food_entries WHERE date = CURRENT_DATE::text)::int AS "foodEntriesToday",
      (SELECT COUNT(*) FROM daily_check_ins WHERE date = CURRENT_DATE::text)::int AS "checkInsToday",
      (SELECT COUNT(*) FROM goals)::int AS "activeGoals"
  `);
  return result.rows[0];
}

export async function getUserGrowth(days = 30) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT date_trunc('day', created_at)::date AS date, COUNT(*)::int AS count
     FROM users
     WHERE created_at >= NOW() - $1::int * INTERVAL '1 day'
     GROUP BY 1
     ORDER BY 1`,
    [days]
  );
  return result.rows;
}

export async function getActivityByDay(days = 14) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       d.date,
       COALESCE(w.cnt, 0)::int AS workouts,
       COALESCE(f.cnt, 0)::int AS "foodEntries",
       COALESCE(c.cnt, 0)::int AS "checkIns"
     FROM generate_series(
       (CURRENT_DATE - $1::int * INTERVAL '1 day')::date,
       CURRENT_DATE,
       '1 day'
     ) AS d(date)
     LEFT JOIN (
       SELECT date::date AS date, COUNT(*) AS cnt FROM workouts
       WHERE date::date >= CURRENT_DATE - $1::int * INTERVAL '1 day'
       GROUP BY 1
     ) w ON w.date = d.date
     LEFT JOIN (
       SELECT date::date AS date, COUNT(*) AS cnt FROM food_entries
       WHERE date::date >= CURRENT_DATE - $1::int * INTERVAL '1 day'
       GROUP BY 1
     ) f ON f.date = d.date
     LEFT JOIN (
       SELECT date::date AS date, COUNT(*) AS cnt FROM daily_check_ins
       WHERE date::date >= CURRENT_DATE - $1::int * INTERVAL '1 day'
       GROUP BY 1
     ) c ON c.date = d.date
     ORDER BY d.date`,
    [days]
  );
  return result.rows;
}

export async function getFeatureAdoption() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(DISTINCT user_id) FROM workouts WHERE created_at >= NOW() - INTERVAL '30 days')::int AS workouts,
      (SELECT COUNT(DISTINCT user_id) FROM food_entries WHERE created_at >= NOW() - INTERVAL '30 days')::int AS "foodEntries",
      (SELECT COUNT(DISTINCT user_id) FROM daily_check_ins WHERE created_at >= NOW() - INTERVAL '30 days')::int AS "checkIns",
      (SELECT COUNT(DISTINCT user_id) FROM goals WHERE created_at >= NOW() - INTERVAL '30 days')::int AS goals,
      (SELECT COUNT(*) FROM users)::int AS "totalUsers"
  `);
  return result.rows[0];
}

export async function getRecentErrors(hours = 24) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       COUNT(*)::int AS count,
       (SELECT message FROM app_logs WHERE level = 'error' ORDER BY created_at DESC LIMIT 1) AS "lastErrorMessage"
     FROM app_logs
     WHERE level = 'error' AND created_at >= NOW() - $1::int * INTERVAL '1 hour'`,
    [hours]
  );
  return result.rows[0];
}

export async function getTableSizes() {
  const pool = getPool();
  const result = await pool.query(
    `SELECT
       relname AS table,
       pg_total_relation_size(c.oid)::bigint AS "sizeBytes"
     FROM pg_class c
     JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE c.relkind = 'r'
       AND n.nspname = 'public'
       AND c.relname = ANY($1)
     ORDER BY pg_total_relation_size(c.oid) DESC`,
    [APP_TABLES]
  );
  return result.rows;
}
