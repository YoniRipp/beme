import { describe, it, expect } from 'vitest';
import { accentHex } from '../accent';
import { lightColors } from '../../tokens/colors';

/**
 * `accentHex` and `tokens/colors.ts` both derive from the web's CSS custom
 * properties (see each file's header comment), so a correct HSL->hex conversion
 * must land on the same hex values `lightColors` already has. If a derivation here
 * disagrees with `lightColors`, the helper is wrong — `lightColors` is not to be
 * adjusted to match it.
 */
describe('accentHex', () => {
  it('derives green.primary from the same HSL source as tokens/colors.ts primary (150 28% 30%)', () => {
    expect(accentHex.green.primary).toBe(lightColors.primary);
    expect(accentHex.green.primary).toBe('#37624d');
  });

  it('derives blue.primary from the same HSL source as tokens/colors.ts workout (212 58% 48%)', () => {
    expect(accentHex.blue.primary).toBe(lightColors.workout);
    expect(accentHex.blue.primary).toBe('#3376c1');
  });

  it('derives neutral.primary from the same HSL source as tokens/colors.ts text (30 14% 14%)', () => {
    expect(accentHex.neutral.primary).toBe(lightColors.text);
    expect(accentHex.neutral.primary).toBe('#29241f');
  });

  it('defines "primary" identically to "green", matching the web', () => {
    expect(accentHex.primary).toEqual(accentHex.green);
  });
});
