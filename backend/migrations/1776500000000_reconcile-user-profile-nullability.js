export const shorthands = undefined;

/**
 * Converges user_profiles on the nullability contract the domain type already assumes:
 * UserProfile declares waterGoalGlasses, cycleTrackingEnabled and setupCompleted as
 * required, never optional.
 *
 * The two bootstrap paths had disagreed. 1773200000000 created the table with those three
 * NOT NULL, so production (which runs migrations only -- config.skipSchemaInit is true
 * there) has the NOT NULL variant; src/db/schema.ts created them nullable, so a dev
 * machine bootstrapped on startup has the loose variant. Both later CREATE TABLE
 * IF NOT EXISTS statements are no-ops on an existing table, so nothing ever closed the
 * gap, and a dev database stayed permanently looser than production.
 *
 * On production this is a no-op. It is the dev path that moves.
 *
 * Backfill before constraining: a database on the loose variant may already hold NULLs,
 * and SET NOT NULL fails on existing NULL rows.
 */
export const up = (pgm) => {
  pgm.sql(`
    UPDATE user_profiles SET water_goal_glasses     = 8     WHERE water_goal_glasses IS NULL;
    UPDATE user_profiles SET cycle_tracking_enabled = false WHERE cycle_tracking_enabled IS NULL;
    UPDATE user_profiles SET setup_completed        = false WHERE setup_completed IS NULL;
  `);

  pgm.sql(`
    ALTER TABLE user_profiles
      ALTER COLUMN water_goal_glasses     SET DEFAULT 8,
      ALTER COLUMN water_goal_glasses     SET NOT NULL,
      ALTER COLUMN cycle_tracking_enabled SET DEFAULT false,
      ALTER COLUMN cycle_tracking_enabled SET NOT NULL,
      ALTER COLUMN setup_completed        SET DEFAULT false,
      ALTER COLUMN setup_completed        SET NOT NULL;
  `);

  // average_cycle_length stays nullable -- averageCycleLength is optional on UserProfile.
  // Only the schema.ts path ever gave it DEFAULT 28, which would have quietly reported a
  // 28-day cycle for users who never entered one. Production has no default; match it.
  pgm.sql('ALTER TABLE user_profiles ALTER COLUMN average_cycle_length DROP DEFAULT');
};

/**
 * Relaxes the constraints only. The defaults are left in place: they are what production
 * has always had, and dropping them would reintroduce the drift this migration closed.
 */
export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_profiles
      ALTER COLUMN water_goal_glasses     DROP NOT NULL,
      ALTER COLUMN cycle_tracking_enabled DROP NOT NULL,
      ALTER COLUMN setup_completed        DROP NOT NULL;
  `);
};
