import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressRing } from './progress-ring';

const CIRCUMFERENCE = 2 * Math.PI * 40;

/** The coloured arc is the second circle; the first is the grey track. */
function arc(container: HTMLElement) {
  return container.querySelectorAll('circle')[1] as unknown as SVGCircleElement;
}

describe('ProgressRing', () => {
  /**
   * Callers compute `pct` as `targetFraction(current, target) ?? 0`, so a missing target
   * reaches this component as 0 — indistinguishable from "logged nothing against a real
   * goal". A 0% ring offsets its arc by the whole circumference and hides it, leaving a flat
   * grey circle around a number that says plenty was logged. The same defect has now been
   * found on Energy, in MacroCircles and here, which is why it is pinned on the shared
   * component rather than at a call site.
   */
  it('draws a full dimmed ring when there is no target', () => {
    const { container } = render(<ProgressRing pct={0} hasTarget={false} label="Calories today" />);

    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBe(0);
    expect(Number(arc(container).getAttribute('opacity'))).toBeLessThan(1);
  });

  /** A real 0% must still render empty — that is a true statement, unlike the above. */
  it('still hides the arc at a genuine zero against a real target', () => {
    const { container } = render(<ProgressRing pct={0} label="Calories today" />);

    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(CIRCUMFERENCE, 1);
    expect(Number(arc(container).getAttribute('opacity'))).toBe(1);
  });

  it('offsets the arc in proportion to a real target', () => {
    const { container } = render(<ProgressRing pct={0.5} label="Calories today" />);

    expect(Number(arc(container).getAttribute('stroke-dashoffset'))).toBeCloseTo(CIRCUMFERENCE * 0.5, 1);
  });

  /**
   * A progressbar with no `aria-valuenow` is indeterminate, which is what this is. Reporting
   * 0 would tell a screen reader "zero percent" — the same false claim the hidden arc made
   * visually.
   */
  it('reports itself as indeterminate rather than zero percent with no target', () => {
    render(<ProgressRing pct={0} hasTarget={false} label="Calories today" valueText="1727 kcal, no daily calorie target set" />);

    const ring = screen.getByRole('progressbar', { name: 'Calories today' });
    expect(ring).not.toHaveAttribute('aria-valuenow');
    expect(ring).toHaveAttribute('aria-valuetext', '1727 kcal, no daily calorie target set');
  });
});
