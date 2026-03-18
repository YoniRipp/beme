/**
 * Replace all exercise images with photos from free-exercise-db (yuhonas/free-exercise-db).
 * Open-source exercise database with 800+ exercises, images hosted on GitHub raw CDN.
 * License: https://github.com/yuhonas/free-exercise-db (open source, free to use)
 *
 * Exercises without a match in free-exercise-db keep their existing Pexels images.
 */
export const shorthands = undefined;

const gh = (path) =>
  `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${path}`;

export const up = (pgm) => {
  // Map of exercise name => free-exercise-db image path
  // Only includes exercises that have a good match in the database.
  // Exercises not listed here keep their existing Pexels fallback images.
  const exerciseImages = [
    // ── Chest ──────────────────────────────────────────────────────────────
    ['Bench Press',              gh('Barbell_Bench_Press_-_Medium_Grip/0.jpg')],
    ['Incline Bench Press',      gh('Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg')],
    ['Decline Bench Press',      gh('Decline_Barbell_Bench_Press/0.jpg')],
    ['Dumbbell Bench Press',     gh('Dumbbell_Bench_Press/0.jpg')],
    ['Incline Dumbbell Press',   gh('Incline_Dumbbell_Press/0.jpg')],
    ['Cable Fly',                gh('Flat_Bench_Cable_Flyes/0.jpg')],
    ['Push-up',                  gh('Pushups/0.jpg')],
    ['Dip',                      gh('Bench_Dips/0.jpg')],
    ['Chest Dip',                gh('Dips_-_Chest_Version/0.jpg')],
    ['Dumbbell Fly',             gh('Dumbbell_Flyes/0.jpg')],
    ['Close-Grip Bench Press',   gh('Smith_Machine_Close-Grip_Bench_Press/0.jpg')],
    ['Landmine Press',           gh('Landmine_Linear_Jammer/0.jpg')],
    ['Chest Press Machine',      gh('Cable_Chest_Press/0.jpg')],
    ['Machine Fly',              gh('Decline_Dumbbell_Flyes/0.jpg')],
    ['Decline Dumbbell Press',   gh('Decline_Dumbbell_Bench_Press/0.jpg')],

    // ── Back ───────────────────────────────────────────────────────────────
    ['Deadlift',                 gh('Barbell_Deadlift/0.jpg')],
    ['Barbell Row',              gh('Bent_Over_Barbell_Row/0.jpg')],
    ['T-Bar Row',                gh('Lying_T-Bar_Row/0.jpg')],
    ['Pull-up',                  gh('Weighted_Pull_Ups/0.jpg')],
    ['Chin-up',                  gh('Chin-Up/0.jpg')],
    ['Lat Pulldown',             gh('Close-Grip_Front_Lat_Pulldown/0.jpg')],
    ['Seated Cable Row',         gh('Seated_Cable_Rows/0.jpg')],
    ['Single-Arm Dumbbell Row',  gh('One-Arm_Dumbbell_Row/0.jpg')],
    ['Hyperextension',           gh('Hyperextensions_Back_Extensions/0.jpg')],
    ['Cable Pullover',           gh('Straight-Arm_Dumbbell_Pullover/0.jpg')],
    ['Straight-Arm Pulldown',    gh('Straight-Arm_Pulldown/0.jpg')],
    ['Inverted Row',             gh('Inverted_Row/0.jpg')],
    ['Machine Row',              gh('Smith_Machine_Bent_Over_Row/0.jpg')],
    ['Rack Pull',                gh('Rack_Pull_with_Bands/0.jpg')],
    ['Dumbbell Pullover',        gh('Bent-Arm_Dumbbell_Pullover/0.jpg')],

    // ── Legs ───────────────────────────────────────────────────────────────
    ['Squat',                    gh('Barbell_Full_Squat/0.jpg')],
    ['Front Squat',              gh('Front_Squat_Clean_Grip/0.jpg')],
    ['Hack Squat',               gh('Hack_Squat/0.jpg')],
    ['Goblet Squat',             gh('Goblet_Squat/0.jpg')],
    ['Romanian Deadlift',        gh('Romanian_Deadlift/0.jpg')],
    ['Sumo Deadlift',            gh('Sumo_Deadlift/0.jpg')],
    ['Leg Press',                gh('Leg_Press/0.jpg')],
    ['Leg Curl',                 gh('Ball_Leg_Curl/0.jpg')],
    ['Leg Extension',            gh('Leg_Extensions/0.jpg')],
    ['Lunge',                    gh('Barbell_Lunge/0.jpg')],
    ['Walking Lunge',            gh('Barbell_Walking_Lunge/0.jpg')],
    ['Good Morning',             gh('Good_Morning/0.jpg')],
    ['Calf Raise',               gh('Barbell_Seated_Calf_Raise/0.jpg')],
    ['Standing Calf Raise',      gh('Rocking_Standing_Calf_Raise/0.jpg')],
    ['Seated Calf Raise',        gh('Seated_Calf_Raise/0.jpg')],
    ['Hip Thrust',               gh('Barbell_Hip_Thrust/0.jpg')],
    ['Glute Bridge',             gh('Barbell_Glute_Bridge/0.jpg')],
    ['Step Up',                  gh('Barbell_Step_Ups/0.jpg')],
    ['Smith Machine Squat',      gh('Smith_Machine_Squat/0.jpg')],
    ['Sissy Squat',              gh('Weighted_Sissy_Squat/0.jpg')],
    ['Hip Adduction',            gh('Band_Hip_Adductions/0.jpg')],

    // ── Shoulders ──────────────────────────────────────────────────────────
    ['Overhead Press',           gh('Smith_Machine_Overhead_Shoulder_Press/0.jpg')],
    ['Dumbbell Shoulder Press',  gh('Dumbbell_Shoulder_Press/0.jpg')],
    ['Arnold Press',             gh('Kettlebell_Arnold_Press/0.jpg')],
    ['Machine Shoulder Press',   gh('Machine_Shoulder_Military_Press/0.jpg')],
    ['Lateral Raise',            gh('Cable_Seated_Lateral_Raise/0.jpg')],
    ['Cable Lateral Raise',      gh('Cable_Seated_Lateral_Raise/0.jpg')],
    ['Front Raise',              gh('Front_Raise_And_Pullover/0.jpg')],
    ['Shrugs',                   gh('Cable_Shrugs/0.jpg')],
    ['Upright Row',              gh('Dumbbell_One-Arm_Upright_Row/0.jpg')],
    ['Face Pull',                gh('Face_Pull/0.jpg')],
    ['Rear Delt Fly',            gh('Cable_Rear_Delt_Fly/0.jpg')],
    ['Reverse Pec Deck',         gh('Reverse_Flyes/0.jpg')],
    ['Behind-the-Neck Press',    gh('Neck_Press/0.jpg')],
    ['Lu Raise',                 gh('Alternating_Deltoid_Raise/0.jpg')],

    // ── Arms ───────────────────────────────────────────────────────────────
    ['Bicep Curl',               gh('Dumbbell_Alternate_Bicep_Curl/0.jpg')],
    ['Barbell Curl',             gh('Barbell_Curl/0.jpg')],
    ['Hammer Curl',              gh('Alternate_Hammer_Curl/0.jpg')],
    ['Preacher Curl',            gh('Preacher_Curl/0.jpg')],
    ['Concentration Curl',       gh('Concentration_Curls/0.jpg')],
    ['Cable Curl',               gh('High_Cable_Curls/0.jpg')],
    ['EZ-Bar Curl',              gh('EZ-Bar_Curl/0.jpg')],
    ['Incline Dumbbell Curl',    gh('Incline_Dumbbell_Curl/0.jpg')],
    ['Reverse Curl',             gh('Standing_Dumbbell_Reverse_Curl/0.jpg')],
    ['Wrist Curl',               gh('Cable_Wrist_Curl/0.jpg')],
    ['Spider Curl',              gh('Spider_Curl/0.jpg')],
    ['Skull Crusher',            gh('Band_Skull_Crusher/0.jpg')],
    ['Tricep Extension',         gh('Cable_One_Arm_Tricep_Extension/0.jpg')],
    ['Rope Pushdown',            gh('Triceps_Pushdown_-_Rope_Attachment/0.jpg')],
    ['Overhead Tricep Extension',gh('Cable_Rope_Overhead_Triceps_Extension/0.jpg')],
    ['Tricep Kickback',          gh('Tricep_Dumbbell_Kickback/0.jpg')],
    ['Diamond Push-up',          gh('Close-Grip_Push-Up_off_of_a_Dumbbell/0.jpg')],
    ['Dip Machine',              gh('Dip_Machine/0.jpg')],
    ['Cable Overhead Tricep Extension', gh('Cable_Rope_Overhead_Triceps_Extension/0.jpg')],

    // ── Core ───────────────────────────────────────────────────────────────
    ['Plank',                    gh('Plank/0.jpg')],
    ['Russian Twist',            gh('Russian_Twist/0.jpg')],
    ['Hanging Leg Raise',        gh('Hanging_Leg_Raise/0.jpg')],
    ['Cable Crunch',             gh('Cable_Crunch/0.jpg')],
    ['Ab Wheel Rollout',         gh('Barbell_Ab_Rollout/0.jpg')],
    ['Dead Bug',                 gh('Dead_Bug/0.jpg')],
    ['Mountain Climber',         gh('Mountain_Climbers/0.jpg')],
    ['Sit-up',                   gh('Sit-Up/0.jpg')],
    ['Pallof Press',             gh('Pallof_Press/0.jpg')],
    ['Woodchop',                 gh('Standing_Cable_Wood_Chop/0.jpg')],
    ['Toe Touch',                gh('Standing_Toe_Touches/0.jpg')],
    ['Hanging Crunches',         gh('Crunches/0.jpg')],

    // ── Full Body / Cardio ─────────────────────────────────────────────────
    ['Running',                  gh('Running_Treadmill/0.jpg')],
    ['Cycling',                  gh('Bicycling/0.jpg')],
    ['Rowing Machine',           gh('Rowing_Stationary/0.jpg')],
    ['Jump Rope',                gh('Rope_Jumping/0.jpg')],
    ['Kettlebell Swing',         gh('One-Arm_Kettlebell_Swings/0.jpg')],
    ['Clean and Press',          gh('Clean_and_Press/0.jpg')],
    ['Power Clean',              gh('Power_Clean/0.jpg')],
    ['Box Jump',                 gh('Box_Jump_Multiple_Response/0.jpg')],
    ['Battle Ropes',             gh('Battling_Ropes/0.jpg')],
    ['Farmer Walk',              gh('Farmers_Walk/0.jpg')],
  ];

  for (const [name, url] of exerciseImages) {
    pgm.sql(`UPDATE exercises SET image_url = '${url}' WHERE lower(name) = lower('${name.replace(/'/g, "''")}');`);
  }
};

