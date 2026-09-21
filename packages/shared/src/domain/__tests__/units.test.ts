import { describe, it, expect } from 'vitest';
import {
  convertWeight,
  displayWeight,
  getWeightUnit,
  kgToLbs,
  lbsToKg,
  unitForSystem,
} from '../units';

describe('getWeightUnit', () => {
  it('renders kilograms for a metric user', () => {
    expect(getWeightUnit('metric')).toBe('kg');
  });

  // Expo's workout card hardcoded 'kg' and showed it to imperial users too — the reason
  // this helper is shared rather than copied.
  it('renders pounds for an imperial user', () => {
    expect(getWeightUnit('imperial')).toBe('lbs');
  });
});

describe('unitForSystem', () => {
  it('maps a measurement system to the unit it weighs in', () => {
    expect(unitForSystem('metric')).toBe('kg');
    expect(unitForSystem('imperial')).toBe('lbs');
  });
});

describe('weight conversion', () => {
  // 0.45359237 is the defined pound, so these are exact relationships rather than
  // tolerances — a factor typo would move them.
  it('converts kilograms to pounds', () => {
    expect(kgToLbs(1)).toBeCloseTo(2.2046226, 6);
    expect(convertWeight(86, 'kg', 'lbs')).toBe(189.6);
  });

  it('converts pounds to kilograms', () => {
    expect(lbsToKg(1)).toBeCloseTo(0.45359237, 8);
    expect(convertWeight(180, 'lbs', 'kg')).toBe(81.6);
  });

  /**
   * A round trip is exact only to the precision we display at. Each hop rounds to one
   * decimal, so 180 lbs -> 81.6 kg -> 179.9 lbs loses a tenth; 86 kg happens to come back
   * exactly, which is luck rather than a property. Asserted as a tolerance so nobody later
   * "fixes" an exact-equality test by removing the rounding that makes the UI readable.
   */
  it('round-trips to within the precision it displays at', () => {
    for (const kg of [86, 81.6, 100, 47.3]) {
      const there = convertWeight(kg, 'kg', 'lbs');
      expect(Math.abs(convertWeight(there, 'lbs', 'kg') - kg)).toBeLessThanOrEqual(0.1);
    }
  });

  /**
   * Same unit in and out returns the value untouched rather than dividing and multiplying
   * back. Every weight a metric user ever sees takes this path, so a float nudge here would
   * be the common case, not the edge one.
   */
  it('leaves a value alone when no conversion is needed', () => {
    expect(convertWeight(78.43, 'kg', 'kg')).toBe(78.43);
    expect(convertWeight(0.1 + 0.2, 'kg', 'kg')).toBe(0.1 + 0.2);
  });
});

/**
 * The part that makes conversion safe at all.
 *
 * `displayWeight` converts from the unit the ROW is in, never from the user's preference.
 * Rows written before weights were tagged carry no unit and are read as kilograms — the same
 * reading every existing consumer already takes — so tagging changes the meaning of nothing
 * a user has already logged. Converting on preference alone is exactly the bug the old
 * docblock in `units.ts` warned against: it would have re-read a stored 135 as 297 lbs.
 */
describe('displayWeight', () => {
  it('treats an untagged row as kilograms, so existing history keeps its meaning', () => {
    expect(displayWeight(135, undefined, 'metric')).toEqual({ value: 135, unit: 'kg' });
  });

  it('converts an untagged row for an imperial viewer', () => {
    expect(displayWeight(86, undefined, 'imperial')).toEqual({ value: 189.6, unit: 'lbs' });
  });

  it('converts a pounds row back for a metric viewer', () => {
    expect(displayWeight(180, 'lbs', 'metric')).toEqual({ value: 81.6, unit: 'kg' });
  });

  it('shows a pounds row as-is to an imperial viewer', () => {
    expect(displayWeight(180, 'lbs', 'imperial')).toEqual({ value: 180, unit: 'lbs' });
  });

  /**
   * The case the old code got wrong: an imperial user who typed 180 meaning pounds. Before
   * tagging, that 180 sat in a kilograms column and was shown back as "180 lbs" only by
   * coincidence — the label matched while the stored number meant something else to every
   * other reader. Tagged, it is 180 lbs to them and 81.6 kg to everyone else, consistently.
   */
  it('keeps one stored value consistent across both viewers', () => {
    const asImperial = displayWeight(180, 'lbs', 'imperial');
    const asMetric = displayWeight(180, 'lbs', 'metric');
    expect(asImperial.value).toBe(180);
    expect(asMetric.value).toBe(81.6);
    // Within display precision, not exactly: converting back off a value already rounded
    // to one decimal gives 179.9, and that tenth is the rounding, not a disagreement.
    expect(Math.abs(convertWeight(asMetric.value, 'kg', 'lbs') - asImperial.value)).toBeLessThanOrEqual(0.1);
  });
});
