/**
 * Adds meal_type column to food_entries for explicit meal categorization.
 *
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE food_entries ADD COLUMN IF NOT EXISTS meal_type text;
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE food_entries DROP COLUMN IF EXISTS meal_type;
  `);
};
