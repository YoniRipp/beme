import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { MacroCircles } from './MacroCircles';

/** The coloured progress arc is the second circle; the first is the grey track. */
function progressArc(container: HTMLElement, index: number): SVGCircleElement {
  const svg = container.querySelectorAll('svg')[index];
  return svg.querySelectorAll('circle')[1] as unknown as SVGCircleElement;
}

describe('MacroCircles — the ring with no target', () => {
  /**
   * `targetFraction(current, null)` is null, and the `?? 0` turned that into a 0% ring —
   * which offsets the arc by its whole circumference and hides it completely. The result was
   * a flat grey circle sitting next to a number that says the user logged plenty, reading as
   * "nothing here" rather than "no goal set".
   */
  it('still draws a ring rather than hiding the arc entirely', () => {
    const { container } = render(
      <MacroCircles
        carbs={{ current: 114, goal: null }}
        fat={{ current: 65, goal: 60 }}
        protein={{ current: 111, goal: 170 }}
      />,
    );

    const offset = Number(progressArc(container, 0).getAttribute('stroke-dashoffset'));
    expect(offset).toBe(0); // a full ring, not one offset out of sight
  });

  /** Dimmed, so a full ring cannot be misread as a target met at 100%. */
  it('dims the no-target ring, and leaves a real target at full strength', () => {
    const { container } = render(
      <MacroCircles
        carbs={{ current: 114, goal: null }}
        fat={{ current: 65, goal: 60 }}
        protein={{ current: 111, goal: 170 }}
      />,
    );

    expect(Number(progressArc(container, 0).getAttribute('opacity'))).toBeLessThan(1);
    expect(Number(progressArc(container, 1).getAttribute('opacity'))).toBe(1);
  });

  /** The fix must not touch how a real target renders. */
  it('still offsets the arc in proportion to a real target', () => {
    const { container } = render(
      <MacroCircles
        carbs={{ current: 114, goal: null }}
        fat={{ current: 30, goal: 60 }}
        protein={{ current: 111, goal: 170 }}
      />,
    );

    const circumference = 2 * Math.PI * 38;
    const offset = Number(progressArc(container, 1).getAttribute('stroke-dashoffset'));
    expect(offset).toBeCloseTo(circumference * 0.5, 1); // 30 of 60 is half the ring
  });
});
