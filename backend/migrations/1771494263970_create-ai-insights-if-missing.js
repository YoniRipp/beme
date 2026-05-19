/**
 * Compatibility migration for fresh databases.
 *
 * The original ai_insights migration has an older timestamp than the baseline
 * that creates users. Fresh databases therefore need this post-baseline
 * migration to create the table before later insight migrations alter it.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS ai_insights (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      summary text NOT NULL DEFAULT '',
      highlights jsonb NOT NULL DEFAULT '[]',
      suggestions jsonb NOT NULL DEFAULT '[]',
      score int NOT NULL DEFAULT 0,
      today_workout text DEFAULT '',
      today_budget text DEFAULT '',
      today_nutrition text DEFAULT '',
      today_focus text DEFAULT '',
      created_at timestamptz DEFAULT now()
    );
  `);
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_ai_insights_user_created
    ON ai_insights (user_id, created_at DESC);
  `);
};

// No-op: older databases may have created this table in the legacy migration.
export const down = false;
