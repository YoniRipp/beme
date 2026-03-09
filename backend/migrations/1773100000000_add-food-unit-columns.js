/**
 * Add missing food columns: default_unit, unit_weight_grams, search_aliases.
 * These columns are referenced by the food search model but were never migrated.
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS default_unit text;`);
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS unit_weight_grams numeric;`);
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS search_aliases text[];`);
};

export const down = (pgm) => {
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS search_aliases;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS unit_weight_grams;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS default_unit;`);
};
