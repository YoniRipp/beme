/**
 * Cycle-tracking arithmetic, shared by both clients so the two cards cannot disagree about
 * what day of the cycle it is.
 *
 * Written on the Expo side first (#307) and moved here when the web was fixed to match. The
 * mobile hook's docstring carried the reasoning for both clients, which is a sign it belonged
 * in neither of them.
 */
import { differenceInCalendarDays } from 'date-fns';
import { parseLocalDateString } from './dates';

/**
 * How far back a cycle card looks.
 *
 * `backend/src/controllers/cycle.ts` takes a date window and **no pagination**, so a window is
 * the only bound available — there is no `{ limit, offset }` to fall back on the way the
 * weight endpoint has one.
 *
 * 180 days is roughly six cycles at the 28-day default: long enough that a real gap in
 * logging still finds the last period start, short enough to stay bounded for an account that
 * has logged for years.
 *
 * The window is not only about bytes. Reading everything makes `currentCycleDay` count from
 * whatever the oldest surviving period start is, so an account that logged once and stopped
 * was told it was on "Day 214 of ~28", with a full progress ring. Outside the window the card
 * says "no cycle data yet", which is the honest answer.
 */
export const CYCLE_WINDOW_DAYS = 180;

/**
 * Which day of the cycle `now` is, counting the period-start day as day 1.
 *
 * **Calendar days, not elapsed 24-hour blocks.** The web used to divide a millisecond
 * difference by 86_400_000, which is off by one across a daylight-saving boundary — the
 * 23-hour day floors down and the whole count shifts. It also parsed the API's `YYYY-MM-DD`
 * with `new Date(...)`, which reads a bare date string as UTC midnight and lands on the
 * previous local day anywhere west of UTC. `parseLocalDateString` is this repo's answer to
 * both.
 *
 * Returns `null` for no period start, an unparseable date, or a start in the future — a
 * "Day 0" or a negative day is not a thing a card can render.
 */
export function cycleDayFrom(periodStartDate: string | null, now: Date): number | null {
  if (!periodStartDate) return null;
  const start = parseLocalDateString(periodStartDate);
  if (Number.isNaN(start.getTime())) return null;
  const day = differenceInCalendarDays(now, start) + 1;
  return day >= 1 ? day : null;
}
