import { describe, it, expect } from 'vitest';
import { foodEntryFormSchema } from '../foodEntry';
import { LIMITS } from '../../constants';

/**
 * The form takes strings, because the fields it backs are text inputs — the numeric
 * bounds are checked by `refine` after `parseFloat`. Tests therefore feed strings.
 */
const valid = {
  name: 'Chicken breast, cooked',
  calories: '165',
  protein: '31',
  carbs: '0',
  fats: '3.6',
};

describe('foodEntryFormSchema', () => {
  it('accepts a valid entry', () => {
    expect(foodEntryFormSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects negative calories', () => {
    expect(foodEntryFormSchema.safeParse({ ...valid, calories: '-1' }).success).toBe(false);
  });

  it('rejects calories above the maximum', () => {
    expect(
      foodEntryFormSchema.safeParse({ ...valid, calories: String(LIMITS.MAX_CALORIES + 1) }).success
    ).toBe(false);
    expect(
      foodEntryFormSchema.safeParse({ ...valid, calories: String(LIMITS.MAX_CALORIES) }).success
    ).toBe(true);
  });

  it('rejects a non-numeric quantity', () => {
    expect(foodEntryFormSchema.safeParse({ ...valid, protein: 'lots' }).success).toBe(false);
  });

  it('rejects an empty name', () => {
    expect(foodEntryFormSchema.safeParse({ ...valid, name: '' }).success).toBe(false);
  });

  it('rejects a name over 100 characters', () => {
    expect(foodEntryFormSchema.safeParse({ ...valid, name: 'x'.repeat(101) }).success).toBe(false);
  });

  it('holds each macro to its own ceiling', () => {
    expect(foodEntryFormSchema.safeParse({ ...valid, protein: String(LIMITS.MAX_PROTEIN + 1) }).success).toBe(false);
    expect(foodEntryFormSchema.safeParse({ ...valid, carbs: String(LIMITS.MAX_CARBS + 1) }).success).toBe(false);
    expect(foodEntryFormSchema.safeParse({ ...valid, fats: String(LIMITS.MAX_FATS + 1) }).success).toBe(false);
  });
});
