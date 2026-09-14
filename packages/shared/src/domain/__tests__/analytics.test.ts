import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  calculateTrends,
  getFitnessInsights,
  getHealthInsights,
  getWorkoutFrequencyData,
  getCalorieTrendData,
} from '../analytics';
import type { Workout } from '../../types/workout';
import type { FoodEntry, DailyCheckIn } from '../../types/energy';

// Wednesday 16 September 2026, 12:00 local. Frozen so period maths is deterministic.
const NOW = new Date(2026, 8, 16, 12, 0, 0);
const daysAgo = (n: number, hour = 12) => {
  const d = new Date(NOW);
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d;
};

const workout = (over: Partial<Workout> = {}): Workout => ({
  id: 'w', title: 'Session', type: 'strength', date: NOW,
  durationMinutes: 60, exercises: [], ...over,
}) as Workout;

const food = (over: Partial<FoodEntry> = {}): FoodEntry => ({
  id: 'f', name: 'Food', date: NOW,
  calories: 100, protein: 10, carbs: 10, fats: 10, ...over,
}) as FoodEntry;

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });

describe('calculateTrends', () => {
  it('sums the current period and compares it with the previous one', () => {
    const data = [
      { date: daysAgo(0), amount: 100 },
      { date: daysAgo(1), amount: 200 },
      { date: daysAgo(8), amount: 150 }, // previous week
    ];
    const r = calculateTrends(data, (i) => i.amount, 'week');
    expect(r.current).toBe(300);
    expect(r.previous).toBe(150);
    expect(r.change).toBe(150);
    expect(r.changePercent).toBe(100);
  });

  it('reports a zero percent change when the previous period was empty', () => {
    const r = calculateTrends([{ date: NOW, amount: 50 }], (i) => i.amount, 'week');
    expect(r.previous).toBe(0);
    expect(r.changePercent).toBe(0);
    expect(r.change).toBe(50);
  });

  it('rounds changePercent to two decimals', () => {
    const data = [
      { date: daysAgo(0), amount: 100 },
      { date: daysAgo(8), amount: 300 },
    ];
    const r = calculateTrends(data, (i) => i.amount, 'week');
    // (100-300)/300*100 = -66.666... -> -66.67
    expect(r.changePercent).toBe(-66.67);
  });

  it('ignores items with no date', () => {
    const r = calculateTrends(
      [{ amount: 999 } as any, { date: NOW, amount: 1 }],
      (i: any) => i.amount, 'week'
    );
    expect(r.current).toBe(1);
  });

  it('accepts ISO date strings as well as Date objects', () => {
    const r = calculateTrends(
      [{ date: NOW.toISOString(), amount: 7 }],
      (i) => i.amount, 'week'
    );
    expect(r.current).toBe(7);
  });

  it('returns zeroes for no data', () => {
    expect(calculateTrends([], () => 0, 'month')).toEqual({
      current: 0, previous: 0, change: 0, changePercent: 0,
    });
  });
});

describe('getFitnessInsights', () => {
  it('averages duration and counts this week only for frequency', () => {
    const i = getFitnessInsights([
      workout({ id: '1', type: 'cardio', date: daysAgo(0), durationMinutes: 30 }),
      workout({ id: '2', type: 'strength', date: daysAgo(1), durationMinutes: 45 }),
      workout({ id: '3', type: 'strength', date: daysAgo(40), durationMinutes: 90 }),
    ]);
    expect(i.totalWorkouts).toBe(3);
    expect(i.averageDuration).toBe(55); // (30+45+90)/3
    expect(i.workoutFrequency).toBe(2); // week runs Sun 13 Sep - Sat 19 Sep
    expect(i.mostCommonType).toBe('strength');
  });

  it('reports N/A and zeroes for no workouts', () => {
    const i = getFitnessInsights([]);
    expect(i.totalWorkouts).toBe(0);
    expect(i.averageDuration).toBe(0);
    expect(i.workoutFrequency).toBe(0);
    expect(i.mostCommonType).toBe('N/A');
    expect(i.strengthProgression).toBeUndefined();
  });

  it('reports strength progression using max weight per window', () => {
    const i = getFitnessInsights([
      workout({ id: '1', date: daysAgo(3), exercises: [{ name: 'Squat', weight: 100 }] as any }),
      workout({ id: '2', date: daysAgo(10), exercises: [{ name: 'Squat', weight: 110 }] as any }),
      workout({ id: '3', date: daysAgo(40), exercises: [{ name: 'Squat', weight: 80 }] as any }),
    ]);
    expect(i.strengthProgression).toEqual([
      { exercise: 'Squat', currentWeight: 110, previousWeight: 80 },
    ]);
  });

  it('omits progression when an exercise has no older baseline', () => {
    const i = getFitnessInsights([
      workout({ id: '1', date: daysAgo(2), exercises: [{ name: 'Bench', weight: 60 }] as any }),
    ]);
    expect(i.strengthProgression).toBeUndefined();
  });

  it('caps strength progression at five exercises', () => {
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
    const i = getFitnessInsights([
      workout({ id: '1', date: daysAgo(3), exercises: names.map(n => ({ name: n, weight: 50 })) as any }),
      workout({ id: '2', date: daysAgo(40), exercises: names.map(n => ({ name: n, weight: 40 })) as any }),
    ]);
    expect(i.strengthProgression).toHaveLength(5);
  });
});

