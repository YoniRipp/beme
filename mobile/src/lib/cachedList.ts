import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * What a list query caches: the rows, plus whether the pager stopped before the end of the
 * user's history.
 *
 * The flag has to live in the cache entry rather than beside it, because a value read with
 * `getQueryData` does not re-render a component when it changes — a screen would keep
 * claiming a complete history until something else happened to refresh it.
 */
export type CachedList<T> = { items: T[]; truncated: boolean };

/**
 * Apply a mutation's optimistic update to a cached list, leaving `truncated` alone.
 *
 * Every call site used to read `(prev: T[] | undefined)` directly. Routing them through here
 * means adding a row cannot silently drop the truncation flag, which is the mistake that
 * produced the bug this type exists to fix.
 *
 * An update that arrives before the list has loaded seeds the entry, matching what the old
 * `prev ? [...prev, x] : [x]` spelling did. `truncated: false` is right for a seeded entry:
 * one locally-added row is not a truncated history, and the pending fetch overwrites it.
 */
export function updateCachedList<T>(
  queryClient: QueryClient,
  key: QueryKey,
  update: (previous: T[]) => T[],
): void {
  queryClient.setQueryData(key, (previous: CachedList<T> | undefined) =>
    previous
      ? { ...previous, items: update(previous.items) }
      : { items: update([]), truncated: false },
  );
}
