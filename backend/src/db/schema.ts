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
        role text NOT NULL CHECK (role IN ('admin', 'user', 'trainer')) DEFAULT 'user',
        auth_provider text NOT NULL DEFAULT 'email',
        provider_id text,
        reset_token_hash text,
        reset_token_expires timestamptz,
        lemon_squeezy_customer_id text,
        subscription_status text DEFAULT 'free',
        subscription_id text,
        subscription_current_period_end timestamptz,
        locked_until timestamptz,
        failed_login_attempts int DEFAULT 0,
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS workouts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
        date date NOT NULL,
        title text NOT NULL,
        type text NOT NULL CHECK (type IN ('strength', 'cardio', 'flexibility', 'sports')),
        duration_minutes int NOT NULL,
        exercises jsonb NOT NULL DEFAULT '[]',
        notes text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS food_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
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
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS daily_check_ins (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id),
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
        user_id uuid REFERENCES users(id),
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
        created_at timestamptz DEFAULT now()
      );
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
        user_id uuid REFERENCES users(id),
        created_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_activity_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id text,
        metadata jsonb,
        source text DEFAULT 'api',
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
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        date_of_birth date,
        sex text,
        height_cm double precision,
        current_weight double precision,
        target_weight double precision,
        activity_level text,
        water_goal_glasses int NOT NULL DEFAULT 8,
        cycle_tracking_enabled boolean NOT NULL DEFAULT false,
        average_cycle_length int DEFAULT 28,
        setup_completed boolean NOT NULL DEFAULT false,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS weight_entries (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        weight double precision NOT NULL,
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
        ml_total int NOT NULL DEFAULT 0,
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

    // Indexes
    await client.query('CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_workouts_user_date ON workouts(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_food_entries_user_date ON food_entries(user_id, date DESC)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_daily_check_ins_user_date ON daily_check_ins(user_id, date DESC)');
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

    // pgvector (optional, non-fatal)
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
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now(),
          UNIQUE (record_id, record_type)
        );
      `);
      await client.query('CREATE INDEX IF NOT EXISTS idx_user_embeddings_user_type ON user_embeddings (user_id, record_type)');
    } catch {
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
