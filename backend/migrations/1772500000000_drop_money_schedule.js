/**
 * Drop Money (transactions) and Schedule features.
 * BeMe is pivoting to a wellness-focused app (Body + Energy + Goals).
 */

export const up = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS transactions CASCADE');
  pgm.sql('DROP TABLE IF EXISTS schedule_items CASCADE');
  pgm.sql('DROP INDEX IF EXISTS idx_schedule_items_user_date');
  pgm.sql('DROP INDEX IF EXISTS idx_transactions_user_date');
  // Remove income/expense columns from daily stats (no longer tracked)
  pgm.sql('ALTER TABLE user_daily_stats DROP COLUMN IF EXISTS total_income');
  pgm.sql('ALTER TABLE user_daily_stats DROP COLUMN IF EXISTS total_expenses');
};

export const down = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS transactions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      date date NOT NULL,
      type text NOT NULL CHECK (type IN ('income', 'expense')),
      amount numeric NOT NULL,
      category text NOT NULL,
      description text,
      is_recurring boolean NOT NULL DEFAULT false,
      currency text NOT NULL DEFAULT 'USD',
      group_id text,
      user_id uuid REFERENCES users(id),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC)');

  pgm.sql(`
    CREATE TABLE IF NOT EXISTS schedule_items (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      start_time text NOT NULL,
      end_time text NOT NULL,
      category text NOT NULL,
      emoji text,
      "order" int NOT NULL DEFAULT 0,
      is_active boolean NOT NULL DEFAULT true,
      recurrence text,
      color text,
      date date NOT NULL DEFAULT CURRENT_DATE,
      group_id text,
      user_id uuid REFERENCES users(id),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    )
  `);
  pgm.sql('CREATE INDEX IF NOT EXISTS idx_schedule_items_user_date ON schedule_items(user_id, date)');

  pgm.sql('ALTER TABLE user_daily_stats ADD COLUMN IF NOT EXISTS total_income numeric DEFAULT 0');
  pgm.sql('ALTER TABLE user_daily_stats ADD COLUMN IF NOT EXISTS total_expenses numeric DEFAULT 0');
};
