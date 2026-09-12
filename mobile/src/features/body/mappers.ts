import { Exercise, Workout } from '../../types/workout';
import type { ApiExercise } from '../../core/api/workouts';
import { parseLocalDateString, toLocalDateString } from '../../lib/dateRanges';

/**
 * Wire exercise -> domain exercise.
 *
 * Every field is carried through by spreading. Hand-listing the fields here is
 * exactly what silently destroyed per-set data, so don't reintroduce it.
 *
 * The only transformation is normalising the API's `null` weight entries (a
 * blank / bodyweight set) to `undefined`, which is how the domain type spells
 * the same thing.
 *
 * There is deliberately NO `repsPerSet.length === sets` guard: a per-set array
 * whose length disagrees with `sets` is a form-validation concern, never a
 * licence for the mapper to throw the user's data away.
 */
function apiExerciseToExercise(e: ApiExercise): Exercise {
  const { weightPerSet, ...rest } = e;
  const exercise: Exercise = { ...rest };
  if (weightPerSet) exercise.weightPerSet = weightPerSet.map((value) => value ?? undefined);
  return exercise;
}

export function apiWorkoutToWorkout(a: {
  id: string;
  date: string;
  title: string;
  type: string;
  durationMinutes: number;
  exercises: ApiExercise[];
  notes?: string;
  completed?: boolean;
}): Workout {
  return {
    id: a.id,
    date: parseLocalDateString(a.date),
    title: a.title,
    type: a.type as Workout['type'],
    durationMinutes: a.durationMinutes,
    exercises: (a.exercises ?? []).map(apiExerciseToExercise),
    notes: a.notes,
    completed: a.completed ?? false,
  };
}

/** Body accepted by POST /api/workouts and PATCH /api/workouts/:id. */
export type ApiWorkoutPayload = {
  title: string;
  type: string;
  date: string;
  durationMinutes: number;
  exercises: ApiExercise[];
  notes?: string;
  completed: boolean;
};

/**
 * Domain workout -> wire payload. Takes a workout with or without an id, so it
 * serves both the create and the update path.
 *
 * As with the read direction, exercises are spread rather than enumerated: any
 * field the app is not editing yet still has to make the round trip intact.
 */
export function workoutToApiWorkout(w: Omit<Workout, 'id'>): ApiWorkoutPayload {
  return {
    title: w.title,
    type: w.type,
    date: toLocalDateString(w.date),
    durationMinutes: w.durationMinutes,
    exercises: w.exercises.map((e) => ({ ...e })),
    notes: w.notes,
    completed: w.completed,
  };
}
