import { describe, it, expect, afterAll } from 'vitest';
import { isSameDay } from 'date-fns';
import { isOnLocalDay, parseLocalDateString } from '../dates';

/**
 * The zones matter here, and UTC is the one that hides the bug.
 *
 * `isSameDay(new Date('2026-09-16'), now)` — the spelling this helper replaces — parses the
 * string as UTC midnight. East of UTC that still lands on the right local day, and in UTC it
 * is exact, so a test written without setting TZ passes against the broken version. The cases
 * below assert the disagreement explicitly, the way `cycle.test.ts` does.
 */
const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

/** What the two web call sites did before this helper existed. */
const naiveSameDay = (apiDate: string, day: Date) => isSameDay(new Date(apiDate), day);

describe('isOnLocalDay', () => {
  it('matches the same calendar day', () => {
    expect(isOnLocalDay('2026-09-16', new Date(2026, 8, 16, 14, 0))).toBe(true);
  });

  it('does not match a neighbouring day', () => {
    expect(isOnLocalDay('2026-09-15', new Date(2026, 8, 16, 0, 5))).toBe(false);
    expect(isOnLocalDay('2026-09-17', new Date(2026, 8, 16, 23, 55))).toBe(false);
  });

  it('treats a missing date as no match rather than throwing', () => {
    expect(isOnLocalDay(null, new Date())).toBe(false);
    expect(isOnLocalDay(undefined, new Date())).toBe(false);
    expect(isOnLocalDay('', new Date())).toBe(false);
  });

  it.each([
    ['America/New_York', 16, 9],
    ['America/Los_Angeles', 16, 9],
    ['America/Sao_Paulo', 16, 9],
  ] as const)(
    'in %s says yes on the day the entry is dated, where the old spelling said no',
    (tz, dayOfMonth, hour) => {
      process.env.TZ = tz;
      // Built after the assignment: a Date in the table above is made in the runner's zone.
      const now = new Date(2026, 8, dayOfMonth, hour, 0);

      expect(isOnLocalDay('2026-09-16', now)).toBe(true);
      // The point of the case. Without this the assertion above passes against the bug.
      expect(naiveSameDay('2026-09-16', now)).toBe(false);
    }
  );

  it('is unaffected by the time of day', () => {
    process.env.TZ = 'America/New_York';
    for (const hour of [0, 6, 12, 18, 23]) {
      expect(isOnLocalDay('2026-09-16', new Date(2026, 8, 16, hour, 30))).toBe(true);
    }
  });
});

/**
 * The mechanism behind a bug both clients share, pinned here because it is invisible at the
 * call site.
 *
 * `food_entries.date` is a Postgres `DATE` — no time of day — and the mappers turn it into a
 * local midnight. So `entry.date.getHours()` is always `0`, and both clients' meal inference
 * has a branch reading "otherwise infer the meal from the entry date" that can only ever
 * return breakfast. See `docs/HANDOFF.md`, "Needs the owner".
 */
describe('parseLocalDateString carries no time of day', () => {
  it.each(['UTC', 'America/New_York', 'Asia/Jerusalem'])('is local midnight in %s', (tz) => {
    process.env.TZ = tz;
    const parsed = parseLocalDateString('2026-09-16');

    expect(parsed.getHours()).toBe(0);
    expect(parsed.getMinutes()).toBe(0);
  });
});
