/**
 * Schema initialization -- development convenience only.
 * In production, use migrations: `npm run migrate:up`
 *
 * This function runs CREATE TABLE IF NOT EXISTS statements for all core tables.
 * It is intentionally idempotent. For column additions and schema changes,
 * use node-pg-migrate migrations (backend/migrations/).
 *
 * Set SKIP_SCHEMA_INIT=true (or NODE_ENV=production) to skip this on startup.
 */
import { getPool } from './pool.js';
import { logger } from '../lib/logger.js';

/**
 * Every foreign key that references `users(id)` whose ON DELETE action was added by
 * `migrations/1776000000000_cascade-user-delete-fks.js`, mirrored here so both bootstrap
 * paths agree. `CASCADE` for user-owned data, `SET NULL` for attribution columns whose rows
 * outlive their creator.
 *
 * Keep this in step with `FK_TARGETS` in that migration.
 * `backend/scripts/check-schema-drift.mjs` compares the two databases' FK actions and fails
 * the `migrations` CI job when they diverge.
 */
const USER_FK_ACTIONS: ReadonlyArray<readonly [table: string, column: string, action: 'CASCADE' | 'SET NULL']> = [
  ['workouts', 'user_id', 'CASCADE'],
  ['food_entries', 'user_id', 'CASCADE'],
  ['goals', 'user_id', 'CASCADE'],
  ['daily_check_ins', 'user_id', 'CASCADE'],
  ['app_logs', 'user_id', 'SET NULL'],
  ['user_activity_log', 'user_id', 'SET NULL'],
  ['exercises', 'created_by', 'SET NULL'],
  ['foods', 'verified_by', 'SET NULL'],
];

