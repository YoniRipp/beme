import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  buildGoalCurrentCalcs,
  computeGoalProgress,
  defaultPeriodForType,
  formatGoalValue,
  GOAL_UNIT_LABELS,
} from '../goals';
import { GOAL_PERIODS, GOAL_TYPES, type Goal } from '../../types/goals';

/**
 * Pins the behaviour of frontend/src/features/goals/useGoalProgress.ts's pure core
 * (buildGoalCurrentCalcs, plus the current/percentage maths around it), moved here
 * verbatim so both clients compute a goal's progress identically. These cases were
 * written against — and passed unchanged against — the pre-extraction web
 * implementation before this module existed; see the extraction commit.
 *
 * Mobile's only call site (GoalsScreen.tsx) never computed `current` at all, so every
 * goal card showed "0 / target" no matter what the user had logged — this is the
 * calculation that fixes that.
 */

// Wednesday 16 September 2026, 12:00 local — matches domain/__tests__/analytics.test.ts's
// convention, so weekly/monthly/yearly period maths is deterministic.
const NOW = new Date(2026, 8, 16, 12, 0, 0);
const daysAgo = (n: number, hour = 12) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', type: 'calories', target: 2000, period: 'daily', createdAt: NOW, ...over,
});

describe('buildGoalCurrentCalcs', () => {
  // An arbitrary fixed window, independent of getPeriodRange — these cases pin the
  // three calculators in isolation from period-boundary logic (already covered by
  // dates.test.ts).
  const range = { start: daysAgo(1), end: daysAgo(-1) };

  it('calories sums food entries within the date range', () => {
    const calcs = buildGoalCurrentCalcs({
      foodEntries: [{ date: daysAgo(0), calories: 500 }, { date: daysAgo(0), calories: 300 }],
      workouts: [],
      checkIns: [],
    });
    expect(calcs.calories(goal(), range)).toBe(800);
  });

  it('calories excludes entries outside the range and accepts string dates', () => {
    const calcs = buildGoalCurrentCalcs({
      foodEntries: [
        { date: daysAgo(0).toISOString(), calories: 500 }, // string date, in range
        { date: daysAgo(5), calories: 9999 }, // out of range
      ],
      workouts: [],
      checkIns: [],
    });
    expect(calcs.calories(goal(), range)).toBe(500);
  });

  it('workouts counts sessions within the date range', () => {
    const calcs = buildGoalCurrentCalcs({
      foodEntries: [],
      workouts: [{ date: daysAgo(0) }, { date: daysAgo(0) }, { date: daysAgo(5) }],
      checkIns: [],
    });
    expect(calcs.workouts(goal(), range)).toBe(2);
  });

  it('sleep averages check-ins with a recorded sleepHours in range', () => {
    const calcs = buildGoalCurrentCalcs({
      foodEntries: [],
      workouts: [],
      checkIns: [{ date: daysAgo(0), sleepHours: 6 }, { date: daysAgo(0), sleepHours: 8 }],
    });
    expect(calcs.sleep(goal(), range)).toBe(7);
  });

  it('sleep skips check-ins with no sleepHours recorded, whether in range or not', () => {
    const calcs = buildGoalCurrentCalcs({
      foodEntries: [],
      workouts: [],
      checkIns: [
        { date: daysAgo(0), sleepHours: 6 },
        { date: daysAgo(0), sleepHours: undefined },
        { date: daysAgo(5), sleepHours: 9 }, // out of range too
      ],
    });
    expect(calcs.sleep(goal(), range)).toBe(6);
  });

  it('sleep returns 0 for an empty period, not NaN', () => {
    const calcs = buildGoalCurrentCalcs({ foodEntries: [], workouts: [], checkIns: [] });
    const result = calcs.sleep(goal(), range);
    expect(result).toBe(0);
    expect(Number.isNaN(result)).toBe(false);
  });
});

