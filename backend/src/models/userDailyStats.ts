import { getPool } from '../db/pool.js';

export async function getStatsSince(userId: string, since: string) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT date, total_calories, workout_count, sleep_hours
     FROM user_daily_stats
     WHERE user_id = $1 AND date >= $2
     ORDER BY date ASC`,
    [userId, since]
  );
  return result.rows;
}
