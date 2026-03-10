/**
 * Add health tracking tables: user_profiles, weight_entries, water_entries, cycle_entries.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS user_profiles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
      date_of_birth date,
      sex text,
      height_cm numeric,
      current_weight numeric,
      target_weight numeric,
      activity_level text,
      water_goal_glasses int NOT NULL DEFAULT 8,
      cycle_tracking_enabled boolean NOT NULL DEFAULT false,
      average_cycle_length int,
      setup_completed boolean NOT NULL DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS weight_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date date NOT NULL,
      weight numeric NOT NULL,
      notes text,
      created_at timestamptz DEFAULT now(),
      UNIQUE (user_id, date)
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS water_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date date NOT NULL,
      glasses int NOT NULL DEFAULT 0,
      ml_total numeric NOT NULL DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (user_id, date)
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS cycle_entries (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date date NOT NULL,
      period_start boolean NOT NULL DEFAULT false,
      period_end boolean NOT NULL DEFAULT false,
      flow text,
      symptoms jsonb NOT NULL DEFAULT '[]',
      notes text,
      created_at timestamptz DEFAULT now(),
      UNIQUE (user_id, date)
    );
  `);

  // Indexes for common queries
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries (user_id, date DESC);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_water_entries_user_date ON water_entries (user_id, date DESC);`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_cycle_entries_user_date ON cycle_entries (user_id, date DESC);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS cycle_entries;`);
  pgm.sql(`DROP TABLE IF EXISTS water_entries;`);
  pgm.sql(`DROP TABLE IF EXISTS weight_entries;`);
  pgm.sql(`DROP TABLE IF EXISTS user_profiles;`);
};
