import { describe, it, expect } from 'vitest';
import { workoutFormSchema } from '../workout';
import { LIMITS } from '../../constants';

const workoutWith = (exercise: Record<string, unknown>) => ({
  title: 'Workout',
  type: 'strength',
  date: '2026-09-12',
  durationMinutes: '60',
  exercises: [{ name: 'Bench Press', sets: 3, reps: 10, ...exercise }],
});

describe('workoutFormSchema exercise limits', () => {
  /**
   * The server's `exerciseSchema` caps reps at 999. The form used to cap them at 1000,
   * so exactly 1000 reps passed here and was then rejected on save — the user was told
   * the value was fine and lost the save anyway. These two cases pin the client to the
   * server's ceiling; if the server ever moves, this is what should fail first.
   */
  it('accepts reps at the server ceiling of 999', () => {
    expect(workoutFormSchema.safeParse(workoutWith({ reps: 999 })).success).toBe(true);
  });

  it('rejects reps of 1000, which the server rejects', () => {
    expect(workoutFormSchema.safeParse(workoutWith({ reps: 1000 })).success).toBe(false);
  });

  it('applies the same ceiling to each repsPerSet entry', () => {
    expect(workoutFormSchema.safeParse(workoutWith({ sets: 2, repsPerSet: [999, 999] })).success).toBe(true);
    expect(workoutFormSchema.safeParse(workoutWith({ sets: 2, repsPerSet: [999, 1000] })).success).toBe(false);
  });

  it('keeps MAX_EXERCISE_REPS in step with the server', () => {
    expect(LIMITS.MAX_EXERCISE_REPS).toBe(999);
  });

  it('bounds sets, which the server caps at 999', () => {
    expect(workoutFormSchema.safeParse(workoutWith({ sets: LIMITS.MAX_EXERCISE_SETS })).success).toBe(true);
    expect(workoutFormSchema.safeParse(workoutWith({ sets: LIMITS.MAX_EXERCISE_SETS + 1 })).success).toBe(false);
    expect(workoutFormSchema.safeParse(workoutWith({ sets: 0 })).success).toBe(false);
  });

  it('bounds weight, which the server caps at 9999', () => {
    expect(workoutFormSchema.safeParse(workoutWith({ weight: LIMITS.MAX_EXERCISE_WEIGHT })).success).toBe(true);
    expect(workoutFormSchema.safeParse(workoutWith({ weight: LIMITS.MAX_EXERCISE_WEIGHT + 1 })).success).toBe(false);
  });

  it('bounds duration, which the server caps at 1440 minutes', () => {
    const base = workoutWith({});
    expect(workoutFormSchema.safeParse({ ...base, durationMinutes: String(LIMITS.MAX_WORKOUT_DURATION) }).success).toBe(true);
    expect(workoutFormSchema.safeParse({ ...base, durationMinutes: String(LIMITS.MAX_WORKOUT_DURATION + 1) }).success).toBe(false);
    expect(workoutFormSchema.safeParse({ ...base, durationMinutes: '0' }).success).toBe(false);
  });

  it('requires at least one exercise', () => {
    expect(workoutFormSchema.safeParse({ ...workoutWith({}), exercises: [] }).success).toBe(false);
  });

  it('rejects a workout type the server does not accept', () => {
    expect(workoutFormSchema.safeParse({ ...workoutWith({}), type: 'yoga' }).success).toBe(false);
  });
  it('bounds workout notes, which the server caps at 2000 characters', () => {
    const base = workoutWith({});
    expect(workoutFormSchema.safeParse({ ...base, notes: 'x'.repeat(LIMITS.MAX_WORKOUT_NOTES) }).success).toBe(true);
    expect(workoutFormSchema.safeParse({ ...base, notes: 'x'.repeat(LIMITS.MAX_WORKOUT_NOTES + 1) }).success).toBe(false);
  });

  it('rejects impossible calendar dates the server refines away', () => {
    const base = workoutWith({});
    expect(workoutFormSchema.safeParse({ ...base, date: '2026-02-28' }).success).toBe(true);
    // 2026 is not a leap year, so the 29th does not exist either.
    expect(workoutFormSchema.safeParse({ ...base, date: '2026-02-29' }).success).toBe(false);
    expect(workoutFormSchema.safeParse({ ...base, date: '2026-02-31' }).success).toBe(false);
    expect(workoutFormSchema.safeParse({ ...base, date: '2026-13-01' }).success).toBe(false);
  });
});
