/**
 * Add pg_trgm GIN index on foods.name for fast substring search.
 * The existing LIKE '%query%' queries will automatically use this index
 * instead of doing a sequential scan.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_foods_name_trgm ON foods USING gin (lower(name) gin_trgm_ops);`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_foods_name_trgm;`);
};