describe('getHealthInsights', () => {
  it('averages calories per distinct day, not per entry', () => {
    const i = getHealthInsights([
      food({ id: '1', date: daysAgo(1), calories: 300 }),
      food({ id: '2', date: daysAgo(1), calories: 100 }),
      food({ id: '3', date: daysAgo(2), calories: 200 }),
    ], []);
    // 600 kcal over two distinct days
    expect(i.averageDailyCalories).toBe(300);
  });

  it('averages macros per entry and rounds to two decimals', () => {
    const i = getHealthInsights([
      food({ id: '1', date: daysAgo(1), protein: 10, carbs: 20, fats: 5 }),
      food({ id: '2', date: daysAgo(2), protein: 15, carbs: 25, fats: 10 }),
    ], []);
    expect(i.averageMacros).toEqual({ protein: 12.5, carbs: 22.5, fats: 7.5 });
  });

  it('reports mean sleep and its standard deviation', () => {
    const i = getHealthInsights([], [
      { id: '1', date: daysAgo(1), sleepHours: 6 } as DailyCheckIn,
      { id: '2', date: daysAgo(2), sleepHours: 8 } as DailyCheckIn,
    ]);
    expect(i.averageSleepHours).toBe(7);
    expect(i.sleepConsistency).toBe(1); // population sd of [6,8]
  });

  it('skips check-ins with no sleep recorded', () => {
    const i = getHealthInsights([], [
      { id: '1', date: daysAgo(1), sleepHours: 8 } as DailyCheckIn,
      { id: '2', date: daysAgo(2) } as DailyCheckIn,
    ]);
    expect(i.averageSleepHours).toBe(8);
    expect(i.sleepConsistency).toBe(0);
  });

  it('ignores data older than the 4-week window', () => {
    const i = getHealthInsights([food({ id: '1', date: daysAgo(60), calories: 999 })], []);
    expect(i.averageDailyCalories).toBe(0);
  });

  it('returns zeroes for no data', () => {
    expect(getHealthInsights([], [])).toEqual({
      averageDailyCalories: 0,
      averageMacros: { protein: 0, carbs: 0, fats: 0 },
      sleepConsistency: 0,
      averageSleepHours: 0,
    });
  });
});

describe('getWorkoutFrequencyData', () => {
  it('returns one bucket per week, oldest first', () => {
    const d = getWorkoutFrequencyData([], 4);
    expect(d).toHaveLength(4);
    expect(d.map(x => x.week)).toEqual(['Aug 23', 'Aug 30', 'Sep 06', 'Sep 13']);
  });

  it('counts workouts into their week', () => {
    const d = getWorkoutFrequencyData([
      workout({ id: '1', date: daysAgo(0) }),
      workout({ id: '2', date: daysAgo(1) }),
      workout({ id: '3', date: daysAgo(8) }),
    ], 4);
    expect(d[3]).toEqual({ week: 'Sep 13', count: 2 });
    expect(d[2]).toEqual({ week: 'Sep 06', count: 1 });
  });

  it('defaults to twelve weeks', () => {
    expect(getWorkoutFrequencyData([])).toHaveLength(12);
  });
});

describe('getCalorieTrendData', () => {
  it('returns one bucket per day, oldest first', () => {
    const d = getCalorieTrendData([], 3);
    expect(d).toHaveLength(3);
    expect(d.map(x => x.date)).toEqual(['Sep 14', 'Sep 15', 'Sep 16']);
  });

  it('sums calories into the right day', () => {
    const d = getCalorieTrendData([
      food({ id: '1', date: daysAgo(0), calories: 500 }),
      food({ id: '2', date: daysAgo(0), calories: 250 }),
      food({ id: '3', date: daysAgo(2), calories: 100 }),
    ], 3);
    expect(d).toEqual([
      { date: 'Sep 14', calories: 100 },
      { date: 'Sep 15', calories: 0 },
      { date: 'Sep 16', calories: 750 },
    ]);
  });

  it('defaults to thirty days', () => {
    expect(getCalorieTrendData([])).toHaveLength(30);
  });
});
