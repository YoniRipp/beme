import { goalsViewState } from '../GoalsScreen';

/**
 * GoalsScreen destructured `{ goals, goalsLoading, deleteGoal }` and never read
 * `goalsError`, which `useGoals` has always returned. When GET /api/goals fails,
 * `goalsLoading` is false and `goals` falls back to `[]` — so the screen rendered the
 * first-run empty state: "No goals yet / Set your first wellness goal / Add Goal". A user
 * whose goals are all still on the server was told they had none and invited to recreate
 * one, which is how you end up with duplicates.
 *
 * These pin `goalsViewState`, the pure branch the screen now renders from, without mounting
 * it (a QueryClient left over in a jest run leaves a notifyManager batch timer that hangs
 * the suite — see hooks/useWorkouts.ts's buildWorkoutUpdateBody, and GoalsScreen's own
 * goalsWithCurrent, for the same reasoning).
 */

const FAILED = 'Could not load goals.';

describe('goalsViewState', () => {
  it('THE BUG: a failed fetch does not render the first-run empty state', () => {
    const view = goalsViewState({ loading: false, error: FAILED, goalCount: 0 });
    expect(view.empty).toBe(false);
    expect(view.error).toBe(FAILED);
  });

  it('still renders the empty state when the fetch succeeded and returned nothing', () => {
    const view = goalsViewState({ loading: false, error: null, goalCount: 0 });
    expect(view.empty).toBe(true);
    expect(view.error).toBeNull();
    expect(view.list).toBe(false);
  });

  it('renders the list, and no empty state, when there are goals', () => {
    const view = goalsViewState({ loading: false, error: null, goalCount: 3 });
    expect(view.list).toBe(true);
    expect(view.empty).toBe(false);
    expect(view.error).toBeNull();
  });

  it('keeps cached goals on screen under the error when a refetch fails', () => {
    // The web's ContentWithLoading renders `error` above its children rather than instead
    // of them: "we could not refresh, here is what we have" beats a blank screen.
    const view = goalsViewState({ loading: false, error: FAILED, goalCount: 2 });
    expect(view.list).toBe(true);
    expect(view.error).toBe(FAILED);
    expect(view.empty).toBe(false);
  });

  it('shows only the spinner while loading, even if a previous attempt errored', () => {
    const view = goalsViewState({ loading: true, error: FAILED, goalCount: 0 });
    expect(view).toEqual({ loading: true, error: null, empty: false, list: false });
  });

  it('never claims both the empty state and an error, for any combination of inputs', () => {
    for (const loading of [true, false]) {
      for (const error of [null, FAILED]) {
        for (const goalCount of [0, 1, 5]) {
          const view = goalsViewState({ loading, error, goalCount });
          expect(view.empty && !!view.error).toBe(false);
          expect(view.empty && view.list).toBe(false);
        }
      }
    }
  });
});
