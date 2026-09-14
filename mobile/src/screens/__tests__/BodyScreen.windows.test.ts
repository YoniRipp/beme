import {
  EARLIER_PAGE_SIZE,
  WORKOUT_FILTERS,
  dayStripIndex,
  dayStripLabel,
  groupWorkoutsByDate,
  hasWorkoutByDay,
  splitWorkoutsIntoWindows,
  weeklyWorkoutTarget,
} from '../BodyScreen';
import type { Workout } from '../../types/workout';

/**
 * BodyScreen bucketed workouts into `thisWeek` (inside the current week) and `older`
 * (before it) and nothing else, so a workout dated AFTER this week matched no bucket and
 * rendered in no section — fetched, counted nowhere, invisible. The empty state did not
 * catch it either, because that branch tested the filtered list rather than what had
 * actually been rendered.
 *
 * These pin the four-window split that fixes it, plus the day grouping, the day strip and
 * the goal target. Pure functions, exported from the screen module and exercised without
 * rendering it — a React Query client left over in a test leaves a notifyManager batch
 * timer that outlives the run and hangs jest (see hooks/useWorkouts.ts's
 * buildWorkoutUpdateBody for the same reasoning).
 */

// Wednesday 16 September 2026, 12:00 local. Its Sunday→Saturday week (per
// global/domain-conventions.md) is 13–19 September; the week before is 6–12 September.
const NOW = new Date(2026, 8, 16, 12, 0, 0);

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(NOW); });
afterEach(() => { jest.useRealTimers(); });

const workout = (id: string, date: Date, over: Partial<Workout> = {}): Workout => ({
  id,
  date,
  title: `Workout ${id}`,
  type: 'strength',
  durationMinutes: 45,
  exercises: [],
  completed: false,
  ...over,
});

describe('splitWorkoutsIntoWindows', () => {
  it('puts a future-dated workout in Upcoming instead of dropping it', () => {
    const nextWeek = workout('future', new Date(2026, 8, 22)); // Tuesday next week
    const windows = splitWorkoutsIntoWindows([nextWeek], NOW);

    expect(windows.upcoming.map((w) => w.id)).toEqual(['future']);
    expect(windows.thisWeek).toEqual([]);
    expect(windows.lastWeek).toEqual([]);
    expect(windows.earlier).toEqual([]);
  });

  it('claims every workout in exactly one window, across the whole timeline', () => {
    const all = [
      workout('far-future', new Date(2027, 0, 1)),
      workout('next-week', new Date(2026, 8, 22)),
      workout('tomorrow', new Date(2026, 8, 17)),
      workout('today', new Date(2026, 8, 16)),
      workout('week-start-sunday', new Date(2026, 8, 13)),
      workout('last-week-saturday', new Date(2026, 8, 12)),
      workout('last-week-sunday', new Date(2026, 8, 6)),
      workout('earlier', new Date(2026, 8, 5)),
      workout('last-year', new Date(2025, 10, 2)),
    ];
    const w = splitWorkoutsIntoWindows(all, NOW);
    const claimed = [...w.upcoming, ...w.thisWeek, ...w.lastWeek, ...w.earlier].map((x) => x.id);

    expect(claimed.sort()).toEqual(all.map((x) => x.id).sort());
    expect(new Set(claimed).size).toBe(all.length);
  });

  it('treats Sunday as the first day of the current week, not the end of the last one', () => {
    const sunday = workout('sunday', new Date(2026, 8, 13));
    const w = splitWorkoutsIntoWindows([sunday], NOW);

    expect(w.thisWeek.map((x) => x.id)).toEqual(['sunday']);
    expect(w.lastWeek).toEqual([]);
  });

  it('separates last week from earlier at the previous Sunday', () => {
    const w = splitWorkoutsIntoWindows(
      [
        workout('prev-sunday', new Date(2026, 8, 6)),
        workout('day-before', new Date(2026, 8, 5)),
      ],
      NOW
    );

    expect(w.lastWeek.map((x) => x.id)).toEqual(['prev-sunday']);
    expect(w.earlier.map((x) => x.id)).toEqual(['day-before']);
  });

  it('orders upcoming soonest-first and every other window newest-first', () => {
    const w = splitWorkoutsIntoWindows(
      [
        workout('u-late', new Date(2026, 8, 30)),
        workout('u-soon', new Date(2026, 8, 21)),
        workout('t-mon', new Date(2026, 8, 14)),
        workout('t-wed', new Date(2026, 8, 16)),
        workout('e-old', new Date(2026, 0, 2)),
        workout('e-newer', new Date(2026, 5, 2)),
      ],
      NOW
    );

    expect(w.upcoming.map((x) => x.id)).toEqual(['u-soon', 'u-late']);
    expect(w.thisWeek.map((x) => x.id)).toEqual(['t-wed', 't-mon']);
    expect(w.earlier.map((x) => x.id)).toEqual(['e-newer', 'e-old']);
  });

  it('does not mutate or reorder the caller\'s array', () => {
    const list = [workout('a', new Date(2026, 8, 14)), workout('b', new Date(2026, 8, 16))];
    splitWorkoutsIntoWindows(list, NOW);
    expect(list.map((x) => x.id)).toEqual(['a', 'b']);
  });
});

