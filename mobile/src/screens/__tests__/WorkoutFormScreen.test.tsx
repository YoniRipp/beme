import { mergeExerciseEdits } from '../WorkoutFormScreen';
import type { Exercise } from '../../types/workout';

const loaded: Exercise = {
  name: ' Bench press ',
  sets: 3,
  reps: 8,
  repsPerSet: [8, 8, 6],
  weightPerSet: [60, 60, 65],
  completedPerSet: [true, true, false],
  weight: 60,
  notes: 'paused',
};

describe('WorkoutFormScreen save payload', () => {
  it('keeps the per-set data the form does not edit', () => {
    const out = mergeExerciseEdits(loaded);
    expect(out.repsPerSet).toEqual([8, 8, 6]);
    expect(out.weightPerSet).toEqual([60, 60, 65]);
    expect(out.completedPerSet).toEqual([true, true, false]);
  });

  it('still applies the fields the form does edit', () => {
    const out = mergeExerciseEdits({ ...loaded, reps: 10, weight: 65 });
    expect(out.name).toBe('Bench press');
    expect(out.reps).toBe(10);
    expect(out.weight).toBe(65);
    expect(out.notes).toBe('paused');
  });

  it('keeps the blank-field fallbacks the form already had', () => {
    const out = mergeExerciseEdits({ name: 'Squat', sets: 0, reps: 0, weight: 0, notes: '' });
    expect(out).toEqual({ name: 'Squat', sets: 3, reps: 10, weight: undefined, notes: undefined });
  });

  it('adds nothing to a freshly added exercise', () => {
    const out = mergeExerciseEdits({ name: 'Row', sets: 3, reps: 10 });
    expect(out.repsPerSet).toBeUndefined();
    expect(out.weightPerSet).toBeUndefined();
    expect(out.completedPerSet).toBeUndefined();
  });
});
