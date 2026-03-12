/**
 * Creates the streaks table for tracking user activity streaks.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS streaks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type text NOT NULL CHECK (type IN ('workout', 'food', 'water', 'weight', 'login')),
      current_count int NOT NULL DEFAULT 0,
      best_count int NOT NULL DEFAULT 0,
      last_date date,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE(user_id, type)
    );
  `);

  pgm.sql('CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id)');
};

export const down = false;
