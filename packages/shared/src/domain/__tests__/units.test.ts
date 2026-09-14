import { describe, it, expect } from 'vitest';
import { getWeightUnit } from '../units';

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
