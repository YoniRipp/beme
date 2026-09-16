import { describe, it, expect } from 'vitest';
import { withAlpha } from '../alpha';
import { darkColors, lightColors } from '../colors';

describe('withAlpha', () => {
  it('expands a three-digit hex before appending the alpha channel', () => {
    // `#abc` is `#aabbcc`, not `#0abc00` or a truncation — getting this wrong would paint
    // a plausible-looking but different colour rather than throw.
    expect(withAlpha('#abc', 1)).toBe('#aabbccff');
  });

  it('appends to a six-digit hex', () => {
    expect(withAlpha('#b5ef57', 0.1)).toBe('#b5ef571a');
  });

  it('replaces an existing alpha channel rather than compounding it', () => {
    expect(withAlpha('#b5ef571a', 0.5)).toBe('#b5ef5780');
    // Stated as the invariant it protects: applying the helper twice means the second
    // call's opacity, not the product of the two.
    expect(withAlpha(withAlpha('#b5ef57', 0.5), 0.5)).toBe(withAlpha('#b5ef57', 0.5));
  });

  it('normalises case so two spellings of one colour compare equal', () => {
    expect(withAlpha('#B5EF57', 0.1)).toBe(withAlpha('#b5ef57', 0.1));
  });

  it('rounds the boundaries exactly: 0 is 00 and 1 is ff', () => {
    expect(withAlpha('#aabbcc', 0)).toBe('#aabbcc00');
    expect(withAlpha('#aabbcc', 1)).toBe('#aabbccff');
  });

  it('rounds intermediate alphas to the nearest of the 256 channel values', () => {
    // 0.1 * 255 = 25.5 -> 26 = 0x1a (the MD3 container roles' opacity)
    expect(withAlpha('#aabbcc', 0.1)).toBe('#aabbcc1a');
    // 0.12 * 255 = 30.6 -> 31 = 0x1f (surfaceDisabled)
    expect(withAlpha('#aabbcc', 0.12)).toBe('#aabbcc1f');
    // 0.38 * 255 = 96.9 -> 97 = 0x61 (onSurfaceDisabled)
    expect(withAlpha('#aabbcc', 0.38)).toBe('#aabbcc61');
  });

  it('always returns nine characters, so a consumer can slice the channels positionally', () => {
    for (const input of ['#abc', '#aabbcc', '#aabbccdd']) {
      expect(withAlpha(input, 0.5)).toHaveLength(9);
    }
  });

  it('throws on a shape that is not a hex colour instead of returning something paintable', () => {
    expect(() => withAlpha('rgb(1,2,3)', 0.5)).toThrow(/expected a hex colour/);
    expect(() => withAlpha('#aabbc', 0.5)).toThrow(/expected a hex colour/);
    expect(() => withAlpha('aabbcc', 0.5)).toThrow(/expected a hex colour/);
  });

  it('throws on an alpha outside 0..1, including NaN', () => {
    expect(() => withAlpha('#aabbcc', 1.5)).toThrow(/between 0 and 1/);
    expect(() => withAlpha('#aabbcc', -0.1)).toThrow(/between 0 and 1/);
    expect(() => withAlpha('#aabbcc', Number.NaN)).toThrow(/between 0 and 1/);
  });

  it('accepts every value in both shipped palettes — the inputs it exists to take', () => {
    for (const palette of [lightColors, darkColors]) {
      for (const value of Object.values(palette)) {
        expect(withAlpha(value, 0.1)).toMatch(/^#[0-9a-f]{8}$/);
      }
    }
  });
});
