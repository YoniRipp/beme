export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE IF NOT EXISTS exercises (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      muscle_group text,
      category text,
      image_url text,
      video_url text,
      created_by uuid REFERENCES users(id),
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_exercises_name ON exercises (lower(name));
    CREATE INDEX IF NOT EXISTS idx_exercises_muscle_group ON exercises (muscle_group);

    -- Migrate existing data from exercise_images
    INSERT INTO exercises (name, image_url, created_by, created_at)
    SELECT name, image_url, uploaded_by, created_at FROM exercise_images
    ON CONFLICT (name) DO UPDATE SET image_url = EXCLUDED.image_url;

    -- Drop old table
    DROP TABLE IF EXISTS exercise_images;

    -- Seed common exercises
    INSERT INTO exercises (name, muscle_group, category) VALUES
      ('Bench Press', 'chest', 'barbell'),
      ('Incline Bench Press', 'chest', 'barbell'),
      ('Incline Dumbbell Press', 'chest', 'dumbbell'),
      ('Cable Fly', 'chest', 'cable'),
      ('Dip', 'chest', 'bodyweight'),
      ('Push-up', 'chest', 'bodyweight'),
      ('Squat', 'legs', 'barbell'),
      ('Leg Press', 'legs', 'machine'),
      ('Leg Curl', 'legs', 'machine'),
      ('Leg Extension', 'legs', 'machine'),
      ('Romanian Deadlift', 'legs', 'barbell'),
      ('Calf Raise', 'legs', 'machine'),
      ('Lunge', 'legs', 'dumbbell'),
      ('Deadlift', 'back', 'barbell'),
      ('Barbell Row', 'back', 'barbell'),
      ('Pull-up', 'back', 'bodyweight'),
      ('Lat Pulldown', 'back', 'cable'),
      ('Seated Cable Row', 'back', 'cable'),
      ('Overhead Press', 'shoulders', 'barbell'),
      ('Lateral Raise', 'shoulders', 'dumbbell'),
      ('Face Pull', 'shoulders', 'cable'),
      ('Rear Delt Fly', 'shoulders', 'dumbbell'),
      ('Bicep Curl', 'arms', 'dumbbell'),
      ('Hammer Curl', 'arms', 'dumbbell'),
      ('Tricep Extension', 'arms', 'cable'),
      ('Skull Crusher', 'arms', 'barbell'),
      ('Plank', 'core', 'bodyweight'),
      ('Russian Twist', 'core', 'bodyweight'),
      ('Hanging Leg Raise', 'core', 'bodyweight')
    ON CONFLICT (name) DO UPDATE SET
      muscle_group = COALESCE(EXCLUDED.muscle_group, exercises.muscle_group),
      category = COALESCE(EXCLUDED.category, exercises.category);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    -- Recreate exercise_images from exercises data
    CREATE TABLE IF NOT EXISTS exercise_images (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name text NOT NULL UNIQUE,
      image_url text NOT NULL,
      uploaded_by uuid REFERENCES users(id),
      created_at timestamptz DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS idx_exercise_images_name ON exercise_images (lower(name));

    INSERT INTO exercise_images (name, image_url, uploaded_by, created_at)
    SELECT name, image_url, created_by, created_at FROM exercises
    WHERE image_url IS NOT NULL;

    DROP TABLE IF EXISTS exercises;
  `);
};
