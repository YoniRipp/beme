import { describe, it, expect } from 'vitest';
import {
  KCAL_PER_GRAM,
  SUGGESTED_MACRO_TARGETS,
  caloriesFromMacros,
  findGoalTarget,
  remainingToTarget,
  resolveCalorieTarget,
  resolveDailyTargets,
  resolveMacroTargets,
  resolveWorkoutTarget,
  targetFraction,
} from '../targets';

/**
 * These pin the rule the two clients disagreed about: the daily calorie target is the
 * goals table's `calories` / `daily` row, macro targets are the profile's grams, and an
 * unset target is `null` rather than an invented number. The web used to derive 2400 kcal
 * from default macros and Expo used to fall back to 2000; both are gone, and the cases
 * below are what stops either coming back.
 */

const goal = (type: string, period: string, target: number) => ({ type, period, target });

describe('resolveCalorieTarget', () => {
  it('reads the goals table calories/daily row', () => {
    expect(resolveCalorieTarget([goal('calories', 'daily', 2200)])).toBe(2200);
  });

  it('is null when the user has no daily calorie goal — never an invented default', () => {
    expect(resolveCalorieTarget([])).toBeNull();
    expect(resolveCalorieTarget(undefined)).toBeNull();
    expect(resolveCalorieTarget(null)).toBeNull();
  });

  it('ignores a calories goal for another period', () => {
    expect(resolveCalorieTarget([goal('calories', 'weekly', 14000)])).toBeNull();
  });

  it('ignores another type on the daily period', () => {
    expect(resolveCalorieTarget([goal('sleep', 'daily', 8)])).toBeNull();
  });

  it('takes the first matching row, the same one .find() has always returned', () => {
    // `goals` has no unique constraint on (user, type, period) and the API returns rows
    // created_at ASC, so a user can hold two. Anything editing the target must edit this one.
    expect(
      resolveCalorieTarget([goal('calories', 'daily', 2200), goal('calories', 'daily', 1800)])
    ).toBe(2200);
  });

  it('treats a zero or negative target as unset rather than dividing by it', () => {
    expect(resolveCalorieTarget([goal('calories', 'daily', 0)])).toBeNull();
    expect(resolveCalorieTarget([goal('calories', 'daily', -100)])).toBeNull();
  });
});

describe('resolveWorkoutTarget', () => {
  it('reads the goals table workouts/weekly row', () => {
    expect(resolveWorkoutTarget([goal('workouts', 'weekly', 5)])).toBe(5);
  });

  it('is null without one — Expo used to invent 4', () => {
    expect(resolveWorkoutTarget([])).toBeNull();
  });
});

describe('findGoalTarget', () => {
  it('matches on type and period together', () => {
    const goals = [goal('sleep', 'daily', 8), goal('workouts', 'weekly', 3)];
    expect(findGoalTarget(goals, 'sleep', 'daily')).toBe(8);
    expect(findGoalTarget(goals, 'sleep', 'weekly')).toBeNull();
  });
});

describe('resolveMacroTargets', () => {
  it('reads the profile grams as stored', () => {
    expect(resolveMacroTargets({ macroCarbs: 250, macroFat: 70, macroProtein: 150 })).toEqual({
      carbs: 250,
      fat: 70,
      protein: 150,
    });
  });

  it('leaves an unset macro null instead of defaulting it', () => {
    expect(resolveMacroTargets({ macroProtein: 150 })).toEqual({
      carbs: null,
      fat: null,
      protein: 150,
    });
  });

  it('handles a missing profile', () => {
    expect(resolveMacroTargets(undefined)).toEqual({ carbs: null, fat: null, protein: null });
    expect(resolveMacroTargets(null)).toEqual({ carbs: null, fat: null, protein: null });
  });

  it('treats an explicit null column as unset', () => {
    expect(resolveMacroTargets({ macroCarbs: null, macroFat: null, macroProtein: null })).toEqual({
      carbs: null,
      fat: null,
      protein: null,
    });
  });
});

describe('caloriesFromMacros', () => {
  it('applies 4 / 9 / 4', () => {
    expect(caloriesFromMacros({ carbs: 300, fat: 80, protein: 120 })).toBe(2400);
    expect(KCAL_PER_GRAM).toEqual({ carbs: 4, fat: 9, protein: 4 });
  });

  it('is null unless all three grams are set — a partial sum is not a target', () => {
    expect(caloriesFromMacros({ carbs: 300, fat: null, protein: 120 })).toBeNull();
    expect(caloriesFromMacros({ carbs: null, fat: null, protein: null })).toBeNull();
  });

  it('still adds up the suggestion the editor seeds with', () => {
    expect(caloriesFromMacros(SUGGESTED_MACRO_TARGETS)).toBe(2400);
  });
});

describe('resolveDailyTargets', () => {
  it('takes calories from goals and macros from the profile', () => {
    expect(
      resolveDailyTargets([goal('calories', 'daily', 2000)], {
        macroCarbs: 250,
        macroFat: 70,
        macroProtein: 150,
      })
    ).toEqual({ calories: 2000, carbs: 250, fat: 70, protein: 150 });
  });

  it('does not let profile macros stand in for a missing calorie goal', () => {
    // The web's old bug in one assertion: 300/80/120 adds to 2400, and that 2400 used to
    // be the ring's target even though the user had never set a calorie goal.
    expect(
      resolveDailyTargets([], { macroCarbs: 300, macroFat: 80, macroProtein: 120 }).calories
    ).toBeNull();
  });

  it('is all null for an account that has set nothing', () => {
    expect(resolveDailyTargets([], {})).toEqual({
      calories: null,
      carbs: null,
      fat: null,
      protein: null,
    });
  });
});

describe('targetFraction', () => {
  it('is the clamped 0..1 progress toward a target', () => {
    expect(targetFraction(500, 2000)).toBe(0.25);
    expect(targetFraction(3000, 2000)).toBe(1);
    expect(targetFraction(0, 2000)).toBe(0);
  });

  it('is null without a target, which is not the same as 0', () => {
    expect(targetFraction(500, null)).toBeNull();
    expect(targetFraction(500, 0)).toBeNull();
  });
});

describe('remainingToTarget', () => {
  it('clamps at zero once the target is passed', () => {
    expect(remainingToTarget(1800, 2000)).toBe(200);
    expect(remainingToTarget(2400, 2000)).toBe(0);
  });

  it('is null without a target', () => {
    expect(remainingToTarget(1800, null)).toBeNull();
  });
});
