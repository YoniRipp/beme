export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS exercise_images (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      image_url text NOT NULL,
      uploaded_by uuid REFERENCES users(id),
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_exercise_images_name ON exercise_images (lower(name));
  `);
};

export const down = (pgm) => {
  pgm.sql(`DROP TABLE IF EXISTS exercise_images;`);
};
