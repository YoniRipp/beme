import { describe, it, expect } from 'vitest';
import { WORKOUT_TYPES, type Exercise } from '../workout';

describe('shared workout types', () => {
  it('exposes the four workout types', () => {
    expect(WORKOUT_TYPES).toEqual(['strength', 'cardio', 'flexibility', 'sports']);
  });

  it('models all three per-set arrays', () => {
    const e: Exercise = {
      name: 'Bench press',
      sets: 3,
      reps: 8,
      repsPerSet: [8, 8, 6],
      weightPerSet: [60, 60, 65],
      completedPerSet: [true, true, false],
    };
    expect(e.weightPerSet).toHaveLength(3);
    expect(e.completedPerSet).toEqual([true, true, false]);
  });
});
