import { listViewState } from '../listViewState';

/**
 * The bug this encodes: every list screen rendered `data ?? []`, so a failed request and an
 * account with no data produced the same screen. A user whose fetch 500s was told "No workouts
 * yet", and so was anyone running a build pointed at the wrong API URL — a polished,
 * permanently empty app with no error anywhere.
 *
 * `empty` being false while an error is showing is therefore the assertion that matters most
 * here, not a detail.
 */
describe('listViewState', () => {
  const FAILED = 'Could not load entries.';

  it('never calls a failed request empty', () => {
    const view = listViewState({ loading: false, error: FAILED, count: 0 });

    expect(view.error).toBe(FAILED);
    expect(view.empty).toBe(false);
    expect(view.list).toBe(false);
  });

  it('calls it empty only when the request succeeded and returned nothing', () => {
    const view = listViewState({ loading: false, error: null, count: 0 });

    expect(view.empty).toBe(true);
    expect(view.error).toBeNull();
  });

  it('shows an error above content it already has, rather than replacing it', () => {
    const view = listViewState({ loading: false, error: FAILED, count: 3 });

    expect(view.error).toBe(FAILED);
    expect(view.list).toBe(true);
    expect(view.empty).toBe(false);
  });

  it('lets loading win, so a failing refetch does not flash over the spinner', () => {
    const view = listViewState({ loading: true, error: FAILED, count: 0 });

    expect(view.loading).toBe(true);
    expect(view.error).toBeNull();
    expect(view.empty).toBe(false);
    expect(view.list).toBe(false);
  });
});
