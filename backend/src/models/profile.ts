/**
 * User profile model — typed data access layer.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';
import type { UserProfile, UpsertProfileInput } from '../types/domain.js';

const RETURNING = 'id, date_of_birth, sex, height_cm, current_weight, target_weight, activity_level, water_goal_glasses, cycle_tracking_enabled, average_cycle_length, setup_completed';

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    dateOfBirth: row.date_of_birth ? String(row.date_of_birth) : undefined,
    sex: (row.sex as string) ?? undefined,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    currentWeight: row.current_weight != null ? Number(row.current_weight) : undefined,
    targetWeight: row.target_weight != null ? Number(row.target_weight) : undefined,
    activityLevel: (row.activity_level as string) ?? undefined,
    waterGoalGlasses: Number(row.water_goal_glasses ?? 8),
    cycleTrackingEnabled: Boolean(row.cycle_tracking_enabled),
    averageCycleLength: row.average_cycle_length != null ? Number(row.average_cycle_length) : undefined,
    setupCompleted: Boolean(row.setup_completed),
  };
}

export async function findByUserId(userId: string, client?: pg.Pool | pg.PoolClient): Promise<UserProfile | null> {
  const db = client ?? getPool();
  const result = await db.query(`SELECT ${RETURNING} FROM user_profiles WHERE user_id = $1`, [userId]);
  return result.rows.length > 0 ? rowToProfile(result.rows[0]) : null;
}

export async function upsert(input: UpsertProfileInput, client?: pg.Pool | pg.PoolClient): Promise<UserProfile> {
  const db = client ?? getPool();
  const result = await db.query(
    `INSERT INTO user_profiles (id, user_id, date_of_birth, sex, height_cm, current_weight, target_weight, activity_level, water_goal_glasses, cycle_tracking_enabled, average_cycle_length, setup_completed, updated_at)
     VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET
       date_of_birth = COALESCE($2, user_profiles.date_of_birth),
       sex = COALESCE($3, user_profiles.sex),
       height_cm = COALESCE($4, user_profiles.height_cm),
       current_weight = COALESCE($5, user_profiles.current_weight),
       target_weight = COALESCE($6, user_profiles.target_weight),
       activity_level = COALESCE($7, user_profiles.activity_level),
       water_goal_glasses = COALESCE($8, user_profiles.water_goal_glasses),
       cycle_tracking_enabled = COALESCE($9, user_profiles.cycle_tracking_enabled),
       average_cycle_length = COALESCE($10, user_profiles.average_cycle_length),
       setup_completed = COALESCE($11, user_profiles.setup_completed),
       updated_at = NOW()
     RETURNING ${RETURNING}`,
    [
      input.userId,
      input.dateOfBirth ?? null,
      input.sex ?? null,
      input.heightCm ?? null,
      input.currentWeight ?? null,
      input.targetWeight ?? null,
      input.activityLevel ?? null,
      input.waterGoalGlasses ?? 8,
      input.cycleTrackingEnabled ?? false,
      input.averageCycleLength ?? null,
      input.setupCompleted ?? false,
    ],
  );
  return rowToProfile(result.rows[0]);
}
