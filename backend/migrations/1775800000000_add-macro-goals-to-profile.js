export const up = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_profiles
      ADD COLUMN IF NOT EXISTS macro_carbs   numeric,
      ADD COLUMN IF NOT EXISTS macro_fat     numeric,
      ADD COLUMN IF NOT EXISTS macro_protein numeric
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    ALTER TABLE user_profiles
      DROP COLUMN IF EXISTS macro_carbs,
      DROP COLUMN IF EXISTS macro_fat,
      DROP COLUMN IF EXISTS macro_protein
  `);
};
