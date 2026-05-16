/**
 * Ensure deleting a user cascades to all of their owned data.
 *
 * Several tables created in older migrations reference users(id) without
 * ON DELETE CASCADE, which causes DELETE FROM users to fail with a foreign
 * key violation when the user has any related rows.
 *
 * This migration:
 *   - Switches user-owned data tables (workouts, food_entries, goals, etc.)
 *     to ON DELETE CASCADE.
 *   - Switches attribution columns (created_by, verified_by, uploaded_by,
 *     app_logs.user_id, user_activity_log.user_id) to ON DELETE SET NULL,
 *     so the records survive when their creator is removed.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

// Pairs of [table, column, action] for FKs that reference users(id).
// action: 'CASCADE' for user-owned data, 'SET NULL' for attribution columns.
const FK_TARGETS = [
  ['workouts', 'user_id', 'CASCADE'],
  ['food_entries', 'user_id', 'CASCADE'],
  ['goals', 'user_id', 'CASCADE'],
  ['daily_check_ins', 'user_id', 'CASCADE'],
  ['app_logs', 'user_id', 'SET NULL'],
  ['user_activity_log', 'user_id', 'SET NULL'],
  ['exercises', 'created_by', 'SET NULL'],
  ['foods', 'verified_by', 'SET NULL'],
];

export const up = (pgm) => {
  for (const [table, column, action] of FK_TARGETS) {
    // Drop existing FK (by introspection — the name varies between baseline
    // and ALTER-added columns) then re-create with the desired action.
    pgm.sql(`
      DO $$
      DECLARE
        fk_name text;
      BEGIN
        IF to_regclass('public.${table}') IS NULL THEN
          RETURN;
        END IF;
        SELECT tc.constraint_name INTO fk_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = '${table}'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND kcu.column_name = '${column}'
        LIMIT 1;

        IF fk_name IS NOT NULL THEN
          EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I', '${table}', fk_name);
        END IF;

        EXECUTE 'ALTER TABLE ${table}
                 ADD CONSTRAINT ${table}_${column}_fkey
                 FOREIGN KEY (${column}) REFERENCES users(id) ON DELETE ${action}';
      END $$;
    `);
  }
};

export const down = false;
