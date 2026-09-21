import { Exercise, Workout } from '../../types/workout';
import type { ApiExercise } from '../../core/api/workouts';
import type { ApiCatalogExercise } from '../../core/api/exercises';
import type { CatalogExercise } from '../../hooks/useExercises';
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

/**
 * Wire catalog exercise -> domain catalog exercise.
 *
 * The only transformation is folding the API's `null`s to `undefined`, and that is worth a
 * mapper rather than a cast because the two spellings are NOT interchangeable where this
 * type is read. `ex.equipment ?? ex.category` (see `exerciseFacetLabel` in
 * `hooks/useExercises.ts`) falls through on `undefined` and stops on `null`, so a row whose
 * `equipment` column is null would render with no gear label at all instead of the value
 * its older `category` column is still holding. The catalog is a merge of ~117 curated rows
 * (which populate `category`) and ~873 imported ones (which populate `equipment`), so that
 * is the common row, not the edge case.
 *
 * `isCustom` defaults to false rather than staying undefined: the server sends
 * `Boolean(row.is_custom)` for every row, so an absent value means an older payload rather
 * than unknown provenance.
 *
 * Lives here, beside the workout mappers, because the web keeps its identical function in
 * the file of the same name (`frontend/src/features/body/mappers.ts`). The two clients'
 * mapper layers line up file for file, which is what makes a drift between them show up in
 * review rather than in production.
 */
export function apiExerciseToCatalogExercise(a: ApiCatalogExercise): CatalogExercise {
  return {
    id: a.id,
    name: a.name,
    muscleGroup: a.muscleGroup ?? undefined,
    category: a.category ?? undefined,
    equipment: a.equipment ?? undefined,
    discipline: a.discipline ?? undefined,
    level: a.level ?? undefined,
    mechanic: a.mechanic ?? undefined,
    force: a.force ?? undefined,
    primaryMuscles: a.primaryMuscles ?? undefined,
    secondaryMuscles: a.secondaryMuscles ?? undefined,
    imageUrl: a.imageUrl ?? undefined,
    imageUrl2: a.imageUrl2 ?? undefined,
    videoUrl: a.videoUrl ?? undefined,
    isCustom: a.isCustom ?? false,
  };
}
