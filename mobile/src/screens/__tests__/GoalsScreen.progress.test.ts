import { goalsWithCurrent } from '../GoalsScreen';
import type { Goal } from '../../types/goals';

/**
 * GoalsScreen's only call site for MobileGoalCard never passed a `current` prop, which
 * defaults to 0 — every goal card rendered "0 / target" no matter how much progress the
 * user had actually logged. These cases pin `goalsWithCurrent`, the pure function that
 * pairs each goal with its real computed value from the screen's own hook data, without
 * rendering the screen or its React Query hooks (a QueryClient left over in a test
 * hangs jest — see hooks/useWorkouts.ts's buildWorkoutUpdateBody for the same reasoning).
 * The calculation itself is @trackvibe/shared/domain's computeGoalProgress, already
 * covered by packages/shared/src/domain/__tests__/goals.test.ts; this only pins that
 * GoalsScreen wires it up correctly per goal.
 *
 * `percentage` was added alongside `current` so MobileGoalCard stops deriving its own
 * `current / goal.target` — a second, smaller copy of the same arithmetic, and one without
 * the shared calculator's divide-by-zero guard or its >100% clamp.
 */

const NOW = new Date(2026, 8, 16, 12, 0, 0); // Wednesday 16 September 2026, 12:00 local

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g', type: 'calories', target: 2000, period: 'daily', createdAt: NOW, ...over,
});

describe('goalsWithCurrent', () => {
  it('computes a real current for a calories goal from today\'s food entries', () => {
    const goals = [goal({ id: 'cal', type: 'calories', target: 2000 })];
    const deps = {
      foodEntries: [{ date: NOW, calories: 500 }, { date: NOW, calories: 300 }],
      workouts: [],
      checkIns: [],
    };
    expect(goalsWithCurrent(goals, deps)).toEqual([
      { goal: goals[0], current: 800, percentage: 40 },
    ]);
  });

  it('computes a real current for a workouts goal from logged sessions', () => {
    const goals = [goal({ id: 'wk', type: 'workouts', target: 3, period: 'weekly' })];
    const deps = {
      foodEntries: [],
      workouts: [{ date: NOW }, { date: NOW }],
      checkIns: [],
    };
    expect(goalsWithCurrent(goals, deps)).toEqual([
      { goal: goals[0], current: 2, percentage: (2 / 3) * 100 },
    ]);
  });

  it('computes a real current for a sleep goal from check-ins', () => {
    const goals = [goal({ id: 'sl', type: 'sleep', target: 8, period: 'daily' })];
    const deps = {
      foodEntries: [],
      workouts: [],
      checkIns: [{ date: NOW, sleepHours: 7 }],
    };
    expect(goalsWithCurrent(goals, deps)).toEqual([
      { goal: goals[0], current: 7, percentage: 87.5 },
    ]);
  });

  it('reports 0 — not undefined — for a goal with nothing logged this period', () => {
    const goals = [goal({ id: 'empty', type: 'calories', target: 2000 })];
    const deps = { foodEntries: [], workouts: [], checkIns: [] };
    const [result] = goalsWithCurrent(goals, deps);
    expect(result.current).toBe(0);
    expect(result.current).not.toBeUndefined();
  });

  it('computes each goal independently when mixed types are on screen together', () => {
    const goals = [
      goal({ id: 'cal', type: 'calories', target: 2000, period: 'daily' }),
      goal({ id: 'wk', type: 'workouts', target: 3, period: 'weekly' }),
      goal({ id: 'sl', type: 'sleep', target: 8, period: 'daily' }),
    ];
    const deps = {
      foodEntries: [{ date: NOW, calories: 1200 }],
      workouts: [{ date: NOW }],
      checkIns: [{ date: NOW, sleepHours: 6 }],
    };
    expect(goalsWithCurrent(goals, deps)).toEqual([
      { goal: goals[0], current: 1200, percentage: 60 },
      { goal: goals[1], current: 1, percentage: (1 / 3) * 100 },
      { goal: goals[2], current: 6, percentage: 75 },
    ]);
  });

  it('hands the card a clamped percentage rather than letting it derive its own', () => {
    // MobileGoalCard's own `current / goal.target` had no >100% clamp and no
    // divide-by-zero guard; both live in the shared calculator, and both arrive here.
    const goals = [
      goal({ id: 'over', type: 'calories', target: 2000, period: 'daily' }),
      goal({ id: 'zero', type: 'calories', target: 0, period: 'daily' }),
    ];
    const deps = { foodEntries: [{ date: NOW, calories: 5000 }], workouts: [], checkIns: [] };
    const [over, zero] = goalsWithCurrent(goals, deps);
    expect(over.percentage).toBe(100);
    expect(zero.percentage).toBe(0);
    expect(zero.percentage).not.toBeNaN();
  });
});
