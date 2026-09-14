import { toLocalDateString } from '../../lib/dateRanges';
import { buildQuickLogPills } from '../HomeScreen';

/**
 * The quick-log grid's logged-today pills, pinned without rendering the screen (a
 * QueryClient left alive in a jest run hangs it — see HomeScreen.targets.test.ts).
 *
 * The pills are load-bearing, not decoration: sleep used to be a stat tile as well and is
 * now stated only here, and weight had no Expo affordance at all before this change.
 *
 * ON TIMEZONES, honestly. "Which entry is today's" is a date-boundary question, and the two
 * ways to get it wrong fail in OPPOSITE hemispheres:
 *
 *   - Deriving today from UTC (`new Date().toISOString().slice(0, 10)`) breaks in the small
 *     hours EAST of UTC. The boundary-hour cases below catch it wherever the suite runs east
 *     of UTC, which includes the machine this was written on (UTC+3).
 *   - Parsing the entry's `YYYY-MM-DD` with `new Date(...)` — UTC midnight — breaks WEST of
 *     UTC, which is the bug the web's `isSameDay(new Date(entry.date), new Date())` has. No
 *     assertion in a jest worker can catch that from an eastern zone, and TZ cannot be
 *     changed inside one: `process.env.TZ` set in a `beforeAll` is ignored, because the
 *     worker's zone is fixed when it spawns (verified — an earlier version of this file had
 *     a `describe.each` over four zones that asserted nothing at all).
 *
 * So this file pins what it can pin, and the west-of-UTC half is covered where it belongs:
 * `buildQuickLogPills` builds today with `toLocalDateString` and compares two `YYYY-MM-DD`
 * strings, constructing no `Date` from an API value, and `toLocalDateString`'s own
 * zone behaviour is pinned in `packages/shared/src/domain/__tests__/dates.test.ts`.
 */

/** Noon local on 14 September 2026 — built from local parts, so it is the 14th anywhere. */
const NOON = new Date(2026, 8, 14, 12, 0, 0);
const TODAY = '2026-09-14';

const entry = (date: string, weight: number) => ({ date, weight });

describe('buildQuickLogPills — sleep', () => {
  it("shows last night's hours once there are any", () => {
    expect(buildQuickLogPills(7.5, [], NOON).sleep).toBe('7.5h');
  });

  it('shows nothing when today has no check-in', () => {
    expect(buildQuickLogPills(null, [], NOON).sleep).toBeUndefined();
  });

  /** A check-in recording zero hours is not a night's sleep worth reporting back. */
  it('shows nothing for a zero-hour check-in', () => {
    expect(buildQuickLogPills(0, [], NOON).sleep).toBeUndefined();
  });
});

describe('buildQuickLogPills — weight', () => {
  it("shows today's weight once it is logged", () => {
    expect(buildQuickLogPills(null, [entry(TODAY, 82)], NOON).weight).toBe('82kg');
  });

  it('shows nothing when the newest reading is from another day', () => {
    expect(buildQuickLogPills(null, [entry('2026-09-13', 82)], NOON).weight).toBeUndefined();
  });

  it('shows nothing when nothing has ever been logged', () => {
    expect(buildQuickLogPills(null, [], NOON).weight).toBeUndefined();
  });

  it('reports the reading for today even when another row precedes it', () => {
    const entries = [entry('2026-09-20', 80), entry(TODAY, 82)];
    expect(buildQuickLogPills(null, entries, NOON).weight).toBe('82kg');
  });
});

/**
 * The two hours where a UTC-derived "today" is a different day from the local one. Which of
 * them actually differs depends on the sign of the running machine's offset, so both are
 * exercised and each asserts against the UTC day it computes for itself — the case is a real
 * one wherever this runs, and a no-op only in UTC exactly.
 */
describe('buildQuickLogPills — the local calendar day, not a UTC-derived one', () => {
  const utcDay = (d: Date) => d.toISOString().slice(0, 10);

  describe.each([
    ['just after local midnight', new Date(2026, 8, 14, 0, 5, 0)],
    ['late in the local evening', new Date(2026, 8, 14, 23, 55, 0)],
  ])('%s', (_label, now) => {
    it("finds the entry dated for the device's own calendar day", () => {
      expect(toLocalDateString(now)).toBe(TODAY);
      expect(buildQuickLogPills(null, [entry(TODAY, 82)], now).weight).toBe('82kg');
    });

    it('does not match the entry dated for the UTC day when the two differ', () => {
      const utc = utcDay(now);
      if (utc === TODAY) return; // This hour does not straddle the boundary in this zone.
      expect(buildQuickLogPills(null, [entry(utc, 79)], now).weight).toBeUndefined();
    });
  });
});
