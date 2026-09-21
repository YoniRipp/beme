import { request } from './client';
import { EXERCISE_CATALOG_LIMIT } from '@trackvibe/shared/constants';

/**
 * Wire shape of one catalog exercise, as `GET /api/exercises` actually returns it.
 *
 * Kept in step with the backend's `rowToExercise` (`backend/src/models/exercise.ts`) and
 * character-for-character with the web's copy (`frontend/src/core/api/exercises.ts`) — the
 * two clients read the same endpoint, so a field that is optional on one and required on
 * the other is a bug waiting for whichever client guessed wrong.
 *
 * Everything past `name` is nullable because the catalog is a merge of two sources: 117
 * hand-curated rows and ~873 imported from free-exercise-db
 * (`backend/migrations/1776100000000_seed-full-exercise-catalog.js`), and the curated ones
 * win on conflict via COALESCE. A row can therefore carry a `category` but no `equipment`,
 * or a photo but no `level`.
 */
export interface ApiCatalogExercise {
  id: string;
  name: string;
  muscleGroup?: string | null;
  /** Equipment-valued, kept for backward compatibility; prefer `equipment`. */
  category?: string | null;
  equipment?: string | null;
  discipline?: string | null;
  level?: string | null;
  mechanic?: string | null;
  force?: string | null;
  primaryMuscles?: string[] | null;
  secondaryMuscles?: string[] | null;
  imageUrl?: string | null;
  imageUrl2?: string | null;
  videoUrl?: string | null;
  /** True for movements a user added from the picker rather than the seeded catalog. */
  isCustom?: boolean;
}

export interface CreateCustomExercise {
  name: string;
  muscleGroup?: string;
  equipment?: string;
}

/**
 * The exercise catalog.
 *
 * **This endpoint is NOT paginated, so `core/api/pagination.ts` deliberately does not
 * appear here.** That helper (and `workouts.ts`'s `listAll`) exists for endpoints that
 * answer with a `PaginatedResponse<T>` envelope — `{ data, total, limit, offset, hasMore }` —
 * and follow `hasMore` to the end. `GET /api/exercises` answers with a **bare JSON array**:
 * the controller is `sendJson(res, await exerciseService.list(filters))` over a model that
 * returns `CatalogExercise[]`, and `backend/src/routes/exercises.test.ts` pins it —
 * `expect(res.body).toEqual([exercise])`, not `res.body.data`. Handing that response to
 * `requestAllPages` would read `hasMore` off an array (always `undefined`, so one page) and
 * `data` off an array (always `undefined`, so zero rows): an empty catalog, silently, with
 * no error to notice.
 *
 * It does take `limit`/`offset` — `exerciseListQuerySchema` in
 * `backend/src/schemas/routeSchemas.ts`, `limit` defaulting to 500 and capped at 1000, a
 * value above which is a 400 rather than a clamp. So one request with `limit` pinned to the
 * server's own maximum is the whole catalog, which is what the web does and what this does.
 * `EXERCISE_CATALOG_LIMIT` is the shared constant holding that 1000 so the two clients
 * cannot drift apart from the server's cap independently.
 *
 * The server also accepts `q`, `muscleGroup`, `equipment`, `level` and `discipline` as
 * server-side filters. They are not used: the catalog is ~900 rows fetched once and cached
 * for ten minutes, so filtering in memory is instant and typing in the search box costs no
 * requests. The web made the same call. Should the catalog ever outgrow one request, those
 * params are the migration path, and `limit`'s hard 1000 ceiling is the signal to take it.
 */
export const exercisesApi = {
  list: () => request<ApiCatalogExercise[]>(`/api/exercises?limit=${EXERCISE_CATALOG_LIMIT}`),

  /**
   * Adds the movement to the SHARED catalog — every user gets it, not just the author
   * (`backend/src/services/exercise.ts`). A name already in the catalog is not an error:
   * the server answers 200 with the existing row instead of 201 with a new one, so the
   * caller always ends up holding a usable exercise. Both statuses arrive here as a
   * resolved promise, which is why nothing in this client branches on which it was.
   */
  add: (body: CreateCustomExercise) =>
    request<ApiCatalogExercise>('/api/exercises', { method: 'POST', body }),
};
