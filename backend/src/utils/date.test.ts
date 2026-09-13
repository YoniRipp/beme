import { describe, it, expect, afterAll } from 'vitest';
import { toDateString, addDays } from './date.js';

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  // TZ is usually unset (CI included). Assigning `undefined` back would store the
  // literal string "undefined", which Node resolves to UTC rather than the host zone.
  if (ORIGINAL_TZ === undefined) delete process.env.TZ;
  else process.env.TZ = ORIGINAL_TZ;
});

/** What node-postgres hands back for a DATE: a Date at local midnight. */
const pgDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// UTC+3 and UTC+14 are the cases `.toISOString()` got wrong; UTC-5 and UTC are
// where it happened to be right — the helper has to hold in all of them.
const ZONES = ['Asia/Jerusalem', 'Pacific/Kiritimati', 'UTC', 'America/New_York'];

describe('toDateString', () => {
  for (const tz of ZONES) {
    it(`renders a DATE as its stored calendar day in ${tz}`, () => {
      process.env.TZ = tz;
      for (const day of ['2026-09-12', '2026-01-01', '2026-12-31', '2026-02-28']) {
        expect(toDateString(pgDate(day))).toBe(day);
      }
    });
  }

  it('passes a string through unchanged', () => {
    process.env.TZ = 'Asia/Jerusalem';
    expect(toDateString('2026-09-12')).toBe('2026-09-12');
  });

  it('does not throw on an invalid Date the way toISOString does', () => {
    expect(() => toDateString(new Date('nonsense'))).not.toThrow();
  });
});

describe('addDays', () => {
  for (const tz of ZONES) {
    it(`shifts calendar days without a timezone drift in ${tz}`, () => {
      process.env.TZ = tz;
      expect(addDays('2026-09-12', -1)).toBe('2026-09-11');
      expect(addDays('2026-09-12', 1)).toBe('2026-09-13');
      // Month, year and leap-year boundaries.
      expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
      expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
      expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });
  }

  it('is stable across a DST transition', () => {
    // Israel springs forward on 2026-03-27 and back on 2026-10-25.
    process.env.TZ = 'Asia/Jerusalem';
    expect(addDays('2026-03-27', 1)).toBe('2026-03-28');
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    expect(addDays('2026-03-28', -1)).toBe('2026-03-27');
  });
});
