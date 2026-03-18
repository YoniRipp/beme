/**
 * Update exercise images with proper exercise-specific illustrations from Wger.de.
 * Wger is an open-source fitness tracker (wger.de) with exercise images under CC-BY-SA 4.0.
 * Images are mapped per exercise rather than per muscle group for accuracy.
 * Also adds 'cardio' muscle group fallback (was missing from previous seed).
 */
export const shorthands = undefined;

const wger = (path) => `https://wger.de${path}`;

export const up = (pgm) => {
  // ── Exercise-specific images from Wger.de (CC-BY-SA 4.0) ──────────────────
  const exerciseImages = [
    // ── Chest ──────────────────────────────────────────────────────────────
    ['Bench Press',              wger('/media/exercise-images/192/Bench-press-1.png')],
    ['Incline Bench Press',      wger('/media/exercise-images/41/Incline-bench-press-1.png')],
    ['Decline Bench Press',      wger('/media/exercise-images/100/Decline-bench-press-1.png')],
    ['Dumbbell Bench Press',     wger('/media/exercise-images/97/Dumbbell-bench-press-1.png')],
    ['Incline Dumbbell Press',   wger('/media/exercise-images/41/Incline-bench-press-1.png')],
    ['Pec Deck',                 wger('/media/exercise-images/98/Butterfly-machine-2.png')],
    ['Machine Fly',              wger('/media/exercise-images/98/Butterfly-machine-2.png')],
    ['Cable Fly',                wger('/media/exercise-images/122/Incline-cable-flyes-1.png')],
    ['Push-up',                  wger('/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png')],
    ['Dip',                      wger('/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png')],
    ['Chest Dip',                wger('/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png')],
    ['Close-Grip Bench Press',   wger('/media/exercise-images/61/Close-grip-bench-press-1.png')],
    ['Dumbbell Fly',             wger('/media/exercise-images/122/Incline-cable-flyes-1.png')],

    // ── Back ───────────────────────────────────────────────────────────────
    ['Deadlift',                 wger('/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg')],
    ['Rack Pull',                wger('/media/exercise-images/161/Dead-lifts-2.png')],
    ['Barbell Row',              wger('/media/exercise-images/109/Barbell-rear-delt-row-1.png')],
    ['Bent-over Row',            wger('/media/exercise-images/109/Barbell-rear-delt-row-1.png')],
    ['T-Bar Row',                wger('/media/exercise-images/106/T-bar-row-1.png')],
    ['Pendlay Row',              wger('/media/exercise-images/109/Barbell-rear-delt-row-1.png')],
    ['Pull-up',                  wger('/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg')],
    ['Chin-up',                  wger('/media/exercise-images/181/Chin-ups-2.png')],
    ['Lat Pulldown',             wger('/media/exercise-images/158/02e8a7c3-dc67-434e-a4bc-77fdecf84b49.webp')],
    ['Seated Cable Row',         wger('/media/exercise-images/143/Cable-seated-rows-2.png')],
    ['Single-Arm Dumbbell Row',  wger('/media/exercise-images/109/Barbell-rear-delt-row-1.png')],
    ['Hyperextension',           wger('/media/exercise-images/128/Hyperextensions-1.png')],
    ['Cable Pullover',           wger('/media/exercise-images/122/Incline-cable-flyes-1.png')],
    ['Straight-Arm Pulldown',    wger('/media/exercise-images/122/Incline-cable-flyes-1.png')],
    ['Inverted Row',             wger('/media/exercise-images/109/Barbell-rear-delt-row-1.png')],
    ['Machine Row',              wger('/media/exercise-images/143/Cable-seated-rows-2.png')],

    // ── Legs ───────────────────────────────────────────────────────────────
    ['Squat',                    wger('/media/exercise-images/1805/f166c599-4c03-42a0-9250-47f82a1f096d.jpg')],
    ['Front Squat',              wger('/media/exercise-images/191/Front-squat-1-857x1024.png')],
    ['Hack Squat',               wger('/media/exercise-images/130/Narrow-stance-hack-squats-1-1024x721.png')],
    ['Goblet Squat',             wger('/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg')],
    ['Bulgarian Split Squat',    wger('/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png')],
    ['Romanian Deadlift',        wger('/media/exercise-images/1750/c5ff74e1-b494-4df0-a13f-89c630b88ef9.webp')],
    ['Sumo Deadlift',            wger('/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg')],
    ['Leg Press',                wger('/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp')],
    ['Leg Curl',                 wger('/media/exercise-images/154/lying-leg-curl-machine-large-1.png')],
    ['Lunge',                    wger('/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png')],
    ['Walking Lunge',            wger('/media/exercise-images/113/Walking-lunges-1.png')],
    ['Good Morning',             wger('/media/exercise-images/116/Good-mornings-2.png')],
    ['Calf Raise',               wger('/media/exercise-images/1243/53d4fabe-c994-4907-873f-8d82813a9832.png')],
    ['Seated Calf Raise',        wger('/media/exercise-images/1243/53d4fabe-c994-4907-873f-8d82813a9832.png')],
    ['Standing Calf Raise',      wger('/media/exercise-images/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg')],
    ['Hip Thrust',               wger('/media/exercise-images/1805/f166c599-4c03-42a0-9250-47f82a1f096d.jpg')],
    ['Glute Bridge',             wger('/media/exercise-images/1805/f166c599-4c03-42a0-9250-47f82a1f096d.jpg')],

    // ── Shoulders ──────────────────────────────────────────────────────────
    ['Overhead Press',           wger('/media/exercise-images/1893/7dbad19e-0616-41fd-9d7d-3e21649c0eea.png')],
    ['Dumbbell Shoulder Press',  wger('/media/exercise-images/123/dumbbell-shoulder-press-large-1.png')],
    ['Arnold Press',             wger('/media/exercise-images/123/dumbbell-shoulder-press-large-1.png')],
    ['Machine Shoulder Press',   wger('/media/exercise-images/53/Shoulder-press-machine-2.png')],
    ['Lateral Raise',            wger('/media/exercise-images/148/lateral-dumbbell-raises-large-2.png')],
    ['Cable Lateral Raise',      wger('/media/exercise-images/148/lateral-dumbbell-raises-large-2.png')],
    ['Shrugs',                   wger('/media/exercise-images/150/Barbell-shrugs-1.png')],
    ['Upright Row',              wger('/media/exercise-images/109/Barbell-rear-delt-row-1.png')],
    ['Reverse Pec Deck',         wger('/media/exercise-images/98/Butterfly-machine-2.png')],

    // ── Arms ───────────────────────────────────────────────────────────────
    ['Bicep Curl',               wger('/media/exercise-images/81/Biceps-curl-1.png')],
    ['Barbell Curl',             wger('/media/exercise-images/129/Standing-biceps-curl-1.png')],
    ['Hammer Curl',              wger('/media/exercise-images/86/Bicep-hammer-curl-1.png')],
    ['Preacher Curl',            wger('/media/exercise-images/193/Preacher-curl-3-1.png')],
    ['Cable Curl',               wger('/media/exercise-images/81/Biceps-curl-1.png')],
    ['Concentration Curl',       wger('/media/exercise-images/1109/00b0a0bf-c14a-4f13-bb14-62c09030a1aa.png')],
    ['EZ-Bar Curl',              wger('/media/exercise-images/129/Standing-biceps-curl-1.png')],
    ['Incline Dumbbell Curl',    wger('/media/exercise-images/74/Bicep-curls-1.png')],
    ['Skull Crusher',            wger('/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png')],
    ['Tricep Extension',         wger('/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg')],
    ['Rope Pushdown',            wger('/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg')],
    ['Overhead Tricep Extension',wger('/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg')],
    ['Tricep Kickback',          wger('/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg')],
    ['Diamond Push-up',          wger('/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png')],

    // ── Core ───────────────────────────────────────────────────────────────
    ['Plank',                    wger('/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png')],
    ['Side Plank',               wger('/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png')],
    ['Russian Twist',            wger('/media/exercise-images/1193/70ca5d80-3847-4a8c-8882-c6e9e485e29e.png')],
    ['Hanging Leg Raise',        wger('/media/exercise-images/125/Leg-raises-2.png')],
    ['Crunches',                 wger('/media/exercise-images/91/Crunches-1.png')],
    ['Sit-up',                   wger('/media/exercise-images/91/Crunches-1.png')],
    ['Ab Wheel Rollout',         wger('/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png')],
    ['Pallof Press',             wger('/media/exercise-images/1194/074e1766-4208-4a67-a211-9721772d99b0.png')],
    ['Cable Crunch',             wger('/media/exercise-images/91/Crunches-1.png')],
    ['Bicycle Crunch',           wger('/media/exercise-images/1193/70ca5d80-3847-4a8c-8882-c6e9e485e29e.png')],
    ['V-Up',                     wger('/media/exercise-images/91/Crunches-1.png')],

    // ── Full Body / Cardio ─────────────────────────────────────────────────
    ['Burpee',                   wger('/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png')],
    ['Box Jump',                 wger('/media/exercise-images/1805/f166c599-4c03-42a0-9250-47f82a1f096d.jpg')],
    ['Kettlebell Swing',         wger('/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg')],
    ['Clean and Press',          wger('/media/exercise-images/1893/7dbad19e-0616-41fd-9d7d-3e21649c0eea.png')],
    ['Power Clean',              wger('/media/exercise-images/1893/7dbad19e-0616-41fd-9d7d-3e21649c0eea.png')],
  ];

  for (const [name, url] of exerciseImages) {
    pgm.sql(`UPDATE exercises SET image_url = '${url}' WHERE lower(name) = lower('${name.replace(/'/g, "''")}');`);
  }

  // ── Cardio muscle group fallback (was missing from original seed) ──────────
  // Uses a Pexels running/cardio image for exercises without a specific image
  const cardioFallback = 'https://images.pexels.com/photos/3812743/pexels-photo-3812743.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop';
  pgm.sql(`UPDATE exercises SET image_url = '${cardioFallback}' WHERE muscle_group = 'cardio' AND image_url IS NULL;`);

  // Also apply cardio fallback to full_body exercises that still lack an image
  const fullBodyFallback = 'https://images.pexels.com/photos/3888343/pexels-photo-3888343.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&fit=crop';
  pgm.sql(`UPDATE exercises SET image_url = '${fullBodyFallback}' WHERE muscle_group = 'full_body' AND image_url IS NULL;`);
};

export const down = (pgm) => {
  // Revert to muscle-group-only images (restore nulls for exercise-specific updates)
  // Note: we can't easily reverse specific URL updates without knowing previous values,
  // so we reset all Wger-specific images back to null, letting the muscle-group seed re-apply.
  pgm.sql(`
    UPDATE exercises SET image_url = NULL
    WHERE image_url LIKE 'https://wger.de/media/%';
  `);
  pgm.sql(`
    UPDATE exercises SET image_url = NULL
    WHERE muscle_group IN ('cardio', 'full_body')
      AND image_url LIKE '%pexels%3812743%';
  `);
};
