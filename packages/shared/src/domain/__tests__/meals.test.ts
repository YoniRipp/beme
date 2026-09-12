import { describe, it, expect } from 'vitest';
import { inferMealTypeFromHour } from '../meals';

describe('inferMealTypeFromHour', () => {
  it('buckets the day into four meals', () => {
    expect(inferMealTypeFromHour(8)).toBe('breakfast');
    expect(inferMealTypeFromHour(13)).toBe('lunch');
    expect(inferMealTypeFromHour(19)).toBe('dinner');
    // 23:00 is 'dinner', not 'snack' -- 'snack' is the afternoon gap on the live web
    // client (see frontend/src/features/energy/mealType.ts), and users' historical
    // entries were bucketed by exactly these cut-offs.
    expect(inferMealTypeFromHour(23)).toBe('dinner');
  });

  it('is total over every valid hour', () => {
    for (let h = 0; h < 24; h++) {
      expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(inferMealTypeFromHour(h));
    }
  });

  it('matches the live web client at every boundary', () => {
    // Boundaries: <11 breakfast, <14 lunch, <17 snack, else dinner.
    expect(inferMealTypeFromHour(0)).toBe('breakfast');
    expect(inferMealTypeFromHour(10)).toBe('breakfast');
    expect(inferMealTypeFromHour(11)).toBe('lunch');
    expect(inferMealTypeFromHour(13)).toBe('lunch');
    expect(inferMealTypeFromHour(14)).toBe('snack');
    expect(inferMealTypeFromHour(16)).toBe('snack');
    expect(inferMealTypeFromHour(17)).toBe('dinner');
    expect(inferMealTypeFromHour(23)).toBe('dinner');
  });

  it('maps the whole day exactly as the web client does', () => {
    const webReference = (hour: number) => {
      if (hour < 11) return 'breakfast';
      if (hour < 14) return 'lunch';
      if (hour < 17) return 'snack';
      return 'dinner';
    };
    for (let h = 0; h < 24; h++) {
      expect(inferMealTypeFromHour(h)).toBe(webReference(h));
    }
  });

  it('falls through to dinner for a non-finite hour, as every call site already did', () => {
    // `Number('bad'.split(':')[0])` is NaN at the mobile call site; every comparison is
    // false, so it lands on dinner. Pinned so the fallthrough is not "fixed" by accident.
    expect(inferMealTypeFromHour(Number.NaN)).toBe('dinner');
  });
});