export const down = (pgm) => {
  // Revert to NULL so the previous migration's Pexels images take effect after rollback
  const names = [
    'Bench Press','Incline Bench Press','Decline Bench Press','Dumbbell Bench Press',
    'Incline Dumbbell Press','Cable Fly','Push-up','Dip','Chest Dip','Dumbbell Fly',
    'Close-Grip Bench Press','Landmine Press','Chest Press Machine','Machine Fly',
    'Decline Dumbbell Press','Deadlift','Barbell Row','T-Bar Row','Pull-up','Chin-up',
    'Lat Pulldown','Seated Cable Row','Single-Arm Dumbbell Row','Hyperextension',
    'Cable Pullover','Straight-Arm Pulldown','Inverted Row','Machine Row','Rack Pull',
    'Dumbbell Pullover','Squat','Front Squat','Hack Squat','Goblet Squat',
    'Romanian Deadlift','Sumo Deadlift','Leg Press','Leg Curl','Leg Extension',
    'Lunge','Walking Lunge','Good Morning','Calf Raise','Standing Calf Raise',
    'Seated Calf Raise','Hip Thrust','Glute Bridge','Step Up','Smith Machine Squat',
    'Sissy Squat','Hip Adduction','Overhead Press','Dumbbell Shoulder Press',
    'Arnold Press','Machine Shoulder Press','Lateral Raise','Cable Lateral Raise',
    'Front Raise','Shrugs','Upright Row','Face Pull','Rear Delt Fly',
    'Reverse Pec Deck','Behind-the-Neck Press','Lu Raise','Bicep Curl','Barbell Curl',
    'Hammer Curl','Preacher Curl','Concentration Curl','Cable Curl','EZ-Bar Curl',
    'Incline Dumbbell Curl','Reverse Curl','Wrist Curl','Spider Curl','Skull Crusher',
    'Tricep Extension','Rope Pushdown','Overhead Tricep Extension','Tricep Kickback',
    'Diamond Push-up','Dip Machine','Cable Overhead Tricep Extension','Plank',
    'Russian Twist','Hanging Leg Raise','Cable Crunch','Ab Wheel Rollout','Dead Bug',
    'Mountain Climber','Sit-up','Pallof Press','Woodchop','Toe Touch','Hanging Crunches',
    'Running','Cycling','Rowing Machine','Jump Rope','Kettlebell Swing','Clean and Press',
    'Power Clean','Box Jump','Battle Ropes','Farmer Walk',
  ];
  for (const name of names) {
    pgm.sql(`UPDATE exercises SET image_url = NULL WHERE lower(name) = lower('${name.replace(/'/g, "''")}');`);
  }
};
