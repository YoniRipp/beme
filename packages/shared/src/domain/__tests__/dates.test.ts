import { describe, it, expect } from 'vitest';
import {
  toLocalDateString,
  parseLocalDateString,
  WEEK_SUNDAY,
  getPeriodRange,
  getTrendPeriodBounds,
} from '../dates';

describe('toLocalDateString', () => {
  it('formats from local calendar parts, not UTC', () => {
    // 00:30 local on the 12th is still the 11th in UTC for any zone ahead of it.
    expect(toLocalDateString(new Date(2026, 8, 12, 0, 30))).toBe('2026-09-12');
  });

  it('stays on the local day late at night, when UTC has already rolled over', () => {
    // 23:30 local on the 12th is the 13th in UTC for any zone behind it.
    expect(toLocalDateString(new Date(2026, 8, 12, 23, 30))).toBe('2026-09-12');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });

  it('formats a leap day', () => {
    expect(toLocalDateString(new Date(2024, 1, 29, 13, 45))).toBe('2024-02-29');
  });
});

describe('parseLocalDateString', () => {
  it('round trips with toLocalDateString', () => {
    expect(toLocalDateString(parseLocalDateString('2026-09-12'))).toBe('2026-09-12');
  });

  it('parses to local midnight, not UTC midnight', () => {
    const d = parseLocalDateString('2026-09-12');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it('round trips every day of a month without drifting', () => {
    for (let day = 1; day <= 31; day++) {
      const s = `2026-03-${String(day).padStart(2, '0')}`;
      expect(toLocalDateString(parseLocalDateString(s))).toBe(s);
    }
  });

  it('falls back to Date parsing when a part is not a number', () => {
    // Preserves the clients' existing guard rather than producing an off-by-one date.
    const d = parseLocalDateString('not-a-date');
    expect(Number.isNaN(d.getTime())).toBe(true);
  });
});

describe('WEEK_SUNDAY', () => {
  it('starts the week on Sunday', () => {
    expect(WEEK_SUNDAY.weekStartsOn).toBe(0);
  });
});

describe('getPeriodRange', () => {
  const ref = new Date(2026, 8, 16, 14, 30); // Wednesday 16 Sep 2026

  it('brackets the reference day', () => {
    const { start, end } = getPeriodRange('daily', ref);
    expect(toLocalDateString(start)).toBe('2026-09-16');
    expect(start.getHours()).toBe(0);
    expect(toLocalDateString(end)).toBe('2026-09-16');
    expect(end.getHours()).toBe(23);
  });

  it('runs the week Sunday to Saturday', () => {
    const { start, end } = getPeriodRange('weekly', ref);
    expect(start.getDay()).toBe(0);
    expect(end.getDay()).toBe(6);
    expect(toLocalDateString(start)).toBe('2026-09-13');
    expect(toLocalDateString(end)).toBe('2026-09-19');
  });

  it('brackets the calendar month', () => {
    const { start, end } = getPeriodRange('monthly', ref);
    expect(toLocalDateString(start)).toBe('2026-09-01');
    expect(toLocalDateString(end)).toBe('2026-09-30');
  });

  it('brackets the calendar year', () => {
    const { start, end } = getPeriodRange('yearly', ref);
    expect(toLocalDateString(start)).toBe('2026-01-01');
    expect(toLocalDateString(end)).toBe('2026-12-31');
  });
});

describe('getTrendPeriodBounds', () => {
  const ref = new Date(2026, 8, 16, 14, 30); // Wednesday 16 Sep 2026

  it('pairs this week with the one before it', () => {
    const b = getTrendPeriodBounds('week', ref);
    expect(toLocalDateString(b.currentStart)).toBe('2026-09-13');
    expect(toLocalDateString(b.currentEnd)).toBe('2026-09-19');
    expect(toLocalDateString(b.previousStart)).toBe('2026-09-06');
    expect(toLocalDateString(b.previousEnd)).toBe('2026-09-12');
  });

  it('pairs this month with the one before it', () => {
    const b = getTrendPeriodBounds('month', ref);
    expect(toLocalDateString(b.currentStart)).toBe('2026-09-01');
    expect(toLocalDateString(b.currentEnd)).toBe('2026-09-30');
    expect(toLocalDateString(b.previousStart)).toBe('2026-08-01');
    expect(toLocalDateString(b.previousEnd)).toBe('2026-08-31');
  });

  it('pairs this year with the one before it', () => {
    const b = getTrendPeriodBounds('year', ref);
    expect(toLocalDateString(b.currentStart)).toBe('2026-01-01');
    expect(toLocalDateString(b.currentEnd)).toBe('2026-12-31');
    expect(toLocalDateString(b.previousStart)).toBe('2025-01-01');
    expect(toLocalDateString(b.previousEnd)).toBe('2025-12-31');
  });

  it('leaves no gap between the previous period and the current one', () => {
    const b = getTrendPeriodBounds('week', ref);
    expect(b.previousEnd.getTime()).toBeLessThan(b.currentStart.getTime());
    expect(b.currentStart.getTime() - b.previousEnd.getTime()).toBeLessThan(1000);
  });
});
