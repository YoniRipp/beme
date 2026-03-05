/**
 * Add Open Food Facts columns to foods table: barcode, source, off_id, name_he, image_url.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS barcode text;`);
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS source text DEFAULT 'usda';`);
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS off_id text;`);
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS name_he text;`);
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS image_url text;`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_foods_barcode ON foods (barcode) WHERE barcode IS NOT NULL;`);
  pgm.sql(`CREATE UNIQUE INDEX IF NOT EXISTS idx_foods_off_id ON foods (off_id) WHERE off_id IS NOT NULL;`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_foods_off_id;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_foods_barcode;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS image_url;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS name_he;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS off_id;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS source;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS barcode;`);
};
