import { describe, it, expect } from 'vitest';
import { colors, radii } from '../index';

describe('design tokens', () => {
  it('exposes the semantic colour roles both clients need', () => {
    for (const role of ['background', 'surface', 'text', 'textMuted', 'primary', 'danger', 'border']) {
      expect(colors).toHaveProperty(role);
      expect(colors[role as keyof typeof colors]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('orders the radius scale ascending', () => {
    const values = [radii.sm, radii.md, radii.lg, radii.xl];
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
