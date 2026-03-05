/**
 * Enable pg_trgm for fuzzy search and add full-text search support on foods table.
 * - pg_trgm: trigram similarity for fuzzy autocomplete dropdown
 * - tsvector: full-text search for word-based matching
 * - Combined scoring ranks "Pasta, cooked" above "Antipasto" when searching "pasta"
 */
export const shorthands = undefined;

export const up = (pgm) => {
  // Enable trigram extension (available on Supabase, RDS, etc.)
  pgm.sql(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);

  // GIN trigram index for fast similarity lookups
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_foods_name_trgm ON foods USING GIN (lower(name) gin_trgm_ops);`);

  // Add tsvector column for full-text search
  pgm.sql(`ALTER TABLE foods ADD COLUMN IF NOT EXISTS name_tsv tsvector;`);

  // Populate tsvector from existing names
  pgm.sql(`UPDATE foods SET name_tsv = to_tsvector('english', name) WHERE name_tsv IS NULL;`);

  // GIN index on tsvector column
  pgm.sql(`CREATE INDEX IF NOT EXISTS idx_foods_name_tsv ON foods USING GIN (name_tsv);`);

  // Trigger to auto-update tsvector on insert/update
  pgm.sql(`
    CREATE OR REPLACE FUNCTION foods_name_tsv_trigger() RETURNS trigger AS $$
    BEGIN
      NEW.name_tsv := to_tsvector('english', NEW.name);
      RETURN NEW;
    END
    $$ LANGUAGE plpgsql;
  `);
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_foods_name_tsv ON foods;
    CREATE TRIGGER trg_foods_name_tsv
      BEFORE INSERT OR UPDATE OF name ON foods
      FOR EACH ROW EXECUTE FUNCTION foods_name_tsv_trigger();
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TRIGGER IF EXISTS trg_foods_name_tsv ON foods;`);
  pgm.sql(`DROP FUNCTION IF EXISTS foods_name_tsv_trigger();`);
  pgm.sql(`DROP INDEX IF EXISTS idx_foods_name_tsv;`);
  pgm.sql(`ALTER TABLE foods DROP COLUMN IF EXISTS name_tsv;`);
  pgm.sql(`DROP INDEX IF EXISTS idx_foods_name_trgm;`);
  // Don't drop pg_trgm extension as other things might use it
};
