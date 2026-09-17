import { parseNumericField } from '../numericField';

/**
 * The bug: `parseFloat(value) || 0` treated a typo and an empty field as the same thing, so
 * `12o` calories was saved as 0 with a success toast. A wrong number saved silently is worse
 * than a save that refuses, because nothing ever tells the user.
 */
describe('parseNumericField', () => {
  it('rejects a typo rather than saving a number nobody typed', () => {
    expect(parseNumericField('12o', 'Calories', 0)).toEqual({
      ok: false,
      message: 'Calories must be a number',
    });
  });

  /**
   * `parseFloat` is why this uses `Number`: it reads a leading numeric prefix and stops, so
   * `parseFloat('12o')` is 12 and the typo survives as a plausible-looking value.
   */
  it('does not accept the leading digits of a typo, which parseFloat would', () => {
    expect(parseFloat('12o')).toBe(12);
    expect(parseNumericField('12o', 'Calories', 0).ok).toBe(false);
  });

  it('keeps blank meaning blank, which is what the fallback is for', () => {
    expect(parseNumericField('', 'Protein', 0)).toEqual({ ok: true, value: 0 });
    expect(parseNumericField('   ', 'Amount', undefined)).toEqual({ ok: true, value: undefined });
  });

  it('preserves a real zero rather than folding it into the fallback', () => {
    expect(parseNumericField('0', 'Amount', undefined)).toEqual({ ok: true, value: 0 });
  });

  it('rejects a negative, which the old form would have stored', () => {
    expect(parseNumericField('-5', 'Carbs', 0)).toEqual({
      ok: false,
      message: 'Carbs cannot be negative',
    });
  });

  it('accepts ordinary decimals', () => {
    expect(parseNumericField('12.5', 'Fats', 0)).toEqual({ ok: true, value: 12.5 });
  });
});
