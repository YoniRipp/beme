import { apiWorkoutToWorkout, workoutToApiWorkout } from '../mappers';

const apiWorkout = {
  id: 'w1',
  date: '2026-09-12',
  title: 'Push day',
  type: 'strength',
  durationMinutes: 45,
  completed: true,
  exercises: [
    {
      name: 'Bench press',
      sets: 3,
      reps: 8,
      repsPerSet: [8, 8, 6],
      weightPerSet: [60, 60, 65],
      completedPerSet: [true, true, false],
    },
  ],
};

describe('workout mappers', () => {
  it('reads all three per-set arrays from the API', () => {
    const ex = apiWorkoutToWorkout(apiWorkout).exercises[0];
    expect(ex.repsPerSet).toEqual([8, 8, 6]);
    expect(ex.weightPerSet).toEqual([60, 60, 65]);
    expect(ex.completedPerSet).toEqual([true, true, false]);
  });

  it('writes all three per-set arrays back to the API', () => {
    const ex = workoutToApiWorkout(apiWorkoutToWorkout(apiWorkout)).exercises[0];
    expect(ex.repsPerSet).toEqual([8, 8, 6]);
    expect(ex.weightPerSet).toEqual([60, 60, 65]);
    expect(ex.completedPerSet).toEqual([true, true, false]);
  });

  it('survives a full round trip unchanged', () => {
    const out = workoutToApiWorkout(apiWorkoutToWorkout(apiWorkout));
    expect(out.exercises).toEqual(apiWorkout.exercises);
  });

  it('keeps per-set arrays whose length disagrees with sets', () => {
    // A mismatch is a validation concern for the form, never a licence for the
    // mapper to throw the user's data away.
    const mismatched = {
      ...apiWorkout,
      exercises: [
        {
          name: 'Bench press',
          sets: 4,
          reps: 8,
          repsPerSet: [8, 8, 6],
          weightPerSet: [60, 60, 65],
          completedPerSet: [true, true, false],
        },
      ],
    };
    const ex = apiWorkoutToWorkout(mismatched).exercises[0];
    expect(ex.repsPerSet).toEqual([8, 8, 6]);
    expect(ex.weightPerSet).toEqual([60, 60, 65]);
    expect(ex.completedPerSet).toEqual([true, true, false]);
    expect(workoutToApiWorkout(apiWorkoutToWorkout(mismatched)).exercises[0].repsPerSet).toEqual([8, 8, 6]);
  });

  it('normalises null weight entries (blank / bodyweight sets) to undefined', () => {
    const withNulls = {
      ...apiWorkout,
      exercises: [{ name: 'Pull up', sets: 3, reps: 5, weightPerSet: [null, 20, null] }],
    };
    const ex = apiWorkoutToWorkout(withNulls).exercises[0];
    expect(ex.weightPerSet).toEqual([undefined, 20, undefined]);
    expect(workoutToApiWorkout(apiWorkoutToWorkout(withNulls)).exercises[0].weightPerSet).toEqual([
      undefined,
      20,
      undefined,
    ]);
  });

  it('leaves exercises without per-set data alone', () => {
    const plain = {
      ...apiWorkout,
      exercises: [{ name: 'Plank', sets: 3, reps: 1, weight: 0, notes: 'hold 60s' }],
    };
    const ex = apiWorkoutToWorkout(plain).exercises[0];
    expect(ex).toEqual({ name: 'Plank', sets: 3, reps: 1, weight: 0, notes: 'hold 60s' });
    expect(ex.repsPerSet).toBeUndefined();
    expect(ex.weightPerSet).toBeUndefined();
    expect(ex.completedPerSet).toBeUndefined();
  });

  it('maps the workout envelope in both directions', () => {
    const w = apiWorkoutToWorkout(apiWorkout);
    expect(w.id).toBe('w1');
    expect(w.date).toEqual(new Date(2026, 8, 12));
    expect(w.completed).toBe(true);
    const out = workoutToApiWorkout(w);
    expect(out).toMatchObject({
      title: 'Push day',
      type: 'strength',
      date: '2026-09-12',
      durationMinutes: 45,
      completed: true,
    });
  });
});
