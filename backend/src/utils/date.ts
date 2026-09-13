/**
 * Date helpers for `DATE` columns.
 *
 * Dates in this app are local calendar days (`YYYY-MM-DD`), never UTC instants —
 * see `agent-os/standards/global/domain-conventions`.
 *
 * node-postgres parses a PostgreSQL `DATE` into a JS `Date` at **local** midnight.
 * Calling `.toISOString()` on that converts to UTC, which rolls the day back for
 * every timezone ahead of UTC (UTC+1..UTC+14):
 *
 *   new Date('2026-09-12T00:00:00')  // local midnight in UTC+3
 *     .toISOString()                 // '2026-09-11T21:00:00.000Z'
 *     .slice(0, 10)                  // '2026-09-11'  <- wrong day
 *
 * So never render a DATE-derived Date with `.toISOString()`. Use `toDateString`.
 */

const pad = (n: number): string => String(n).padStart(2, '0');

/**
 * Render a `DATE` column value as a local calendar `YYYY-MM-DD` string.
 *
 * Accepts what `pg` may hand back for a DATE: a `Date` at local midnight, or an
 * already-formatted string when a type parser is in play. Non-Date values are
 * passed through unchanged, matching the previous `String(row.date)` behaviour.
 */
export function toDateString(value: unknown): string {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
  }
  return String(value);
}

/**
 * Shift a `YYYY-MM-DD` string by whole days, staying on the calendar.
 *
 * Uses UTC arithmetic internally so the result never depends on the host
 * timezone or on DST — the input and output are calendar days, not instants.
 */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`;
}
