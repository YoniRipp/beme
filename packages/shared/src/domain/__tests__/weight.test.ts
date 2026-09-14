import { describe, it, expect } from 'vitest';
import {
  summarizeWeight,
  WEIGHT_BAR_MIN_PERCENT,
  WEIGHT_TREND_POINTS,
  type WeightEntrySource,
} from '../weight';

/** Newest first, the order every list endpoint returns (`ORDER BY date DESC`). */
const entries = (...weights: number[]): WeightEntrySource[] =>
  weights.map((weight, i) => ({ id: `w${i}`, date: `2026-09-${String(20 - i).padStart(2, '0')}`, weight }));

describe('summarizeWeight — current and target', () => {
  it('takes the newest reading as current', () => {
    expect(summarizeWeight(entries(82.4, 83, 83.5), 78).current).toBe(82.4);
  });

  it('reports the distance to target, positive when above it', () => {
    expect(summarizeWeight(entries(82), 78).diffToTarget).toBeCloseTo(4);
    expect(summarizeWeight(entries(75), 78).diffToTarget).toBeCloseTo(-3);
  });

  it('has no target and no delta when the profile has not set one', () => {
    const summary = summarizeWeight(entries(82), undefined);
    expect(summary.target).toBeNull();
    expect(summary.diffToTarget).toBeNull();
  });

  it('reads an empty history as nothing logged, not as zero kilograms', () => {
    const summary = summarizeWeight([], 78);
    expect(summary.current).toBeNull();
    expect(summary.diffToTarget).toBeNull();
    expect(summary.trend).toBeNull();
    expect(summary.bars).toEqual([]);
  });
});

describe('summarizeWeight — trend', () => {
  it('is newest minus oldest across the readings it draws', () => {
    expect(summarizeWeight(entries(80, 81, 82), null).trend).toBeCloseTo(-2);
  });

  it('needs two readings before it means anything', () => {
    expect(summarizeWeight(entries(80), null).trend).toBeNull();
  });

  it('never reaches past the readings the sparkline shows', () => {
    const long = entries(...Array.from({ length: 20 }, (_, i) => 100 - i));
    // 100 (newest) back to 94 (the 7th), not back to 81 (the 20th).
    expect(summarizeWeight(long, null).trend).toBeCloseTo(100 - (100 - (WEIGHT_TREND_POINTS - 1)));
  });
});

describe('summarizeWeight — sparkline', () => {
  it('draws oldest first so the bars read left to right as time', () => {
    const bars = summarizeWeight(entries(82, 83, 84), null).bars;
    expect(bars.map((b) => b.weight)).toEqual([84, 83, 82]);
  });

  it('draws at most seven bars however long the history is', () => {
    const long = entries(...Array.from({ length: 30 }, (_, i) => 90 - i * 0.1));
    expect(summarizeWeight(long, null).bars).toHaveLength(WEIGHT_TREND_POINTS);
  });

  it('normalises the lowest reading to the floor and the highest to full height', () => {
    const bars = summarizeWeight(entries(84, 82, 80), null).bars;
    expect(bars[0].heightPercent).toBe(WEIGHT_BAR_MIN_PERCENT); // 80, the lowest
    expect(bars[2].heightPercent).toBe(100); // 84, the highest
  });

  it('gives a flat week visible bars instead of NaN heights', () => {
    const bars = summarizeWeight(entries(80, 80, 80), null).bars;
    expect(bars.every((b) => b.heightPercent === WEIGHT_BAR_MIN_PERCENT)).toBe(true);
  });

  it('does not draw a sparkline from a single reading', () => {
    expect(summarizeWeight(entries(80), null).bars).toEqual([]);
  });
});