export async function initSchema() {
  logger.info('Running development schema initialization (use migrations in production)');
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    // Core tables -- CREATE IF NOT EXISTS only.
    // Column additions and modifications belong in migrations/.
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        password_hash text,
        name text NOT NULL,
        role text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
        auth_provider text NOT NULL DEFAULT 'email',
        provider_id text,
        reset_token_hash text,
        reset_token_expires timestamptz,
        lemon_squeezy_customer_id text,
        subscription_status text DEFAULT 'free',
        subscription_id text,
        subscription_plan text,
        subscription_current_period_end timestamptz,
        subscription_source text DEFAULT 'self',
        ai_calls_used int DEFAULT 0,
        ai_calls_reset_month text,
        phone_number text UNIQUE,
        locked_until timestamptz,
        failed_login_attempts int NOT NULL DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        title text NOT NULL,
        type text NOT NULL CHECK (type IN ('strength', 'cardio', 'flexibility', 'sports')),
        duration_minutes int NOT NULL,
        exercises jsonb NOT NULL DEFAULT '[]',
        notes text,
        completed boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS food_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        name text NOT NULL,
        calories numeric NOT NULL,
        protein numeric NOT NULL,
        carbs numeric NOT NULL,
        fats numeric NOT NULL,
        portion_amount numeric,
        portion_unit text,
        serving_type text,
        start_time text,
        end_time text,
        meal_type text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_check_ins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        sleep_hours numeric,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS goals (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        type text NOT NULL,
        target numeric NOT NULL,
        period text NOT NULL,
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS foods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        common_name text,
        calories numeric NOT NULL,
        protein numeric NOT NULL,
        carbs numeric NOT NULL,
        fat numeric NOT NULL,
        is_liquid boolean DEFAULT false,
        serving_sizes_ml jsonb,
        preparation text DEFAULT 'cooked',
        barcode text,
        source text DEFAULT 'usda',
        off_id text,
        name_he text,
        image_url text,
        default_unit text,
        unit_weight_grams numeric,
        search_aliases text[],
        name_tsv tsvector,
        verified boolean NOT NULL DEFAULT false,
        verified_at timestamptz,
        verified_by uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now()
      );
    `);
    // Added by migration 1775100000000 for admin review of Gemini-created foods.
    await client.query(`
      ALTER TABLE foods
        ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS verified_at timestamptz,
        ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id) ON DELETE SET NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        endpoint text NOT NULL UNIQUE,
        keys_p256dh text NOT NULL,
        keys_auth text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS app_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        level text NOT NULL CHECK (level IN ('action', 'error')),
        message text NOT NULL,
        details jsonb,
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE SET NULL,
        event_type text NOT NULL,
        event_id text NOT NULL UNIQUE,
        summary text NOT NULL,
        payload jsonb,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_daily_stats (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        total_calories numeric DEFAULT 0,
        workout_count int DEFAULT 0,
        sleep_hours numeric,
        updated_at timestamptz DEFAULT now(),
        UNIQUE (user_id, date)
      );
    `);

    // Legacy. The trainer role was retired in migration 1776300000000 and no code reads
    // these two tables any more; they are still created so existing databases and this
    // bootstrap path stay in step. Safe to drop once the owner confirms the rosters and
    // invitations in them are no longer wanted.
    await client.query(`
      CREATE TABLE IF NOT EXISTS trainer_clients (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        client_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status text NOT NULL CHECK (status IN ('pending', 'active', 'removed')) DEFAULT 'pending',
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (trainer_id, client_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS trainer_invitations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        trainer_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email text,
        invite_code text UNIQUE,
        status text NOT NULL CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
        expires_at timestamptz NOT NULL,
        created_at timestamptz DEFAULT now()
      )
    `);

    // Health tracking tables
    await client.query(`
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
        macro_carbs numeric,
        macro_fat numeric,
        macro_protein numeric,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    await client.query(`
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

    // Activity streaks (migration 1775000000000).
    await client.query(`
      CREATE TABLE IF NOT EXISTS streaks (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type text NOT NULL CHECK (type IN ('workout', 'food', 'water', 'weight', 'login')),
        current_count int NOT NULL DEFAULT 0,
        best_count int NOT NULL DEFAULT 0,
        last_date date,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (user_id, type)
      );
    `);

    // Exercise catalog. The columns below `video_url` arrived with the free-exercise-db
    // import (migration 1776100000000) and every one of them is in the model's SELECT
    // list, so a table missing them makes GET /api/exercises fail outright rather than
    // degrade -- which the picker can only report as "no exercises found".
    await client.query(`
      CREATE TABLE IF NOT EXISTS exercises (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL UNIQUE,
        muscle_group text,
        category text,
        image_url text,
        video_url text,
        equipment text,
        discipline text,
        level text,
        mechanic text,
        force text,
        primary_muscles text[],
        secondary_muscles text[],
        instructions text[],
        image_url_2 text,
        created_by uuid REFERENCES users(id) ON DELETE SET NULL,
        is_custom boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);
    // CREATE TABLE IF NOT EXISTS is a no-op on a database that predates those columns,
    // so add them explicitly too -- same approach as user_embeddings below.
    await client.query(`
      ALTER TABLE exercises
        ADD COLUMN IF NOT EXISTS equipment text,
        ADD COLUMN IF NOT EXISTS discipline text,
        ADD COLUMN IF NOT EXISTS level text,
        ADD COLUMN IF NOT EXISTS mechanic text,
        ADD COLUMN IF NOT EXISTS force text,
        ADD COLUMN IF NOT EXISTS primary_muscles text[],
        ADD COLUMN IF NOT EXISTS secondary_muscles text[],
        ADD COLUMN IF NOT EXISTS instructions text[],
        ADD COLUMN IF NOT EXISTS image_url_2 text,
        ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;
    `);

    // AI chat messages
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL,
        content text NOT NULL,
        created_at timestamptz DEFAULT now()
      );
    `);

    // AI insights cache
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_insights (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        summary text NOT NULL DEFAULT '',
        highlights jsonb NOT NULL DEFAULT '[]',
        suggestions jsonb NOT NULL DEFAULT '[]',
        score int NOT NULL DEFAULT 0,
        today_workout text DEFAULT '',
        today_sleep text DEFAULT '',
        today_nutrition text DEFAULT '',
        today_focus text DEFAULT '',
        period_days int NOT NULL DEFAULT 30,
        created_at timestamptz DEFAULT now()
      );
    `);

    // Rolling summary that replaces compacted chat turns (services/compaction.ts)
    await client.query(`
      CREATE TABLE IF NOT EXISTS chat_summaries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        covers_from timestamptz,
        covers_to timestamptz,
        message_count int NOT NULL DEFAULT 0,
        summary text NOT NULL,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now(),
        UNIQUE (user_id)
      );
    `);

    // Measured per-user footprint driving age/size compaction
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_storage_stats (
        user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        total_bytes bigint NOT NULL DEFAULT 0,
        embedding_bytes bigint NOT NULL DEFAULT 0,
        chat_bytes bigint NOT NULL DEFAULT 0,
        activity_bytes bigint NOT NULL DEFAULT 0,
        insight_bytes bigint NOT NULL DEFAULT 0,
        embedding_rows int NOT NULL DEFAULT 0,
        measured_at timestamptz DEFAULT now(),
        last_compacted_at timestamptz,
        last_cutoff date
      );
    `);

    // Reconcile the users(id) foreign keys with
    // `migrations/1776000000000_cascade-user-delete-fks.js`.
    //
    // The CREATE TABLE statements above now declare the right ON DELETE action, but
    // CREATE TABLE IF NOT EXISTS is a no-op on a database that already has the table, so on
    // every dev machine bootstrapped before this change the old actionless FKs are still
    // there. Production never runs initSchema at all (`config.skipSchemaInit` is forced true
    // when isProduction), so without this block deleting a user behaves differently in a dev
    // database than in the one the code actually ships against -- and account-deletion tests
    // written against dev would prove nothing about production.
    //
    // Same introspect-drop-recreate shape as the migration: the existing constraint's name
    // varies between baseline tables and ALTER-added columns, so it has to be looked up.
    //
    // Each statement runs inside its own savepoint. `to_regclass` guards a missing *table*
    // but nothing guards a missing *column*, and `exercises.created_by` is declared only in
    // its CREATE TABLE -- never in an `ADD COLUMN IF NOT EXISTS` block -- so a database
    // whose `exercises` predates that column answers the ADD CONSTRAINT with 42703. A raw
    // failure there poisons the transaction and turns the COMMIT below into a rollback that
    // discards every table this run created, which is exactly what the pgvector savepoint
    // further down exists to prevent.
    for (const [table, column, action] of USER_FK_ACTIONS) {
      await client.query(`SAVEPOINT user_fk_${table}_${column}`);
      try {
        await client.query(`
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
        await client.query(`RELEASE SAVEPOINT user_fk_${table}_${column}`);
      } catch (e) {
        await client.query(`ROLLBACK TO SAVEPOINT user_fk_${table}_${column}`);
        logger.warn(
          { err: e, table, column },
          'Could not reconcile a users(id) foreign key -- deletion may behave differently here than in production',
        );
      }
    }

    // Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_daily_check_ins_user_date ON daily_check_ins(user_id, date DESC)');
    await client.query("CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone_number) WHERE phone_number IS NOT NULL");
    await client.query('CREATE INDEX IF NOT EXISTS idx_foods_name_lower ON foods (lower(name))');
    await client.query('CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods (barcode) WHERE barcode IS NOT NULL');
    // pg_trgm and full-text search indexes (created by migration 1772900000000, safe to repeat)
    await client.query('CREATE EXTENSION IF NOT EXISTS pg_trgm');
    await client.query('CREATE INDEX IF NOT EXISTS idx_foods_name_trgm ON foods USING GIN (lower(name) gin_trgm_ops)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_foods_name_tsv ON foods USING GIN (name_tsv)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_foods_common_name_lower ON foods (lower(common_name))');
    await client.query('CREATE INDEX IF NOT EXISTS idx_app_logs_level_created_at ON app_logs (level, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date ON user_daily_stats (user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_trainer_clients_trainer ON trainer_clients(trainer_id, status)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_trainer_clients_client ON trainer_clients(client_id, status)');
    await client.query("CREATE INDEX IF NOT EXISTS idx_trainer_invitations_code ON trainer_invitations(invite_code) WHERE status = 'pending'");
    await client.query("CREATE INDEX IF NOT EXISTS idx_trainer_invitations_email ON trainer_invitations(email, status)");
    // Health tracking indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_energy_checkins_user_date ON energy_checkins(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_weight_entries_user_date ON weight_entries(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_water_entries_user_date ON water_entries(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_cycle_entries_user_date ON cycle_entries(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_streaks_user ON streaks(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_foods_source_verified ON foods (source, verified)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises (lower(name))');
    await client.query('CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises (muscle_group)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON exercises (equipment)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_exercises_discipline ON exercises (discipline)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created ON chat_messages(user_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_insights_user_created ON ai_insights(user_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_activity_log_user_created ON user_activity_log(user_id, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_activity_log_event_type_created ON user_activity_log(event_type, created_at DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_user_storage_stats_measured ON user_storage_stats (measured_at NULLS FIRST)');

    // pgvector (optional, non-fatal). A failed statement aborts the whole surrounding
    // transaction, so this runs inside a savepoint: without one, a database without the
    // extension turns the COMMIT below into a rollback and initSchema reports success
    // having created no tables at all.
    await client.query('SAVEPOINT pgvector');
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS vector');
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_embeddings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          record_type text NOT NULL,
          record_id text NOT NULL,
          content_text text NOT NULL,
          embedding vector(768),
          bucket_start date,
          source_count int,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE (record_id, record_type)
        );
      `);
      // Rollup columns for pre-existing tables created before compaction landed
      await client.query('ALTER TABLE user_embeddings ADD COLUMN IF NOT EXISTS bucket_start date');
      await client.query('ALTER TABLE user_embeddings ADD COLUMN IF NOT EXISTS source_count int');
      await client.query('CREATE INDEX IF NOT EXISTS idx_user_embeddings_user_type ON user_embeddings (user_id, record_type)');
      // Needed to find compactable rows cheaply
      await client.query('CREATE INDEX IF NOT EXISTS idx_user_embeddings_user_created ON user_embeddings (user_id, created_at)');
      // Without this, semanticSearch degrades to a sequential scan
      await client.query('CREATE INDEX IF NOT EXISTS idx_user_embeddings_hnsw ON user_embeddings USING hnsw (embedding vector_cosine_ops)');
      await client.query('RELEASE SAVEPOINT pgvector');
    } catch {
      await client.query('ROLLBACK TO SAVEPOINT pgvector');
      logger.warn('pgvector not available -- skipping user_embeddings table');
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
