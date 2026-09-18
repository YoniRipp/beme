import type { QueryClient, QueryKey } from '@tanstack/react-query';

/**
 * What a list query caches: the rows, plus whether the pager stopped before the end of the
 * user's history.
 *
 * The flag has to live in the cache entry rather than beside it, because a value read with
 * `getQueryData` does not re-render a component when it changes — a page would keep claiming
 * a complete history until something else happened to refresh it.
 *
 * Mirrors `mobile/src/lib/cachedList.ts`. The two clients had the same bug for the same
 * reason, so they get the same shape.
 */
export type CachedList<T> = { items: T[]; truncated: boolean };

/**
 * Apply a mutation's optimistic update to a cached list, leaving `truncated` alone.
 *
 * Every call site used to read `(prev: T[] | undefined)` directly. Routing them through here
 * means adding a row cannot silently drop the truncation flag, which is the mistake that
 * produced the bug this type exists to fix.
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
