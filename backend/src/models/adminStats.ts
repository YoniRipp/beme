import { getPool } from '../db/pool.js';

export async function getBusinessOverview() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM users)::int AS "totalUsers",
      (SELECT COUNT(*) FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS "newUsersThisWeek",
      (SELECT COUNT(*) FROM users WHERE subscription_status = 'pro')::int AS "proSubscribers",
      (SELECT COUNT(*) FROM users WHERE role = 'trainer' OR subscription_status IN ('trainer', 'trainer_pro'))::int AS "totalTrainers",
      (SELECT COUNT(DISTINCT client_id) FROM trainer_clients WHERE status = 'active')::int AS "totalTrainees",
      (SELECT COUNT(*) FROM trainer_clients WHERE status = 'active')::int AS "activeTrainerClientLinks",
      (SELECT COUNT(DISTINCT trainer_id) FROM trainer_clients WHERE status = 'active')::int AS "activeTrainersWithClients",
      (SELECT COUNT(*) FROM trainer_invitations WHERE status = 'pending' AND expires_at > now())::int AS "pendingTrainerInvites",
      (SELECT COUNT(*) FROM users WHERE subscription_status = 'pro' AND subscription_plan = 'monthly')::int AS "monthlyProSubscribers",
      (SELECT COUNT(*) FROM users WHERE subscription_status = 'pro' AND subscription_plan = 'yearly')::int AS "yearlyProSubscribers",
      (SELECT COUNT(*) FROM users WHERE subscription_status = 'pro' AND COALESCE(subscription_source, 'self') = 'self')::int AS "selfPaidSubscribers",
      (SELECT COUNT(*) FROM users WHERE subscription_status = 'pro' AND subscription_source = 'trainer')::int AS "trainerGrantedSubscribers",
      (SELECT COUNT(*) FROM users WHERE subscription_status IN ('canceled', 'expired'))::int AS "churned",
      (SELECT COUNT(*) FROM user_activity_log
        WHERE event_type LIKE 'voice.%'
        AND created_at >= date_trunc('month', CURRENT_DATE))::int AS "voiceCallsThisMonth",
      (SELECT COUNT(DISTINCT user_id) FROM user_activity_log
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')::int AS "weeklyActiveUsers"
  `);
  return result.rows[0];
}

export async function getSubscriptionBreakdown() {
  const pool = getPool();
  const result = await pool.query(`
    SELECT label, count::int
    FROM (
      SELECT 1 AS sort, 'Monthly pro' AS label,
        COUNT(*) FILTER (WHERE subscription_status = 'pro' AND subscription_plan = 'monthly') AS count
      FROM users
      UNION ALL
      SELECT 2, 'Yearly pro',
        COUNT(*) FILTER (WHERE subscription_status = 'pro' AND subscription_plan = 'yearly')
      FROM users
      UNION ALL
      SELECT 3, 'Trainer-granted',
        COUNT(*) FILTER (WHERE subscription_status = 'pro' AND subscription_source = 'trainer')
      FROM users
      UNION ALL
      SELECT 4, 'Free',
        COUNT(*) FILTER (WHERE subscription_status IS NULL OR subscription_status = 'free')
      FROM users
      UNION ALL
      SELECT 5, 'Churned',
        COUNT(*) FILTER (WHERE subscription_status IN ('canceled', 'expired'))
      FROM users
    ) segments
    ORDER BY sort
  `);
  return result.rows;
}

export async function getTrainerGrowth(days = 30) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT d.date::text,
            COALESCE(t.new_trainers, 0)::int AS "newTrainers",
            COALESCE(c.new_trainees, 0)::int AS "newTrainees"
     FROM generate_series(
       (CURRENT_DATE - $1::int * INTERVAL '1 day')::date,
       CURRENT_DATE, '1 day'
     ) AS d(date)
     LEFT JOIN (
       SELECT created_at::date AS date, COUNT(*) AS new_trainers
       FROM users
       WHERE (role = 'trainer' OR subscription_status IN ('trainer', 'trainer_pro'))
         AND created_at >= CURRENT_DATE - $1::int * INTERVAL '1 day'
       GROUP BY 1
     ) t ON t.date = d.date
     LEFT JOIN (
       SELECT created_at::date AS date, COUNT(*) AS new_trainees
       FROM trainer_clients
       WHERE status = 'active'
         AND created_at >= CURRENT_DATE - $1::int * INTERVAL '1 day'
       GROUP BY 1
     ) c ON c.date = d.date
     ORDER BY d.date`,
    [days]
  );
  return result.rows;
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

export async function getDailyVoiceCalls(days = 30) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT d.date::text, COALESCE(v.cnt, 0)::int AS calls
     FROM generate_series(
       (CURRENT_DATE - $1::int * INTERVAL '1 day')::date,
       CURRENT_DATE, '1 day'
     ) AS d(date)
     LEFT JOIN (
       SELECT created_at::date AS date, COUNT(*) AS cnt
       FROM user_activity_log
       WHERE event_type LIKE 'voice.%'
         AND created_at >= CURRENT_DATE - $1::int * INTERVAL '1 day'
       GROUP BY 1
     ) v ON v.date = d.date
     ORDER BY d.date`,
    [days]
  );
  return result.rows;
}

export async function getVoiceHeavyUsers(limit = 10) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT u.id, u.name, u.email,
            u.subscription_status AS "subscriptionStatus",
            COUNT(*)::int AS "voiceCalls",
            MAX(al.created_at) AS "lastActive"
     FROM user_activity_log al
     JOIN users u ON u.id = al.user_id
     WHERE al.event_type LIKE 'voice.%'
       AND al.created_at >= date_trunc('month', CURRENT_DATE)
     GROUP BY u.id, u.name, u.email, u.subscription_status
     ORDER BY COUNT(*) DESC
     LIMIT $1`,
    [limit]
  );
  return result.rows;
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
