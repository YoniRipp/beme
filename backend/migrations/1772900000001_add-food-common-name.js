/**
 * Add common_name column to foods table for user-friendly display names.
 * Backfills from USDA descriptions using SQL string manipulation.
 *
 * Examples:
 *   "Chicken, broilers or fryers, breast, skinless, boneless, meat only, cooked, grilled"
 *    → "Chicken breast"
 *   "Rice, white, medium-grain, cooked" → "White rice"
 *   "Pasta, dry, enriched" → "Pasta"
 *
 * The backfill is approximate — the TypeScript extractCommonName() function
 * is more sophisticated. Re-running the import script will set precise values.
 */
export const shorthands = undefined;

export const up = (pgm) => {
  // Add column
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS common_name text;`);

  // Backfill: for USDA-sourced foods, extract a simple common name.
  // Strategy: take the first comma-segment (main ingredient) as the common name.
  // This is a basic approximation; the import script sets proper values.
  pgm.sql(`
    UPDATE foods
    SET common_name = INITCAP(TRIM(SPLIT_PART(name, ',', 1)))
    WHERE source = 'usda' AND common_name IS NULL;
  `);

  // For OFF/Gemini foods, common_name = name (already clean)
  pgm.sql(`
    UPDATE foods
    SET common_name = name
    WHERE source != 'usda' AND common_name IS NULL;
  `);

  // Index for search
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_foods_common_name_lower ON foods (lower(common_name));`);
};

export const down = (pgm) => {
  pgm.sql(`DROP INDEX IF EXISTS idx_foods_common_name_lower;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS common_name;`);
};
