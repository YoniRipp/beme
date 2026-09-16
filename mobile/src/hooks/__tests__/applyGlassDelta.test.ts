import { applyGlassDelta, ML_PER_GLASS } from '../useWater';

/**
 * The optimistic cache write behind the water card's `+` / `−`.
 *
 * Pinned as a plain function rather than through `useWater` because a QueryClient left alive
 * in a jest run leaves a notifyManager batch timer that hangs the suite (the reason every
 * other hook in this app exports its logic — see `buildWorkoutUpdateBody`).
 *
 * WHY IT IS A DELTA AND NOT A SNAPSHOT. Taps outrun replies on the most-tapped control in
 * the app, so several are in flight at once. Deltas compose: three `+1`s applied in any
 * order land on 3, and one of them failing subtracts its own 1 back without discarding the
 * other two. A `previous`-snapshot rollback — which is what an absolute set can do, because
 * there is only ever one correct value — would undo the taps that succeeded.
 */

const entry = (glasses: number) => ({
  date: '2026-09-16',
  glasses,
  mlTotal: glasses * ML_PER_GLASS,
});

describe('applyGlassDelta', () => {
  it('adds and removes one glass', () => {
    expect(applyGlassDelta(entry(3), 1, '2026-09-16').glasses).toBe(4);
    expect(applyGlassDelta(entry(3), -1, '2026-09-16').glasses).toBe(2);
  });

  it('keeps millilitres in step with the count', () => {
    expect(applyGlassDelta(entry(3), 1, '2026-09-16').mlTotal).toBe(4 * ML_PER_GLASS);
    expect(applyGlassDelta(entry(3), -1, '2026-09-16').mlTotal).toBe(2 * ML_PER_GLASS);
  });

  /** The SQL clamps with `GREATEST(0, …)`; the optimistic value must not disagree with it. */
  it('clamps at zero rather than going negative', () => {
    const cleared = applyGlassDelta(entry(0), -1, '2026-09-16');
    expect(cleared.glasses).toBe(0);
    expect(cleared.mlTotal).toBe(0);
  });

  /**
   * `GET /api/water-entries` synthesises `{ glasses: 0, mlTotal: 0, date }` for a day with no
   * row (`backend/src/controllers/water.ts:15`), but the cache can also be empty outright —
   * the first tap must not produce `NaN` glasses.
   */
  it('starts from zero when nothing is cached yet', () => {
    const first = applyGlassDelta(undefined, 1, '2026-09-16');
    expect(first).toEqual({ date: '2026-09-16', glasses: 1, mlTotal: ML_PER_GLASS });
  });

  it('composes, which is what makes concurrent taps safe', () => {
    let state = applyGlassDelta(undefined, 1, '2026-09-16');
    state = applyGlassDelta(state, 1, '2026-09-16');
    state = applyGlassDelta(state, 1, '2026-09-16');
    expect(state.glasses).toBe(3);

    // One of the three fails and undoes its own delta; the other two stand.
    state = applyGlassDelta(state, -1, '2026-09-16');
    expect(state.glasses).toBe(2);
  });

  it('preserves the row id so a later write is still an update, not an insert', () => {
    const withId = { id: 'w1', date: '2026-09-16', glasses: 2, mlTotal: 500 };
    expect(applyGlassDelta(withId, 1, '2026-09-16').id).toBe('w1');
  });

  it('agrees with the backend on what a glass is worth', () => {
    // backend/src/models/water.ts inserts 250ml per glass.
    expect(ML_PER_GLASS).toBe(250);
  });
});
