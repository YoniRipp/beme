/**
 * Adds period_days column to ai_insights and creates chat_messages table.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  // Add period_days to ai_insights for cache keying by period
  pgm.sql(`ALTER TABLE ai_insights ADD COLUMN IF NOT EXISTS period_days int NOT NULL DEFAULT 30;`);

  // Create chat_messages table for AI coach conversations
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role text NOT NULL CHECK (role IN ('user', 'assistant')),
      content text NOT NULL,
      created_at timestamptz DEFAULT now()
    );
  `);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages (user_id, created_at DESC);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS chat_messages;`);
  pgm.sql(`ALTER TABLE ai_insights DROP COLUMN IF EXISTS period_days;`);
};
