import { describe, it, expect, afterAll } from 'vitest';
import { cycleDayFrom, CYCLE_WINDOW_DAYS } from '../cycle';

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  // Assigning `undefined` back would store the literal string "undefined", which Node reads
  // as UTC rather than the host zone — the same note `backend/src/utils/date.test.ts` carries.
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

/** What the web did before this module existed: UTC-parse the date, divide milliseconds. */
const naiveDayCount = (start: string, now: Date) =>
  Math.floor((now.getTime() - new Date(start).getTime()) / 86_400_000) + 1;

/**
 * The two things this arithmetic got wrong on the web, pinned so neither comes back.
 *
 * Both were found by #307 while building the Expo card against the same endpoint: the day
 * count divided milliseconds by 86_400_000 and parsed `YYYY-MM-DD` as UTC midnight, and the
 * unbounded read let the count run off the end of a cycle entirely.
 */
describe('cycleDayFrom', () => {
  it('counts the period-start day as day 1', () => {
    expect(cycleDayFrom('2026-09-16', new Date(2026, 8, 16, 9, 0))).toBe(1);
    expect(cycleDayFrom('2026-09-16', new Date(2026, 8, 17, 9, 0))).toBe(2);
    expect(cycleDayFrom('2026-09-01', new Date(2026, 8, 16, 9, 0))).toBe(16);
  });

  it('counts calendar days, not elapsed 24-hour blocks', () => {
    expect(cycleDayFrom('2026-09-16', new Date(2026, 8, 16, 23, 30))).toBe(1);
    expect(cycleDayFrom('2026-09-16', new Date(2026, 8, 17, 7, 30))).toBe(2);
  });

  /**
   * The timezone cases, run in zones where the old arithmetic actually breaks.
   *
   * **UTC is one of the few zones where it does not**, and UTC is what the test runner uses by
   * default — so a case written without setting TZ passes against both implementations and
   * proves nothing. That was the first draft of this test, and it let a deliberate revert to
   * the old formula go green.
   */
  it.each([
    // zone,              start,        local now [h, min],  correct, naive
    ['America/New_York', '2026-09-16', [16, 23, 30], 1, 2],
    ['Asia/Jerusalem', '2026-09-16', [16, 0, 30], 1, 0],
    ['Pacific/Kiritimati', '2026-09-16', [16, 0, 30], 1, 0],
    ['Pacific/Kiritimati', '2026-09-15', [16, 7, 30], 2, 1],
  ] as const)('in %s reads the date as local, where the old formula did not', (tz, start, [day, hour, minute], correct, naive) => {
    process.env.TZ = tz;
    // Built AFTER the assignment: a `new Date(...)` in the table above is evaluated at module
    // load, in the runner's own zone, so the zone under test would never reach it.
    const now = new Date(2026, 8, day, hour, minute);

    expect(cycleDayFrom(start, now)).toBe(correct);
    // The point of the case: the two genuinely disagree here. Without this the assertion
    // above would pass against the implementation it was written to replace.
    expect(naiveDayCount(start, now)).toBe(naive);
    expect(naive).not.toBe(correct);
  });

  it('returns null when there is nothing to count from', () => {
    expect(cycleDayFrom(null, new Date())).toBeNull();
    expect(cycleDayFrom('not-a-date', new Date())).toBeNull();
  });

  it('returns null rather than a zero or negative day for a future start', () => {
    expect(cycleDayFrom('2026-09-20', new Date(2026, 8, 16))).toBeNull();
  });

  it('still counts past the cycle length — the window is what bounds it, not this', () => {
    // Deliberate: this function does not know about cycle length. What stops "Day 214" is the
    // query window, so that division of responsibility is pinned here.
    expect(cycleDayFrom('2026-01-01', new Date(2026, 8, 16))).toBe(259);
  });
});

describe('CYCLE_WINDOW_DAYS', () => {
  it('covers several cycles at the 28-day default', () => {
    // Long enough that a gap in logging still finds the last period start.
    expect(CYCLE_WINDOW_DAYS / 28).toBeGreaterThanOrEqual(6);
  });

  it('is short enough that a long-lived account stays bounded', () => {
    expect(CYCLE_WINDOW_DAYS).toBeLessThan(365);
  });
});
