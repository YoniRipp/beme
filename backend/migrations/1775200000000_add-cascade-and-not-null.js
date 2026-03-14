/**
 * Adds ON DELETE CASCADE to goals and user_activity_log foreign keys,
 * and makes user_id NOT NULL where it was previously nullable.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    -- Safety check: ensure no NULL user_id rows exist before adding NOT NULL
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM goals WHERE user_id IS NULL) THEN
        RAISE EXCEPTION 'Cannot add NOT NULL: goals has rows with NULL user_id';
      END IF;
    END $$;

    -- goals: add ON DELETE CASCADE and NOT NULL
    ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
    ALTER TABLE goals ADD CONSTRAINT goals_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    ALTER TABLE goals ALTER COLUMN user_id SET NOT NULL;

    -- user_activity_log: add ON DELETE CASCADE and NOT NULL (if table exists)
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_log') THEN
        IF EXISTS (SELECT 1 FROM user_activity_log WHERE user_id IS NULL) THEN
          RAISE EXCEPTION 'Cannot add NOT NULL: user_activity_log has rows with NULL user_id';
        END IF;

        -- Drop and recreate FK with CASCADE
        ALTER TABLE user_activity_log DROP CONSTRAINT IF EXISTS user_activity_log_user_id_fkey;
        ALTER TABLE user_activity_log ADD CONSTRAINT user_activity_log_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
        ALTER TABLE user_activity_log ALTER COLUMN user_id SET NOT NULL;
      END IF;
    END $$;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    -- goals: revert to nullable, remove CASCADE
    ALTER TABLE goals ALTER COLUMN user_id DROP NOT NULL;
    ALTER TABLE goals DROP CONSTRAINT IF EXISTS goals_user_id_fkey;
    ALTER TABLE goals ADD CONSTRAINT goals_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id);

    -- user_activity_log: revert (if table exists)
    DO $$ BEGIN
      IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_activity_log') THEN
        ALTER TABLE user_activity_log ALTER COLUMN user_id DROP NOT NULL;
        ALTER TABLE user_activity_log DROP CONSTRAINT IF EXISTS user_activity_log_user_id_fkey;
        ALTER TABLE user_activity_log ADD CONSTRAINT user_activity_log_user_id_fkey
          FOREIGN KEY (user_id) REFERENCES users(id);
      END IF;
    END $$;
  `);
};
