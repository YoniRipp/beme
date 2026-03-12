/**
 * Seed exercises with image_url (Pexels free photos) and video_url (Wikimedia Commons CC videos).
 * Images grouped by muscle_group; videos for the most common exercises.
 */
export const shorthands = undefined;

// Pexels CDN – free, no attribution required
const px = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop`;

// Wikimedia Commons exercise demonstration videos (CC BY 3.0)
const wm = (file) => {
  // MD5-based path: computed offline for each filename
  const map = {
    'Bench_press_-_exercise_demonstration_video.webm': 'd/df',
    'Bent-over_row_-_exercise_demonstration_video.webm': 'b/b2',
    'Deadlift_-_exercise_demonstration_video.webm': '6/62',
    'Hanging_crunches_-_exercise_demonstration_video.webm': '5/5e',
    'Pull-ups_-_exercise_demonstration_video.webm': '1/15',
    'Shoulder_press_-_exercise_demonstration_video.webm': '6/69',
    'Squat_-_exercise_demonstration_video.webm': '5/5c',
    'Incline_press_-_exercise_demonstration_video.webm': '8/80',
    'Leg_raises_-_exercise_demonstration_video.webm': 'b/bf',
  };
  return `https://upload.wikimedia.org/wikipedia/commons/${map[file]}/${file}`;
};

export const up = (pgm) => {
  // ── Images by muscle group (Pexels free photos) ──────────────────────
  const imagesByGroup = {
    chest:     px(3837743),   // man doing bench press in gym
    back:      px(1865131),   // man doing pull-ups
    legs:      px(4853693),   // woman doing barbell squat
    shoulders: px(7289370),   // man doing dumbbell shoulder press
    arms:      px(3837757),   // sportsman working out on bench with dumbbells
    core:      px(14074802),  // woman planking on yoga mat
    full_body: px(3888343),   // sportsman using treadmill
  };

  // Update all exercises by muscle group
  for (const [group, url] of Object.entries(imagesByGroup)) {
    pgm.sql(`UPDATE exercises SET image_url = '${url}' WHERE muscle_group = '${group}' AND image_url IS NULL;`);
  }

  // ── Videos for specific exercises (Wikimedia Commons CC BY 3.0) ──────
  const videos = [
    ['Bench Press',          wm('Bench_press_-_exercise_demonstration_video.webm')],
    ['Incline Bench Press',  wm('Incline_press_-_exercise_demonstration_video.webm')],
    ['Barbell Row',          wm('Bent-over_row_-_exercise_demonstration_video.webm')],
    ['Deadlift',             wm('Deadlift_-_exercise_demonstration_video.webm')],
    ['Squat',                wm('Squat_-_exercise_demonstration_video.webm')],
    ['Overhead Press',       wm('Shoulder_press_-_exercise_demonstration_video.webm')],
    ['Pull-up',              wm('Pull-ups_-_exercise_demonstration_video.webm')],
    ['Hanging Leg Raise',    wm('Leg_raises_-_exercise_demonstration_video.webm')],
    ['Hanging Crunches',     wm('Hanging_crunches_-_exercise_demonstration_video.webm')],
  ];

  for (const [name, url] of videos) {
    pgm.sql(`UPDATE exercises SET video_url = '${url}' WHERE lower(name) = lower('${name}') AND video_url IS NULL;`);
  }
};

export const down = (pgm) => {
  pgm.sql(`UPDATE exercises SET image_url = NULL, video_url = NULL;`);
};
