import {
  filterCatalog,
  mergeCreatedExercise,
  exerciseFacetLabel,
  EQUIPMENT_FILTERS,
  MUSCLE_FILTERS,
  type CatalogExercise,
} from '../useExercises';
import { apiExerciseToCatalogExercise } from '../../features/body/mappers';

/**
 * The catalog's search, its facet filters and its cache splice, tested as the plain
 * functions they are.
 *
 * Nothing here renders a hook. A React Query client in a test leaves a notifyManager batch
 * timer that outlives the run and hangs jest — the reason `buildWorkoutUpdateBody` is a free
 * function in `useWorkouts.ts` too — and all of this logic is pure, so a renderer would add
 * a hazard and prove nothing extra.
 */

const catalog: CatalogExercise[] = [
  { id: '1', name: 'Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { id: '2', name: 'Close-Grip Barbell Bench Press', muscleGroup: 'chest', equipment: 'barbell' },
  { id: '3', name: 'Cable Fly', muscleGroup: 'chest', equipment: 'cable' },
  { id: '4', name: 'Seated Cable Row', muscleGroup: 'back', equipment: 'cable' },
  // No `equipment`, only the older equipment-valued `category` — the shape every curated
  // row in the real catalog has.
  { id: '5', name: 'Air Squat', muscleGroup: 'legs', category: 'bodyweight' },
];

const names = (list: CatalogExercise[]) => list.map((ex) => ex.name);

describe('filterCatalog', () => {
  it('returns the whole catalog when nothing is asked of it', () => {
    expect(filterCatalog(catalog, {})).toHaveLength(catalog.length);
  });

  /**
   * The ranking rule, and the reason it exists. With ~900 rows, a plain `includes` match
   * puts "Close-Grip Barbell Bench Press" above "Bench Press" (it sorts earlier
   * alphabetically), burying the one result somebody typing "bench" was after.
   */
  it('ranks names that start with the query above names that merely contain it', () => {
    expect(names(filterCatalog(catalog, { query: 'bench' }))).toEqual([
      'Bench Press',
      'Close-Grip Barbell Bench Press',
    ]);
  });

  it('matches case-insensitively and ignores padding around the query', () => {
    expect(names(filterCatalog(catalog, { query: '  CABLE fly ' }))).toEqual(['Cable Fly']);
  });

  it('narrows to one equipment facet', () => {
    expect(names(filterCatalog(catalog, { equipment: 'cable' }))).toEqual([
      'Cable Fly',
      'Seated Cable Row',
    ]);
  });

  it('narrows to one muscle group', () => {
    expect(names(filterCatalog(catalog, { muscleGroup: 'back' }))).toEqual(['Seated Cable Row']);
  });

  it('applies search and both facets together', () => {
    expect(names(filterCatalog(catalog, { query: 'press', muscleGroup: 'chest', equipment: 'barbell' })))
      .toEqual(['Bench Press', 'Close-Grip Barbell Bench Press']);
  });

  /**
   * `equipment ?? category` is not belt-and-braces. The catalog merges ~117 curated rows
   * (which populate the older `category` column) with ~873 imported ones (which populate
   * `equipment`), so both spellings are live in one table. Reading only `equipment` would
   * make every curated row invisible behind its own equipment chip.
   */
  it('matches the equipment facet against the legacy `category` column too', () => {
    expect(names(filterCatalog(catalog, { equipment: 'bodyweight' }))).toEqual(['Air Squat']);
  });

  it('finds nothing rather than everything when the facets cannot both hold', () => {
    expect(filterCatalog(catalog, { muscleGroup: 'back', equipment: 'barbell' })).toEqual([]);
  });

  /**
   * The sort runs on the array `filter` just produced, never on the caller's. Sorting the
   * cached catalog in place would reorder every other consumer's view of it as a side
   * effect of one keystroke in one search box.
   */
  it('does not reorder the catalog it was handed', () => {
    const before = names(catalog);
    filterCatalog(catalog, { query: 'bench' });
    expect(names(catalog)).toEqual(before);
  });

  it('treats a whitespace-only query as no query at all', () => {
    expect(filterCatalog(catalog, { query: '   ' })).toHaveLength(catalog.length);
  });
});

describe('mergeCreatedExercise', () => {
  const created: CatalogExercise = { id: '9', name: 'Ab Roller', muscleGroup: 'core' };

  it('inserts the new exercise in name order rather than at the end', () => {
    expect(names(mergeCreatedExercise(catalog, created))[0]).toBe('Ab Roller');
  });

  it('starts a list when the cache was empty', () => {
    expect(mergeCreatedExercise(undefined, created)).toEqual([created]);
  });

  /**
   * The create endpoint answers 200 with the EXISTING row when the name is already taken
   * (`backend/src/services/exercise.ts`). Without the de-dupe, a user who typed a name the
   * catalog already had would watch it appear twice — the server did the right thing and
   * the client would have undone it.
   */
  it('replaces the row rather than duplicating it when the server matched an existing name', () => {
    const existing = { ...catalog[0], name: 'Bench Press (updated)' };
    const merged = mergeCreatedExercise(catalog, existing);

    expect(merged).toHaveLength(catalog.length);
    expect(merged.filter((ex) => ex.id === '1')).toHaveLength(1);
    expect(names(merged)).toContain('Bench Press (updated)');
  });

  it('leaves the cached array untouched', () => {
    const before = names(catalog);
    mergeCreatedExercise(catalog, created);
    expect(names(catalog)).toEqual(before);
  });
});

describe('exerciseFacetLabel', () => {
  it('reads both facets in human words', () => {
    expect(exerciseFacetLabel(catalog[0])).toBe('Chest · Barbell');
  });

  it('falls back to the legacy `category` column for equipment', () => {
    expect(exerciseFacetLabel(catalog[4])).toBe('Legs · Bodyweight');
  });

  it('drops the separator rather than leaving a dangling one when a facet is missing', () => {
    expect(exerciseFacetLabel({ id: 'x', name: 'Thing', muscleGroup: 'core' })).toBe('Core');
    expect(exerciseFacetLabel({ id: 'x', name: 'Thing', equipment: 'bands' })).toBe('Bands');
    expect(exerciseFacetLabel({ id: 'x', name: 'Thing' })).toBe('');
  });

  /**
   * A value the label maps know nothing about still has to reach the screen. The catalog
   * carries muscle groups seeded before the closed enum existed, and showing the raw token
   * is strictly better than showing "undefined".
   */
  it('shows an unmapped value as-is instead of blanking it', () => {
    expect(exerciseFacetLabel({ id: 'x', name: 'Thing', muscleGroup: 'neck' })).toBe('neck');
  });
});

/**
 * The filter chips are the closed vocabularies the server validates a user-submitted
 * exercise against (`CATALOG_MUSCLE_GROUPS` / `CATALOG_EQUIPMENT` in
 * `backend/src/schemas/routeSchemas.ts`). If they drift, the create form offers a facet the
 * server rejects with a 400, or the list grows a chip that can never match a row.
 */
describe('facet vocabularies', () => {
  it('offers exactly the muscle groups the server accepts', () => {
    expect([...MUSCLE_FILTERS]).toEqual(['chest', 'back', 'legs', 'shoulders', 'arms', 'core', 'full_body']);
  });

  it('offers exactly the equipment values the server accepts', () => {
    expect([...EQUIPMENT_FILTERS]).toEqual([
      'barbell',
      'dumbbell',
      'cable',
      'machine',
      'bodyweight',
      'kettlebell',
      'bands',
      'other',
    ]);
  });
});

/**
 * The mapper's whole job is folding `null` to `undefined`, and the reason it is a job at all
 * is that `??` stops on `null`. A row whose `equipment` is null and whose `category` holds
 * the value would otherwise render with no gear label — and that is the common shape of a
 * curated row, not an edge case.
 */
describe('apiExerciseToCatalogExercise', () => {
  it('folds nulls so the equipment fallback can still reach `category`', () => {
    const mapped = apiExerciseToCatalogExercise({
      id: '1',
      name: 'Air Squat',
      muscleGroup: 'legs',
      category: 'bodyweight',
      equipment: null,
      imageUrl: null,
      videoUrl: null,
    });

    expect(mapped.equipment).toBeUndefined();
    expect(exerciseFacetLabel(mapped)).toBe('Legs · Bodyweight');
  });

  it('defaults isCustom to false rather than leaving provenance unknown', () => {
    expect(apiExerciseToCatalogExercise({ id: '1', name: 'X' }).isCustom).toBe(false);
    expect(apiExerciseToCatalogExercise({ id: '1', name: 'X', isCustom: true }).isCustom).toBe(true);
  });
});
