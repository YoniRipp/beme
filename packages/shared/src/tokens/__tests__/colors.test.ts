import { describe, it, expect } from 'vitest';
import { colors, radii, elevation, shadowStyle } from '../index';

describe('design tokens', () => {
  it('exposes the semantic colour roles both clients need', () => {
    for (const role of ['background', 'surface', 'text', 'textMuted', 'primary', 'primaryForeground', 'danger', 'border']) {
      expect(colors).toHaveProperty(role);
      expect(colors[role as keyof typeof colors]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('orders the radius scale ascending', () => {
    const values = [radii.sm, radii.md, radii.lg, radii.xl, radii.xxl];
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });

  it('carries the card radius the mobile-ui standard mandates', () => {
    // `rounded-2xl` in tailwind.config.js. Mobile's cards fell back to `lg` without it, so
    // a missing step here is a visible parity gap, not just a gap in the scale.
    expect(radii.xxl).toBe(22);
  });
});

describe('shadowStyle', () => {
  it('halves the CSS blur to get React Native shadowRadius', () => {
    // The relationship that looks like a bug and gets "corrected" back: CSS blur describes
    // the whole gaussian, RN's radius half of it.
    expect(shadowStyle('md', '#3d3229').shadowRadius).toBe(elevation.md.blur / 2);
    expect(shadowStyle('lg', '#3d3229').shadowRadius).toBe(16);
  });

  it('builds every property a React Native shadow needs, on both platforms', () => {
    expect(shadowStyle('sm', '#3d3229')).toEqual({
      shadowColor: '#3d3229',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 1.5,
      elevation: 2,
    });
  });

  it('uses the colour it is given rather than falling back to black', () => {
    // Android ignores shadowColor entirely, so the iOS value is the only place the web's
    // warm `#3d3229` can survive. A default would silently neutralise it.
    expect(shadowStyle('sm', '#3d3229').shadowColor).toBe('#3d3229');
    expect(shadowStyle('sm', '#000000').shadowColor).toBe('#000000');
  });

  it('keeps the Android depth integers ascending with the scale', () => {
    const steps = (['xs', 'sm', 'md', 'lg'] as const).map((s) => shadowStyle(s, '#000').elevation);
    expect(steps).toEqual([...steps].sort((a, b) => a - b));
    expect(new Set(steps).size).toBe(steps.length);
  });
});