describe('groupWorkoutsByDate', () => {
  it('labels today and yesterday by name', () => {
    const groups = groupWorkoutsByDate([
      workout('today', new Date(2026, 8, 16)),
      workout('yesterday', new Date(2026, 8, 15)),
    ]);

    expect(groups.map((g) => g.label)).toEqual(['Today', 'Yesterday']);
  });

  it('labels an older day in the current year without the year', () => {
    const [group] = groupWorkoutsByDate([workout('mon', new Date(2026, 8, 14))]);
    expect(group.label).toBe('Monday, Sep 14');
    expect(group.date).toBe('2026-09-14');
  });

  it('appends the year once the day falls outside the current one', () => {
    const [group] = groupWorkoutsByDate([workout('old', new Date(2025, 10, 2))]);
    expect(group.label).toBe('Sunday, Nov 2, 2025');
  });

  it('collapses several workouts on one day into a single group', () => {
    const groups = groupWorkoutsByDate([
      workout('am', new Date(2026, 8, 14)),
      workout('pm', new Date(2026, 8, 14)),
    ]);

    expect(groups).toHaveLength(1);
    expect(groups[0].workouts.map((w) => w.id)).toEqual(['am', 'pm']);
  });

  it('orders days newest-first by default and oldest-first when ascending', () => {
    const list = [
      workout('a', new Date(2026, 8, 14)),
      workout('b', new Date(2026, 8, 16)),
    ];

    expect(groupWorkoutsByDate(list).map((g) => g.date)).toEqual(['2026-09-16', '2026-09-14']);
    expect(groupWorkoutsByDate(list, true).map((g) => g.date)).toEqual(['2026-09-14', '2026-09-16']);
  });
});

describe('Earlier paging', () => {
  it('reveals ten at a time', () => {
    const earlier = Array.from({ length: 25 }, (_, i) =>
      workout(`e${i}`, new Date(2026, 7, 1 + (i % 28)))
    );
    const { earlier: bucket } = splitWorkoutsIntoWindows(earlier, NOW);

    expect(EARLIER_PAGE_SIZE).toBe(10);
    expect(bucket).toHaveLength(25);
    expect(bucket.slice(0, EARLIER_PAGE_SIZE)).toHaveLength(10);
    expect(bucket.slice(0, EARLIER_PAGE_SIZE * 2)).toHaveLength(20);
    expect(bucket.slice(0, EARLIER_PAGE_SIZE * 3)).toHaveLength(25);
  });
});

describe('day strip', () => {
  it('maps a Monday-first index off date-fns\' Sunday-first getDay()', () => {
    expect(dayStripIndex(new Date(2026, 8, 14))).toBe(0); // Monday
    expect(dayStripIndex(new Date(2026, 8, 16))).toBe(2); // Wednesday
    expect(dayStripIndex(new Date(2026, 8, 19))).toBe(5); // Saturday
    expect(dayStripIndex(new Date(2026, 8, 13))).toBe(6); // Sunday
  });

  it('flags only the days of the current week that logged a workout', () => {
    const flags = hasWorkoutByDay(
      [
        workout('sun', new Date(2026, 8, 13)),
        workout('wed', new Date(2026, 8, 16)),
        workout('last-week', new Date(2026, 8, 9)),
        workout('next-week', new Date(2026, 8, 23)),
      ],
      NOW
    );

    expect(flags).toEqual([false, false, true, false, false, false, true]);
  });

  it('reads as a sentence, since the tick is the only visual cue', () => {
    expect(dayStripLabel('Wednesday', true, true)).toBe('Wednesday (today): workout logged');
    expect(dayStripLabel('Thursday', false, false)).toBe('Thursday: no workout');
  });
});

describe('weeklyWorkoutTarget', () => {
  // The web hardcodes 4 regardless of what the user set (shape.md open question #1);
  // Expo reads the real goal, as HomeScreen already does. Do not regress this to a literal.
  it('reads the user\'s weekly workouts goal', () => {
    expect(weeklyWorkoutTarget([{ type: 'workouts', period: 'weekly', target: 6 }])).toBe(6);
  });

  it('falls back to 4 with no weekly workouts goal set', () => {
    expect(weeklyWorkoutTarget([])).toBe(4);
    expect(weeklyWorkoutTarget([{ type: 'workouts', period: 'monthly', target: 20 }])).toBe(4);
    expect(weeklyWorkoutTarget([{ type: 'calories', period: 'weekly', target: 14000 }])).toBe(4);
  });

  it('falls back to 4 rather than showing a 0-target ring', () => {
    expect(weeklyWorkoutTarget([{ type: 'workouts', period: 'weekly', target: 0 }])).toBe(4);
  });
});

describe('filter chips', () => {
  // Expo's form already creates flexibility workouts; the list could never filter for one.
  it('offers Flexibility alongside All, Strength and Cardio', () => {
    expect(WORKOUT_FILTERS.map((f) => f.value)).toEqual(['all', 'strength', 'cardio', 'flexibility']);
    expect(WORKOUT_FILTERS.map((f) => f.label)).toEqual(['All', 'Strength', 'Cardio', 'Flexibility']);
  });

  // shape.md open question #2 — adding a Sports chip changes the web too, so it is the
  // owner's call, not this port's.
  it('does not add a Sports chip', () => {
    expect(WORKOUT_FILTERS.map((f) => f.value)).not.toContain('sports');
  });
});
