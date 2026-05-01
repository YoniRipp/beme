import { describe, it, expect } from 'vitest';
import { workoutFormSchema } from './workout';

const baseWorkout = {
  title: 'Workout',
  type: 'strength',
  date: '2025-01-17',
  durationMinutes: '60',
  exercises: [
    {
      name: 'Bench Press',
      sets: 3,
      reps: 10,
      weight: undefined,
    },
  ],
};

describe('workoutFormSchema', () => {
  it('parses success with valid repsPerSet length equal to sets', () => {
    const data = {
      ...baseWorkout,
      exercises: [
        {
          name: 'Bench Press',
          sets: 3,
          reps: 10,
          repsPerSet: [10, 8, 6],
          weightPerSet: [135, 135, 125],
          weight: 135,
        },
      ],
    };
    const result = workoutFormSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exercises[0].repsPerSet).toEqual([10, 8, 6]);
      expect(result.data.exercises[0].weightPerSet).toEqual([135, 135, 125]);
    }
  });

  it('parses failure when repsPerSet length does not match sets', () => {
    const data = {
      ...baseWorkout,
      exercises: [
        {
          name: 'Bench Press',
          sets: 3,
          reps: 10,
          repsPerSet: [10, 8],
          weight: undefined,
        },
      ],
    };
    const result = workoutFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const repsPerSetError = result.error.issues.find((i) => i.path.includes('repsPerSet'));
      expect(repsPerSetError).toBeDefined();
    }
  });

  it('parses success with optional repsPerSet (only reps)', () => {
    const data = {
      ...baseWorkout,
      exercises: [
        {
          name: 'Squat',
          sets: 4,
          reps: 10,
          weight: undefined,
        },
      ],
    };
    const result = workoutFormSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.exercises[0].repsPerSet).toBeUndefined();
      expect(result.data.exercises[0].reps).toBe(10);
    }
  });

  it('parses failure when repsPerSet has wrong length for multiple sets', () => {
    const data = {
      ...baseWorkout,
      exercises: [
        {
          name: 'Deadlift',
          sets: 5,
          reps: 5,
          repsPerSet: [5, 5, 5, 5],
          weight: 225,
        },
      ],
    };
    const result = workoutFormSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('parses failure when weightPerSet length does not match sets', () => {
    const data = {
      ...baseWorkout,
      exercises: [
        {
          name: 'Deadlift',
          sets: 3,
          reps: 5,
          repsPerSet: [5, 5, 5],
          weightPerSet: [225, 225],
        },
      ],
    };
    const result = workoutFormSchema.safeParse(data);
    expect(result.success).toBe(false);
    if (!result.success) {
      const weightPerSetError = result.error.issues.find((i) => i.path.includes('weightPerSet'));
      expect(weightPerSetError).toBeDefined();
    }
  });
});
