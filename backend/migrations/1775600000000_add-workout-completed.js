export const up = (pgm) => {
  pgm.sql("ALTER TABLE workouts ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false");
  pgm.sql("UPDATE workouts SET completed = true");
};

export const down = (pgm) => {
  pgm.sql("ALTER TABLE workouts DROP COLUMN IF EXISTS completed");
};
