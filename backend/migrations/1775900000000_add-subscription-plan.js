export const up = (pgm) => {
  pgm.sql("ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan text");
};

export const down = (pgm) => {
  pgm.sql("ALTER TABLE users DROP COLUMN IF EXISTS subscription_plan");
};
