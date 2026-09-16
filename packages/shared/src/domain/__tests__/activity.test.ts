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

  it('returns nothing for a limit of zero', () => {
    expect(buildRecentActivity([food()], [workout()], 0)).toEqual([]);
  });

  /**
   * The selection keeps the top five by walking each source once rather than sorting both
   * whole histories. These pin the order it has to produce whatever route it takes there.
   */
  describe('ordering', () => {
    it('is stable across sources: food logged at the same instant stays ahead', () => {
      const sameInstant = at(14, 9);
      const items = buildRecentActivity(
        [food({ id: 'f1', date: sameInstant })],
        [workout({ id: 'w1', date: sameInstant })]
      );

      expect(items.map((i) => i.id)).toEqual(['f1', 'w1']);
    });

    it('is stable within a source: equal dates keep their original order', () => {
      const sameInstant = at(14, 9);
      const items = buildRecentActivity(
        [
          food({ id: 'f1', date: sameInstant }),
          food({ id: 'f2', date: sameInstant }),
          food({ id: 'f3', date: sameInstant }),
        ],
        []
      );

      expect(items.map((i) => i.id)).toEqual(['f1', 'f2', 'f3']);
    });

    it('displaces the oldest incumbent once the list is full', () => {
      const items = buildRecentActivity(
        [1, 2, 3, 4, 5].map((day) => food({ id: `f${day}`, date: at(day) })),
        [workout({ id: 'w-new', date: at(30) })]
      );

      expect(items.map((i) => i.id)).toEqual(['w-new', 'f5', 'f4', 'f3', 'f2']);
    });

    it('leaves a full list alone when a newly scanned row is older than all of it', () => {
      const items = buildRecentActivity(
        [10, 11, 12, 13, 14].map((day) => food({ id: `f${day}`, date: at(day) })),
        [workout({ id: 'w-old', date: at(1) })]
      );

      expect(items.map((i) => i.id)).toEqual(['f14', 'f13', 'f12', 'f11', 'f10']);
    });

    it('inserts into the middle of a partly filled list', () => {
      const items = buildRecentActivity(
        [food({ id: 'f-late', date: at(20) }), food({ id: 'f-early', date: at(2) })],
        [workout({ id: 'w-mid', date: at(10) })]
      );

      expect(items.map((i) => i.id)).toEqual(['f-late', 'w-mid', 'f-early']);
    });

    /**
     * The selection is hand-rolled, so this pins it against the obvious implementation it
     * replaced — map both sources, stable-sort by date descending, take the first `limit`.
     * Randomised inputs with a fixed seed: reproducible, and it covers the interleavings the
     * hand-written cases above would never think to try (heavy ties, one empty source,
     * limits above and below the input size).
     */
    it('agrees with a full stable sort on 500 random inputs', () => {
      // xorshift32 — a seeded PRNG, so a failure is reproducible rather than a Heisenbug.
      let seed = 0x2026_0914;
      const rand = (n: number) => {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        return Math.abs(seed) % n;
      };

      const reference = (
        f: RecentActivityFoodSource[],
        w: RecentActivityWorkoutSource[],
        limit: number
      ) =>
        [
          ...f.map((x) => ({ id: x.id, t: x.date.getTime() })),
          ...w.map((x) => ({ id: x.id, t: x.date.getTime() })),
        ]
          .sort((a, b) => b.t - a.t) // Array.prototype.sort is stable per spec.
          .slice(0, Math.max(0, limit))
          .map((x) => x.id);

      for (let round = 0; round < 500; round += 1) {
        // Days drawn from a small pool so ties are common, which is where order is subtle.
        const foods = Array.from({ length: rand(9) }, (_, i) =>
          food({ id: `f${i}`, date: at(1 + rand(4)) })
        );
        const outs = Array.from({ length: rand(9) }, (_, i) =>
          workout({ id: `w${i}`, date: at(1 + rand(4)) })
        );
        const limit = rand(8);

        expect(buildRecentActivity(foods, outs, limit).map((i) => i.id)).toEqual(
          reference(foods, outs, limit)
        );
      }
    });

    it('still sorts rows with invalid dates last when the list is over capacity', () => {
      const bad = new Date('nonsense');
      const items = buildRecentActivity(
        [
          food({ id: 'bad1', date: bad }),
          food({ id: 'bad2', date: bad }),
          food({ id: 'good1', date: at(5) }),
          food({ id: 'good2', date: at(6) }),
          food({ id: 'good3', date: at(7) }),
          food({ id: 'good4', date: at(8) }),
        ],
        []
      );

      expect(items.map((i) => i.id)).toEqual(['good4', 'good3', 'good2', 'good1', 'bad1']);
    });
  });
});

describe('exerciseCountLabel', () => {
  it('pluralises everything but one', () => {
    expect(exerciseCountLabel(0)).toBe('0 exercises');
    expect(exerciseCountLabel(1)).toBe('1 exercise');
    expect(exerciseCountLabel(2)).toBe('2 exercises');
  });
});
