import { describe, it, expect } from 'vitest';
import {
  buildRecentActivity,
  exerciseCountLabel,
  RECENT_ACTIVITY_LIMIT,
  type RecentActivityFoodSource,
  type RecentActivityWorkoutSource,
} from '../activity';

const at = (day: number, hour = 12) => new Date(2026, 8, day, hour, 0, 0);

const food = (over: Partial<RecentActivityFoodSource> = {}): RecentActivityFoodSource => ({
  id: 'f',
  name: 'Chicken',
  calories: 330,
  date: at(14),
  ...over,
});

const workout = (over: Partial<RecentActivityWorkoutSource> = {}): RecentActivityWorkoutSource => ({
  id: 'w',
  title: 'Push Day',
  exercises: [{}, {}, {}, {}],
  date: at(14),
  ...over,
});

describe('buildRecentActivity', () => {
  it('interleaves food and workouts by date, newest first', () => {
    const items = buildRecentActivity(
      [food({ id: 'f1', date: at(10) }), food({ id: 'f2', date: at(14) })],
      [workout({ id: 'w1', date: at(12) })]
    );

    expect(items.map((i) => i.id)).toEqual(['f2', 'w1', 'f1']);
  });

  it('takes the five newest, not the first five', () => {
    const entries = [3, 1, 6, 2, 5, 4, 7].map((day) => food({ id: `f${day}`, date: at(day) }));

    const items = buildRecentActivity(entries, []);

    expect(items).toHaveLength(RECENT_ACTIVITY_LIMIT);
    expect(items.map((i) => i.id)).toEqual(['f7', 'f6', 'f5', 'f4', 'f3']);
  });

  /**
   * The reason this sorts rather than slicing a prefix. `useEnergy.addFoodEntry` writes the
   * cache with `[...prev, created]`, so the entry the user just logged is LAST in the array
   * even though it is the newest. A prefix-based merge hid it behind five older rows.
   */
  it("surfaces an entry appended to the end of the cache, which is where a just-logged one lands", () => {
    const older = [9, 8, 7, 6, 5].map((day) => food({ id: `f${day}`, date: at(day) }));
    const justLogged = food({ id: 'new', date: at(15) });

    const items = buildRecentActivity([...older, justLogged], []);

    expect(items[0].id).toBe('new');
  });

  it("labels food with its calories and a workout with its exercise count", () => {
    const items = buildRecentActivity(
      [food({ id: 'f1', name: 'Oats', calories: 210, date: at(14) })],
      [workout({ id: 'w1', title: 'Legs', exercises: [{}], date: at(13) })]
    );

    expect(items[0]).toMatchObject({ type: 'food', name: 'Oats', detail: '210 cal' });
    expect(items[1]).toMatchObject({ type: 'workout', name: 'Legs', detail: '1 exercise' });
  });

  it('returns an empty list when neither source has anything', () => {
    expect(buildRecentActivity([], [])).toEqual([]);
  });

  it('sorts a row with an invalid date last instead of scrambling the order', () => {
    const items = buildRecentActivity(
      [food({ id: 'bad', date: new Date('nonsense') }), food({ id: 'good', date: at(3) })],
      []
    );

    expect(items.map((i) => i.id)).toEqual(['good', 'bad']);
  });

  it('honours an explicit limit', () => {
    const entries = [1, 2, 3].map((day) => food({ id: `f${day}`, date: at(day) }));

    expect(buildRecentActivity(entries, [], 2).map((i) => i.id)).toEqual(['f3', 'f2']);
  });
});

describe('exerciseCountLabel', () => {
  it('pluralises everything but one', () => {
    expect(exerciseCountLabel(0)).toBe('0 exercises');
    expect(exerciseCountLabel(1)).toBe('1 exercise');
    expect(exerciseCountLabel(2)).toBe('2 exercises');
  });
});
