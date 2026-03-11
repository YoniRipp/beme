export const shorthands = undefined;

export const up = (pgm) => {
  pgm.sql(`
    INSERT INTO exercises (name, muscle_group, category) VALUES
      -- Chest (9)
      ('Decline Bench Press', 'chest', 'barbell'),
      ('Chest Press Machine', 'chest', 'machine'),
      ('Pec Deck', 'chest', 'machine'),
      ('Dumbbell Bench Press', 'chest', 'dumbbell'),
      ('Dumbbell Fly', 'chest', 'dumbbell'),
      ('Decline Dumbbell Press', 'chest', 'dumbbell'),
      ('Machine Fly', 'chest', 'machine'),
      ('Landmine Press', 'chest', 'barbell'),
      ('Chest Dip', 'chest', 'bodyweight'),

      -- Back (12)
      ('T-Bar Row', 'back', 'barbell'),
      ('Single-Arm Dumbbell Row', 'back', 'dumbbell'),
      ('Rack Pull', 'back', 'barbell'),
      ('Pendlay Row', 'back', 'barbell'),
      ('Cable Pullover', 'back', 'cable'),
      ('Chin-up', 'back', 'bodyweight'),
      ('Inverted Row', 'back', 'bodyweight'),
      ('Meadows Row', 'back', 'barbell'),
      ('Straight-Arm Pulldown', 'back', 'cable'),
      ('Dumbbell Pullover', 'back', 'dumbbell'),
      ('Machine Row', 'back', 'machine'),
      ('Hyperextension', 'back', 'bodyweight'),

      -- Legs (18)
      ('Bulgarian Split Squat', 'legs', 'dumbbell'),
      ('Hack Squat', 'legs', 'machine'),
      ('Hip Thrust', 'legs', 'barbell'),
      ('Goblet Squat', 'legs', 'dumbbell'),
      ('Front Squat', 'legs', 'barbell'),
      ('Sumo Deadlift', 'legs', 'barbell'),
      ('Walking Lunge', 'legs', 'dumbbell'),
      ('Step Up', 'legs', 'dumbbell'),
      ('Glute Bridge', 'legs', 'bodyweight'),
      ('Good Morning', 'legs', 'barbell'),
      ('Seated Calf Raise', 'legs', 'machine'),
      ('Standing Calf Raise', 'legs', 'machine'),
      ('Smith Machine Squat', 'legs', 'machine'),
      ('Belt Squat', 'legs', 'machine'),
      ('Nordic Hamstring Curl', 'legs', 'bodyweight'),
      ('Sissy Squat', 'legs', 'bodyweight'),
      ('Hip Adduction', 'legs', 'machine'),
      ('Hip Abduction', 'legs', 'machine'),

      -- Shoulders (10)
      ('Arnold Press', 'shoulders', 'dumbbell'),
      ('Front Raise', 'shoulders', 'dumbbell'),
      ('Shrugs', 'shoulders', 'dumbbell'),
      ('Upright Row', 'shoulders', 'barbell'),
      ('Dumbbell Shoulder Press', 'shoulders', 'dumbbell'),
      ('Machine Shoulder Press', 'shoulders', 'machine'),
      ('Cable Lateral Raise', 'shoulders', 'cable'),
      ('Reverse Pec Deck', 'shoulders', 'machine'),
      ('Behind-the-Neck Press', 'shoulders', 'barbell'),
      ('Lu Raise', 'shoulders', 'dumbbell'),

      -- Arms (16)
      ('Preacher Curl', 'arms', 'barbell'),
      ('Concentration Curl', 'arms', 'dumbbell'),
      ('Cable Curl', 'arms', 'cable'),
      ('Overhead Tricep Extension', 'arms', 'dumbbell'),
      ('Close-Grip Bench Press', 'arms', 'barbell'),
      ('Tricep Kickback', 'arms', 'dumbbell'),
      ('Rope Pushdown', 'arms', 'cable'),
      ('Barbell Curl', 'arms', 'barbell'),
      ('EZ-Bar Curl', 'arms', 'barbell'),
      ('Incline Dumbbell Curl', 'arms', 'dumbbell'),
      ('Reverse Curl', 'arms', 'barbell'),
      ('Wrist Curl', 'arms', 'dumbbell'),
      ('Diamond Push-up', 'arms', 'bodyweight'),
      ('Cable Overhead Tricep Extension', 'arms', 'cable'),
      ('Dip Machine', 'arms', 'machine'),
      ('Spider Curl', 'arms', 'dumbbell'),

      -- Core (12)
      ('Cable Crunch', 'core', 'cable'),
      ('Ab Wheel Rollout', 'core', 'bodyweight'),
      ('Dead Bug', 'core', 'bodyweight'),
      ('Mountain Climber', 'core', 'bodyweight'),
      ('Bicycle Crunch', 'core', 'bodyweight'),
      ('Sit-up', 'core', 'bodyweight'),
      ('V-Up', 'core', 'bodyweight'),
      ('Pallof Press', 'core', 'cable'),
      ('Side Plank', 'core', 'bodyweight'),
      ('Decline Sit-up', 'core', 'bodyweight'),
      ('Woodchop', 'core', 'cable'),
      ('Toe Touch', 'core', 'bodyweight'),

      -- Full Body / Cardio (11)
      ('Running', 'full_body', 'cardio'),
      ('Cycling', 'full_body', 'cardio'),
      ('Rowing Machine', 'full_body', 'cardio'),
      ('Jump Rope', 'full_body', 'cardio'),
      ('Burpee', 'full_body', 'bodyweight'),
      ('Kettlebell Swing', 'full_body', 'dumbbell'),
      ('Clean and Press', 'full_body', 'barbell'),
      ('Power Clean', 'full_body', 'barbell'),
      ('Box Jump', 'full_body', 'bodyweight'),
      ('Battle Ropes', 'full_body', 'bodyweight'),
      ('Farmer Walk', 'full_body', 'dumbbell')
    ON CONFLICT (name) DO NOTHING;
  `);
};

export const down = (pgm) => {
  // Intentionally empty - removing seeded exercises could break user workout data
};
