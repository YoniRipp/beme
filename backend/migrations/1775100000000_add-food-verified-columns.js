/**
 * Adds verified tracking columns to foods table for admin review of Gemini-created foods.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE foods ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false;
    ALTER TABLE foods ADD COLUMN IF NOT EXISTS verified_at timestamptz;
    ALTER TABLE foods ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES users(id);
    CREATE INDEX IF NOT EXISTS idx_foods_source_verified ON foods (source, verified);
    -- Mark all existing USDA/OFF foods as pre-verified
    UPDATE foods SET verified = true WHERE source IN ('usda', 'off');
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_foods_source_verified;
    ALTER TABLE foods DROP COLUMN IF EXISTS verified_by;
    ALTER TABLE foods DROP COLUMN IF EXISTS verified_at;
    ALTER TABLE foods DROP COLUMN IF EXISTS verified;
  `);
};
