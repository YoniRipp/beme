import type React from 'react';
import { cn } from '@/lib/utils';

/**
 * Circular progress readout. Usually the largest number on a screen, so it carries a
 * `label` and reports itself as a progressbar — the value is otherwise invisible to
 * anyone not looking at the arc.
 */
export function ProgressRing({
  pct,
  label,
  valueText,
  hasTarget = true,
  size = 132,
  stroke = 11,
  colorClass = 'text-primary',
  children,
  className,
}: {
  pct: number;
  /** What the ring measures, e.g. "Calories". Announced before the value. */
  label: string;
  /**
   * False when there is no target to measure against, which is NOT the same as 0%.
   *
   * Callers compute `pct` as `targetFraction(current, target) ?? 0`, so a missing target
   * arrives here indistinguishable from "logged nothing against a real goal" — and a 0% ring
   * offsets its arc by the whole circumference, hiding it. The result was a flat grey circle
   * wrapped around a number that says plenty was logged. The component cannot tell the two
   * apart on its own, so it has to be told.
   */
  hasTarget?: boolean;
  /** Spoken value, e.g. "1,450 of 2,000 kcal". Falls back to a percentage. */
  valueText?: string;
  size?: number;
  stroke?: number;
  colorClass?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const normalized = Math.max(0, Math.min(1, pct));
  // No target: draw the full ring, dimmed. Full because the value is complete rather than
  // partial progress; dimmed so it cannot be read as a goal met at 100%.
  const dashOffset = hasTarget ? circumference * (1 - normalized) : 0;

  return (
    <div
      className={cn('relative shrink-0', className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-label={label}
      // Omitted with no target: a progressbar without `aria-valuenow` is indeterminate, which
      // is what this is. Reporting 0 would tell a screen reader "zero percent" — the same
      // false claim the hidden arc made visually.
      aria-valuenow={hasTarget ? Math.round(normalized * 100) : undefined}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={valueText}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90" aria-hidden="true" focusable="false">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          opacity={hasTarget ? 1 : 0.35}
          className={cn('transition-all duration-700 ease-out', colorClass)}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
          {children}
        </div>
      )}
    </div>
  );
}
