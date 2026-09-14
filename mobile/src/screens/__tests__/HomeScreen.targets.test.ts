import { buildHomeProgress, type HomeProgressDeps } from '../HomeScreen';

/**
 * Pins the Home screen's derived numbers without rendering it or its React Query hooks
 * (a QueryClient left over in a test hangs jest — see GoalsScreen.progress.test.ts).
 *
 * The cases that matter are the ones that used to be wrong: the calorie target came with
 * a `|| 2000` and the workouts target with a `|| 4`, so an account that had set neither
 * saw two numbers it never chose — and different ones from the web, which derived 2400
 * from default macro grams. Protein had no target at all and carbs and fat were not
 * rendered. Sleep was the week's average here and today's hours on the web.
 *
 * The resolution rules themselves live in @trackvibe/shared/domain and are covered by
 * packages/shared/src/domain/__tests__/targets.test.ts; this only pins that the screen
 * wires them up.
 */

const NOW = new Date(2026, 8, 16, 12, 0, 0); // Wednesday 16 September 2026, 12:00 local
const YESTERDAY = new Date(2026, 8, 15, 12, 0, 0);
const LAST_WEEK = new Date(2026, 8, 7, 12, 0, 0);

const food = (over: Partial<HomeProgressDeps['foodEntries'][number]> = {}) => ({
  date: NOW,
  calories: 0,
  protein: 0,
  carbs: 0,
  fats: 0,
  ...over,
});

const deps = (over: Partial<HomeProgressDeps> = {}): HomeProgressDeps => ({
  goals: [],
  profile: {},
  workouts: [],
  foodEntries: [],
  checkIns: [],
  ...over,
});

describe('buildHomeProgress — calorie target', () => {
  it('takes the daily calorie target from the goals table', () => {
    const progress = buildHomeProgress(
      deps({
        goals: [{ type: 'calories', period: 'daily', target: 2200 }],
        foodEntries: [food({ calories: 800 })],
      }),
      NOW
    );
    expect(progress.targets.calories).toBe(2200);
    expect(progress.todayCalories).toBe(800);
    expect(progress.caloriesLeft).toBe(1400);
    expect(progress.calorieFraction).toBeCloseTo(800 / 2200);
  });

  it('leaves the target unset rather than falling back to 2000', () => {
    const progress = buildHomeProgress(deps({ foodEntries: [food({ calories: 800 })] }), NOW);
    expect(progress.targets.calories).toBeNull();
    expect(progress.caloriesLeft).toBeNull();
    expect(progress.calorieFraction).toBeNull();
  });

  it('does not let profile macros stand in for a missing calorie goal', () => {
    const progress = buildHomeProgress(
      deps({ profile: { macroCarbs: 300, macroFat: 80, macroProtein: 120 } }),
      NOW
    );
    expect(progress.targets.calories).toBeNull();
  });

  it('clamps calories left at zero once the target is passed', () => {
    const progress = buildHomeProgress(
      deps({
        goals: [{ type: 'calories', period: 'daily', target: 2000 }],
        foodEntries: [food({ calories: 2400 })],
      }),
      NOW
    );
    expect(progress.caloriesLeft).toBe(0);
    expect(progress.calorieFraction).toBe(1);
  });

  it('ignores food logged on another day', () => {
    const progress = buildHomeProgress(
      deps({ foodEntries: [food({ calories: 500 }), food({ date: YESTERDAY, calories: 900 })] }),
      NOW
    );
    expect(progress.todayCalories).toBe(500);
    expect(progress.meals).toBe(1);
  });
});

describe('buildHomeProgress — macro targets', () => {
  it('reads protein, carb and fat targets from the profile grams', () => {
    const progress = buildHomeProgress(
      deps({
        profile: { macroCarbs: 250, macroFat: 70, macroProtein: 150 },
        foodEntries: [food({ protein: 40, carbs: 90, fats: 20 })],
      }),
      NOW
    );
    expect(progress.targets).toEqual({ calories: null, carbs: 250, fat: 70, protein: 150 });
    expect(progress.todayProtein).toBe(40);
    expect(progress.todayCarbs).toBe(90);
    expect(progress.todayFats).toBe(20);
  });

  it('leaves macro targets unset when the profile has none', () => {
    const progress = buildHomeProgress(deps(), NOW);
    expect(progress.targets.protein).toBeNull();
    expect(progress.targets.carbs).toBeNull();
    expect(progress.targets.fat).toBeNull();
  });
});

describe('buildHomeProgress — workouts this week', () => {
  it('counts this week against the weekly goal', () => {
    const progress = buildHomeProgress(
      deps({
        goals: [{ type: 'workouts', period: 'weekly', target: 5 }],
        workouts: [{ date: NOW }, { date: YESTERDAY }, { date: LAST_WEEK }],
      }),
      NOW
    );
    expect(progress.weekWorkouts).toBe(2);
    expect(progress.workoutTarget).toBe(5);
  });

  it('leaves the workout target unset rather than falling back to 4', () => {
    expect(buildHomeProgress(deps(), NOW).workoutTarget).toBeNull();
  });
});

describe('buildHomeProgress — sleep', () => {
  it("is last night's hours, matching the web, not the week's average", () => {
    const progress = buildHomeProgress(
      deps({
        checkIns: [
          { date: NOW, sleepHours: 6.2 },
          { date: YESTERDAY, sleepHours: 8 },
        ],
      }),
      NOW
    );
    expect(progress.sleepHours).toBe(6.2);
  });

  it('is null when today has no check-in, even if earlier days do', () => {
    const progress = buildHomeProgress(deps({ checkIns: [{ date: YESTERDAY, sleepHours: 8 }] }), NOW);
    expect(progress.sleepHours).toBeNull();
  });

  it("ignores today's check-in when it recorded no sleep hours", () => {
    const progress = buildHomeProgress(deps({ checkIns: [{ date: NOW }] }), NOW);
    expect(progress.sleepHours).toBeNull();
  });
});
