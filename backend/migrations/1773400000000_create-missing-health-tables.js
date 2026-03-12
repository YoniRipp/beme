/**
 * Creates health-tracking tables that were defined in Prisma schema
 * but missing from node-pg-migrate migrations:
 *   user_profiles, energy_checkins, weight_entries, water_entries, cycle_entries
 *
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
      water_goal_glasses int DEFAULT 8,
      cycle_tracking_enabled boolean DEFAULT false,
      average_cycle_length int DEFAULT 28,
      setup_completed boolean DEFAULT false,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
  `);

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS energy_checkins (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      date date NOT NULL,
      sleep_hours numeric(3,1),
      sleep_quality text,
      energy_level int,
      stress_level int,
      mood text,
      calories_consumed int,
      calories_burned int,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      UNIQUE (user_id, date)
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
      glasses int DEFAULT 0,
      ml_total int DEFAULT 0,
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
      period_start boolean DEFAULT false,
      period_end boolean DEFAULT false,
      flow text,
      symptoms jsonb DEFAULT '[]',
      notes text,
      created_at timestamptz DEFAULT now(),
      UNIQUE (user_id, date)
    );
  `);

  // Indexes
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id)');
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_energy_checkins_user_date ON energy_checkins(user_id, date DESC)');
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, date DESC)');
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_water_entries_user_date ON water_entries(user_id, date DESC)');
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_cycle_entries_user_date ON cycle_entries(user_id, date DESC)');
};

export const down = false;
