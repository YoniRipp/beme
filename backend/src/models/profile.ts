/**
 * User profile model — typed data access layer.
 */
import pg from 'pg';
import { getPool } from '../db/pool.js';
import type { UserProfile, UpsertProfileInput } from '../types/domain.js';

const RETURNING = 'id, date_of_birth, sex, height_cm, current_weight, target_weight, activity_level, water_goal_glasses, cycle_tracking_enabled, average_cycle_length, setup_completed, units, macro_carbs, macro_fat, macro_protein';

function formatDate(value: unknown): string | undefined {
  if (!value) return undefined;
  // pg returns DATE columns as JS Date objects by default. Date#toString
  // produces the long locale form (e.g. "Wed Aug 17 1994 ..."), which breaks
  // the YYYY-MM-DD contract the API and clients expect.
  if (value instanceof Date) {
    const y = value.getUTCFullYear().toString().padStart(4, '0');
    const m = (value.getUTCMonth() + 1).toString().padStart(2, '0');
    const d = value.getUTCDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function rowToProfile(row: Record<string, unknown>): UserProfile {
  return {
    id: row.id as string,
    dateOfBirth: formatDate(row.date_of_birth),
    sex: (row.sex as string) ?? undefined,
    heightCm: row.height_cm != null ? Number(row.height_cm) : undefined,
    currentWeight: row.current_weight != null ? Number(row.current_weight) : undefined,
    targetWeight: row.target_weight != null ? Number(row.target_weight) : undefined,
    activityLevel: (row.activity_level as string) ?? undefined,
    waterGoalGlasses: Number(row.water_goal_glasses ?? 8),
    cycleTrackingEnabled: Boolean(row.cycle_tracking_enabled),
    averageCycleLength: row.average_cycle_length != null ? Number(row.average_cycle_length) : undefined,
    setupCompleted: Boolean(row.setup_completed),
    // Left `undefined` rather than defaulted: "never told us" is a distinct state from
    // "metric", and only the first can be backfilled later.
    units: (row.units as 'metric' | 'imperial' | null) ?? undefined,
    macroCarbs: row.macro_carbs != null ? Number(row.macro_carbs) : undefined,
    macroFat: row.macro_fat != null ? Number(row.macro_fat) : undefined,
    macroProtein: row.macro_protein != null ? Number(row.macro_protein) : undefined,
  };
}

export async function findByUserId(userId: string, client?: pg.Pool | pg.PoolClient): Promise<UserProfile | null> {
  const db = client ?? getPool();
  const result = await db.query(`SELECT ${RETURNING} FROM user_profiles WHERE user_id = $1`, [userId]);
  return result.rows.length > 0 ? rowToProfile(result.rows[0]) : null;
}

/**
 * Optional input field → column, in table order. Drives both halves of the upsert.
 */
const UPSERT_COLUMNS: ReadonlyArray<[Exclude<keyof UpsertProfileInput, 'userId'>, string]> = [
  ['dateOfBirth', 'date_of_birth'],
  ['sex', 'sex'],
  ['heightCm', 'height_cm'],
  ['currentWeight', 'current_weight'],
  ['targetWeight', 'target_weight'],
  ['activityLevel', 'activity_level'],
  ['waterGoalGlasses', 'water_goal_glasses'],
  ['cycleTrackingEnabled', 'cycle_tracking_enabled'],
  ['averageCycleLength', 'average_cycle_length'],
  ['setupCompleted', 'setup_completed'],
  ['units', 'units'],
  ['macroCarbs', 'macro_carbs'],
  ['macroFat', 'macro_fat'],
  ['macroProtein', 'macro_protein'],
];

/**
 * Create or patch the caller's profile.
 *
 * `undefined` and `null` mean DIFFERENT things here, and the distinction is the point:
 *
 *   undefined -> the caller did not mention this field. Left out of the statement entirely,
 *                so on update the stored value survives and on insert the column DEFAULT
 *                applies. Binding an explicit NULL instead would bypass that DEFAULT, and
 *                on a migration-built database water_goal_glasses, cycle_tracking_enabled
 *                and setup_completed are NOT NULL -- the insert would die with 23502, and
 *                the first profile write of a brand-new user is exactly the one that omits
 *                fields.
 *   null      -> the caller is actively clearing this field. Written as SQL NULL.
 *
 * This used to filter on `!= null`, which collapsed the two and made every nullable column
 * permanently unclearable: a macro target typed by mistake could never be removed, from any
 * client. That contradicted `upsertProfileSchema`, which marks exactly the clearable fields
 * `.optional().nullable()`, and the mobile dialog, which offers "leave a field empty to
 * remove its target".
 *
 * Safe because that schema is the only way in: the NOT NULL columns above are `.optional()`
 * WITHOUT `.nullable()`, so zod rejects a null for them before it reaches this function. The
 * DEFAULT protection is therefore still intact -- enforced one layer up rather than by
 * flattening null into undefined here.
 */
export async function upsert(input: UpsertProfileInput, client?: pg.Pool | pg.PoolClient): Promise<UserProfile> {
  const db = client ?? getPool();
  const provided = UPSERT_COLUMNS.filter(([field]) => input[field] !== undefined);

  const columns = ['user_id', ...provided.map(([, column]) => column)];
  const values = [input.userId, ...provided.map(([field]) => input[field])];
  // updated_at keeps the SET clause non-empty when userId is the only field supplied.
  const assignments = [...provided.map(([, c]) => `${c} = EXCLUDED.${c}`), 'updated_at = NOW()'];

  const result = await db.query(
    `INSERT INTO user_profiles (${columns.join(', ')})
     VALUES (${columns.map((_, i) => `$${i + 1}`).join(', ')})
     ON CONFLICT (user_id)
     DO UPDATE SET
       ${assignments.join(',\n       ')}
     RETURNING ${RETURNING}`,
    values,
  );
  return rowToProfile(result.rows[0]);
}
