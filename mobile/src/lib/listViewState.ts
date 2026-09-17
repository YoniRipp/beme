/**
 * What a list screen should render: exactly one of loading, error, empty, or the list.
 *
 * Extracted from `GoalsScreen`, which had it first and for a reason worth repeating: every
 * screen here computed `data ?? []` and rendered an empty state, so **a failed request and an
 * account with no data looked identical**. A user whose API call 500s is told "No workouts
 * yet." — and so is a reviewer opening a build pointed at the wrong API URL, who sees a
 * polished, permanently empty app with no error anywhere and no way to tell why.
 *
 * The rules, in order, because the order is the whole content:
 *
 * - **Loading wins.** A refetch that fails should not flash its error over a spinner.
 * - **An error renders above whatever content there is**, rather than replacing it. Stale data
 *   with "couldn't refresh" on top is more useful than a blank screen.
 * - **Empty means empty, not failed.** `empty` is false while an error is showing, which is
 *   the bug this exists to prevent.
 *
 * Pure and exported so it can be tested without mounting a screen — the branch is the part
 * that is easy to get wrong, and a render test of it needs a whole query client.
 */
export interface ListViewState {
  loading: boolean;
  error: string | null;
  empty: boolean;
  list: boolean;
}

export function listViewState(input: {
  loading: boolean;
  error: string | null;
  count: number;
}): ListViewState {
  if (input.loading) {
    return { loading: true, error: null, empty: false, list: false };
  }
  const hasRows = input.count > 0;
  return {
    loading: false,
    error: input.error,
    empty: !hasRows && !input.error,
    list: hasRows,
  };
}
