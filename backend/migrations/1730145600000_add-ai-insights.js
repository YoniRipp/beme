/**
 * Adds ai_insights table for caching generated AI insights.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    DO $migration$
    BEGIN
      IF to_regclass('public.users') IS NOT NULL THEN
        EXECUTE $ddl$
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
        $ddl$;
        EXECUTE $ddl$
          CREATE INDEX IF NOT EXISTS idx_ai_insights_user_created
          ON ai_insights (user_id, created_at DESC);
        $ddl$;
      END IF;
    END
    $migration$;
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS ai_insights;`);
};
