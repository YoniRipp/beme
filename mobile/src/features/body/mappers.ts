import { Workout } from '../../types/workout';
import { parseLocalDateString } from '../../lib/dateRanges';

type ApiExercise = { name: string; sets: number; reps: number; repsPerSet?: number[]; weight?: number; notes?: string };

export function apiWorkoutToWorkout(a: {
  id: string;
  date: string;
  title: string;
  type: string;
  durationMinutes: number;
  exercises: ApiExercise[];
  notes?: string;
}): Workout {
  return {
    id: a.id,
    date: parseLocalDateString(a.date),
    title: a.title,
    type: a.type as Workout['type'],
    durationMinutes: a.durationMinutes,
    exercises: (a.exercises ?? []).map((e) => ({
      name: e.name,
      sets: e.sets,
      reps: e.reps,
      ...(e.repsPerSet && e.repsPerSet.length === e.sets ? { repsPerSet: e.repsPerSet } : undefined),
      weight: e.weight,
      notes: e.notes,
    })),
    notes: a.notes,
  };
}
