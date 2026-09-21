import { EXERCISE_CATALOG_LIMIT } from '@trackvibe/shared/constants';
import { exercisesApi } from '../exercises';

const mockRequest = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

/**
 * A row exactly as `GET /api/exercises` sends one — the shape
 * `backend/src/routes/exercises.test.ts` pins on the server side, nulls and all.
 */
const wireRow = {
  id: 'ex-1',
  name: 'Bench Press',
  muscleGroup: 'chest',
  category: 'barbell',
  equipment: 'barbell',
  imageUrl: 'https://img.example/bench.jpg',
  videoUrl: null,
  isCustom: false,
};

describe('exercisesApi.list', () => {
  beforeEach(() => {
    mockRequest.mockReset().mockResolvedValue([]);
  });

  /**
   * THE CONTRACT THIS FILE EXISTS FOR.
   *
   * `GET /api/exercises` answers with a **bare JSON array**, not the
   * `{ data, total, limit, offset, hasMore }` envelope that `/api/workouts` and friends use.
   * The controller is `sendJson(res, await exerciseService.list(filters))` over a model
   * returning `CatalogExercise[]`, and the server's own route test asserts
   * `expect(res.body).toEqual([exercise])`.
   *
   * That matters because `core/api/pagination.ts` sits right next to this module and is the
   * obvious thing to reach for. Feeding it this endpoint fails SILENTLY: `requestAllPages`
   * reads `.hasMore` off an array (undefined -> one page) and `.data` off an array
   * (undefined -> no rows), so the catalog arrives empty with no error anywhere. This case
   * fails loudly the moment someone wraps the list in a pager.
   */
  it('returns the response array itself, because the endpoint is not paginated', async () => {
    mockRequest.mockResolvedValueOnce([wireRow]);

    await expect(exercisesApi.list()).resolves.toEqual([wireRow]);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  /**
   * One request, not a paging loop. `exerciseListQuerySchema` caps `limit` at 1000 and
   * REJECTS anything above it with a 400 rather than clamping, so the shared constant is
   * both the ceiling and the whole catalog in one call (~900 rows today).
   */
  it('asks for the catalog in one request, at the server\'s own maximum limit', async () => {
    await exercisesApi.list();

    expect(mockRequest).toHaveBeenCalledWith(`/api/exercises?limit=${EXERCISE_CATALOG_LIMIT}`);
    expect(EXERCISE_CATALOG_LIMIT).toBe(1000);
  });

  /**
   * The server's default is 500 (`exerciseListQuerySchema`), which is well under the
   * catalog's size — omitting `limit` would silently return the first 500 names
   * alphabetically and hide everything from "L" onward. This is why the query string is not
   * optional.
   */
  it('never sends a bare path, which would take the server default of 500 and clip the catalog', async () => {
    await exercisesApi.list();

    expect(mockRequest).not.toHaveBeenCalledWith('/api/exercises');
  });
});

describe('exercisesApi.add', () => {
  beforeEach(() => {
    mockRequest.mockReset().mockResolvedValue(wireRow);
  });

  it('POSTs the three fields the server accepts from a user', async () => {
    await exercisesApi.add({ name: 'Zercher Squat', muscleGroup: 'legs', equipment: 'barbell' });

    expect(mockRequest).toHaveBeenCalledWith('/api/exercises', {
      method: 'POST',
      body: { name: 'Zercher Squat', muscleGroup: 'legs', equipment: 'barbell' },
    });
  });

  /**
   * Both facets are optional on `createCustomExerciseSchema`, and the client must not
   * invent values for them — a free-text or guessed muscle group would create a row no
   * filter chip can reach, which is the exact failure the server's closed enums prevent.
   */
  it('sends a name on its own when the user picked no facets', async () => {
    await exercisesApi.add({ name: 'Jefferson Curl' });

    expect(mockRequest.mock.calls[0][1].body).toEqual({ name: 'Jefferson Curl' });
  });

  /**
   * An existing name is answered 200-with-the-existing-row rather than 201, and both are
   * successes as far as `fetch` is concerned. Nothing here may branch on the status: the
   * caller's contract is "you get back a usable exercise", which is what makes
   * create-then-select work for a movement that turned out to already exist.
   */
  it('resolves with the exercise whether the server created one or matched an existing name', async () => {
    const existing = { ...wireRow, id: 'ex-existing' };
    mockRequest.mockResolvedValueOnce(existing);

    await expect(exercisesApi.add({ name: 'bench press' })).resolves.toEqual(existing);
  });
});