describe('computeGoalProgress', () => {
  it('computes calories current/target/percentage for the daily period', () => {
    const g = goal({ type: 'calories', period: 'daily', target: 2000 });
    const deps = {
      foodEntries: [
        { date: daysAgo(0), calories: 500 },
        { date: daysAgo(0).toISOString(), calories: 300 },
        { date: daysAgo(2), calories: 9999 }, // two days ago: outside today
      ],
      workouts: [],
      checkIns: [],
    };
    expect(computeGoalProgress(g, deps)).toEqual({ current: 800, target: 2000, percentage: 40 });
  });

  it('computes workouts current for the weekly period', () => {
    const g = goal({ type: 'workouts', period: 'weekly', target: 4 });
    const deps = {
      foodEntries: [],
      workouts: [{ date: daysAgo(0) }, { date: daysAgo(1) }, { date: daysAgo(8) }], // last one is prior week
      checkIns: [],
    };
    expect(computeGoalProgress(g, deps)).toEqual({ current: 2, target: 4, percentage: 50 });
  });

  it('computes sleep current for the monthly period, ignoring unset sleepHours', () => {
    const g = goal({ type: 'sleep', period: 'monthly', target: 8 });
    const deps = {
      foodEntries: [],
      workouts: [],
      checkIns: [
        { date: daysAgo(0), sleepHours: 6 },
        { date: daysAgo(3), sleepHours: 8 },
        { date: daysAgo(5), sleepHours: undefined },
        { date: daysAgo(45) }, // previous month, and no sleepHours anyway
      ],
    };
    expect(computeGoalProgress(g, deps)).toEqual({ current: 7, target: 8, percentage: 87.5 });
  });

  it('returns current 0 (not NaN) for a sleep goal with nothing logged this year', () => {
    const g = goal({ type: 'sleep', period: 'yearly', target: 8 });
    const result = computeGoalProgress(g, { foodEntries: [], workouts: [], checkIns: [] });
    expect(result).toEqual({ current: 0, target: 8, percentage: 0 });
  });

  it('clamps percentage at 100 when current exceeds target', () => {
    const g = goal({ type: 'calories', period: 'daily', target: 2000 });
    const deps = { foodEntries: [{ date: daysAgo(0), calories: 5000 }], workouts: [], checkIns: [] };
    expect(computeGoalProgress(g, deps)).toEqual({ current: 5000, target: 2000, percentage: 100 });
  });

  it('reports percentage 0 without dividing by zero when target is not positive', () => {
    const g = goal({ type: 'calories', period: 'daily', target: 0 });
    const deps = { foodEntries: [{ date: daysAgo(0), calories: 500 }], workouts: [], checkIns: [] };
    // current is still computed; only percentage guards against target <= 0.
    expect(computeGoalProgress(g, deps)).toEqual({ current: 500, target: 0, percentage: 0 });
  });

  it('computes workouts current for the yearly period', () => {
    const g = goal({ type: 'workouts', period: 'yearly', target: 50 });
    const deps = {
      foodEntries: [],
      workouts: [{ date: daysAgo(200) }, { date: daysAgo(400) }], // this year, and last year
      checkIns: [],
    };
    expect(computeGoalProgress(g, deps)).toEqual({ current: 1, target: 50, percentage: 2 });
  });
});

/**
 * `formatGoalValue` / `GOAL_UNIT_LABELS` moved here from the web's GoalCard so both clients
 * print a goal the same way. Mobile printed `current.toLocaleString()` directly, which for a
 * sleep goal — an *average*, straight out of computeGoalProgress above — rendered
 * "7.333 / 8 hours" where the web rendered "7.3h / 8.0h hours avg".
 */
describe('formatGoalValue', () => {
  it('rounds a sleep average to one decimal and suffixes the unit', () => {
    // Exactly what buildGoalCurrentCalcs returns for check-ins of 7, 7 and 8 hours.
    expect(formatGoalValue('sleep', 22 / 3)).toBe('7.3h');
  });

  it('formats a whole sleep target the same way, so both halves of the pair match', () => {
    expect(formatGoalValue('sleep', 8)).toBe('8.0h');
  });

  it('gives a calories value thousands separators and no unit suffix', () => {
    expect(formatGoalValue('calories', 1850)).toBe('1,850');
  });

  it('leaves a small workouts count alone', () => {
    expect(formatGoalValue('workouts', 3)).toBe('3');
  });
});

describe('GOAL_UNIT_LABELS', () => {
  it('uses the web Goals card\'s noun for every type', () => {
    expect(GOAL_UNIT_LABELS).toEqual({
      calories: 'calories',
      workouts: 'workouts',
      sleep: 'hours avg',
    });
  });

  it('covers every member of GOAL_TYPES, so no type can render an undefined unit', () => {
    for (const type of GOAL_TYPES) {
      expect(typeof GOAL_UNIT_LABELS[type]).toBe('string');
    }
  });
});

describe('defaultPeriodForType', () => {
  it('defaults calories and sleep goals to daily', () => {
    expect(defaultPeriodForType('calories')).toBe('daily');
    expect(defaultPeriodForType('sleep')).toBe('daily');
  });

  it('defaults workouts goals to weekly', () => {
    expect(defaultPeriodForType('workouts')).toBe('weekly');
  });

  it('only ever returns a real GoalPeriod', () => {
    for (const type of GOAL_TYPES) {
      expect(GOAL_PERIODS).toContain(defaultPeriodForType(type));
    }
  });
});
