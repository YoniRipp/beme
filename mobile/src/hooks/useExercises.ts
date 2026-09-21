import { useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { exercisesApi, type CreateCustomExercise } from '../core/api/exercises';
import { apiExerciseToCatalogExercise } from '../features/body/mappers';
import { queryKeys } from '../lib/queryKeys';

/**
 * The catalog exercise as the app holds it: the wire shape with every `null` folded to
 * `undefined`. Mirrors `frontend/src/hooks/useExercises.ts` field for field, deliberately —
 * both clients read one endpoint, and a domain type that disagrees between them is how the
 * same row ends up rendered two different ways.
 *
 * `instructions` has no counterpart here. It is only ever populated by
 * `GET /api/exercises/:id` (the list columns exclude it — with ~900 rows those step-by-step
 * arrays dominate the payload, see `LIST_COLUMNS` in `backend/src/models/exercise.ts`), and
 * nothing on this client renders a detail view. The web declares the field and never fills
 * it either; copying a field nobody can populate would just invite a screen to read it and
 * find `undefined`.
 */
export interface CatalogExercise {
  id: string;
  name: string;
  muscleGroup?: string;
  /** Equipment-valued, kept for backward compatibility; prefer `equipment`. */
  category?: string;
  equipment?: string;
  /** 'strength' | 'stretching' | 'plyometrics' | 'cardio' | ... */
  discipline?: string;
  level?: string;
  mechanic?: string;
  force?: string;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  imageUrl?: string;
  /** Second photo (end position) — the catalog ships two per exercise. */
  imageUrl2?: string;
  videoUrl?: string;
  /** True for movements a user added from the picker rather than the seeded catalog. */
  isCustom?: boolean;
}

/**
 * The two facet vocabularies, copied from the web's hook, which copied them from the
 * server's `CATALOG_EQUIPMENT` / `CATALOG_MUSCLE_GROUPS`
 * (`backend/src/schemas/routeSchemas.ts`). They are closed enums there for a reason worth
 * repeating here: `createCustomExerciseSchema` validates a user-submitted movement against
 * exactly these values, so a free-text facet would create a catalog row that no filter chip
 * below can ever reach.
 *
 * Equipment is ordered by how often people actually reach for it, not alphabetically —
 * the chip row scrolls horizontally and the first three are what most sessions need.
 */
export const EQUIPMENT_FILTERS = [
  'barbell',
  'dumbbell',
  'cable',
  'machine',
  'bodyweight',
  'kettlebell',
  'bands',
  'other',
] as const;

/** Muscle-group filter options, matching the catalog's `muscle_group` values. */
export const MUSCLE_FILTERS = [
  'chest',
  'back',
  'legs',
  'shoulders',
  'arms',
  'core',
  'full_body',
] as const;

export const MUSCLE_LABELS: Record<string, string> = {
  chest: 'Chest',
  back: 'Back',
  legs: 'Legs',
  shoulders: 'Shoulders',
  arms: 'Arms',
  core: 'Core',
  full_body: 'Full body',
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  bands: 'Bands',
  other: 'Other',
};

export interface ExerciseFilters {
  query?: string;
  equipment?: string;
  muscleGroup?: string;
}

/**
 * The subtitle under an exercise's name: muscle group and equipment, in human words,
 * whichever of the two the row actually carries.
 *
 * `equipment ?? category` is not belt-and-braces. `category` is the older equipment-valued
 * column, and the catalog's curated rows populate it while the imported ones populate
 * `equipment`; the seed migration back-fills one from the other but only where the target
 * was NULL, so both spellings are live in the same table. Reading only `equipment` would
 * leave a curated row looking like it needs no gear at all.
 */
export function exerciseFacetLabel(exercise: CatalogExercise): string {
  const equipment = exercise.equipment ?? exercise.category;
  return [
    exercise.muscleGroup ? MUSCLE_LABELS[exercise.muscleGroup] ?? exercise.muscleGroup : undefined,
    equipment ? EQUIPMENT_LABELS[equipment] ?? equipment : undefined,
  ]
    .filter(Boolean)
    .join(' · ');
}

/**
 * Search + facet filter for the catalog list. Ported from the web's `filterExercises`,
 * including its ranking rule: names that START with the query come first. With ~900 entries
 * a plain `includes` match buries "Bench Press" under "Close-Grip Barbell Bench Press",
 * which is the one result the person typing "bench" was looking for.
 *
 * Exported as a plain function rather than living inside the hook so the contract can be
 * pinned without rendering anything. A React Query client in a test leaves a notifyManager
 * batch timer that outlives the run and hangs jest — the same reason
 * `buildWorkoutUpdateBody` is a free function in `useWorkouts.ts` — and this logic is pure
 * anyway.
 *
 * Does not mutate its input: `filter` already returns a fresh array, so the `sort` below
 * is sorting that copy and not the cached catalog. Sorting the cached array in place would
 * reorder every other consumer's view of it as a side effect of one search box.
 */
export function filterCatalog(
  exercises: CatalogExercise[],
  { query, equipment, muscleGroup }: ExerciseFilters,
): CatalogExercise[] {
  const q = query ? query.toLowerCase().trim() : '';
  const matches = exercises.filter((ex) => {
    if (equipment && (ex.equipment ?? ex.category) !== equipment) return false;
    if (muscleGroup && ex.muscleGroup !== muscleGroup) return false;
    if (q && !ex.name.toLowerCase().includes(q)) return false;
    return true;
  });
  if (!q) return matches;
  return matches.sort((a, b) => {
    const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts || a.name.localeCompare(b.name);
  });
}

/**
 * Splice a just-created exercise into the cached catalog, keeping it sorted by name.
 *
 * De-dupes on `id` because the create endpoint answers 200-with-the-existing-row when the
 * name is already taken (`backend/src/services/exercise.ts`). Without the filter, a user who
 * typed a name the catalog already had would get a second copy of it in their list — the
 * server did the right thing and the client would have undone it.
 *
 * Splicing rather than invalidating is deliberate: a refetch blanks ~900 rows to show one
 * new one, and the picker is on screen at the moment this runs.
 */
export function mergeCreatedExercise(
  previous: CatalogExercise[] | undefined,
  created: CatalogExercise,
): CatalogExercise[] {
  if (!previous) return [created];
  return [...previous.filter((ex) => ex.id !== created.id), created].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Shared empty catalog, so `exercises` keeps one identity while the fetch is in flight. */
const NO_EXERCISES: CatalogExercise[] = [];

/**
 * Ten minutes, matching the web's hook exactly. The catalog is a global, server-curated
 * table that changes only when somebody adds a custom movement — and that path writes the
 * new row straight into this cache — so refetching it on every screen focus would be ~900
 * rows of traffic to learn nothing.
 */
const CATALOG_STALE_TIME = 10 * 60 * 1000;

export function useExercises() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.exercises,
    queryFn: async (): Promise<CatalogExercise[]> =>
      (await exercisesApi.list()).map(apiExerciseToCatalogExercise),
    staleTime: CATALOG_STALE_TIME,
  });

  const { mutateAsync: createExerciseMutation, isPending: isCreating } = useMutation({
    mutationFn: async (body: CreateCustomExercise) =>
      apiExerciseToCatalogExercise(await exercisesApi.add(body)),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.exercises, (prev: CatalogExercise[] | undefined) =>
        mergeCreatedExercise(prev, created),
      );
    },
  });

  const createExercise = useCallback(
    (body: CreateCustomExercise): Promise<CatalogExercise> => createExerciseMutation(body),
    [createExerciseMutation],
  );

  const exercises = data ?? NO_EXERCISES;

  /**
   * Identity changes only when the catalog does, so a screen can memoise its result list on
   * this callback and a late arrival — a retry that lands after `isLoading` already went
   * false — still recomputes.
   */
  const filterExercises = useCallback(
    (filters: ExerciseFilters): CatalogExercise[] => filterCatalog(exercises, filters),
    [exercises],
  );

  const reload = useCallback(() => {
    void refetch();
  }, [refetch]);

  return {
    exercises,
    isLoading,
    /**
     * A display string, not an Error. A failed catalog fetch is otherwise indistinguishable
     * from an empty catalog, which reads to the user as "this exercise doesn't exist"
     * rather than "we couldn't reach the server".
     */
    error: error
      ? error instanceof Error
        ? error.message
        : 'Could not load exercises. Please try again.'
      : null,
    reload,
    refetch,
    filterExercises,
    createExercise,
    isCreating,
  };
}
