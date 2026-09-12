import type { PaginatedResponse } from '../types/api';

/**
 * The single implementation of "read every page of a paginated list endpoint".
 *
 * It used to exist twice — `frontend/src/core/api/client.ts` and
 * `mobile/src/core/api/pagination.ts` held byte-identical copies. Both clients now build
 * theirs from here by handing over their own `request`, so the paging rules (and the bound
 * below) can only ever drift in one place.
 */

export const PAGE_LIMIT = 200; // server caps limit at 200 per page
export const MAX_PAGES = 25; // hard bound — a request path must never read a user's whole history

/** Whatever a client uses to fetch one page. Both clients pass their `request`. */
export type PageRequest = <T>(path: string) => Promise<PaginatedResponse<T>>;

export type RequestAllPages = <T>(path: string) => Promise<PaginatedResponse<T>>;

/**
 * Fetch every page of a paginated list endpoint ({ data, total, hasMore }).
 * Without explicit limit/offset the server returns only the newest 50 rows, which callers
 * used to mistake for the complete dataset (e.g. mobile food-entry totals truncating at 50).
 *
 * The first response carries `total`, so the remaining pages are requested together rather
 * than one after another. Chaining them made the wait scale with history length: ~4,000 food
 * entries meant twenty serialized round-trips before the dashboard painted. When `total` is
 * absent it walks `hasMore` sequentially instead. Both paths stop at MAX_PAGES, so this can
 * never turn into an unbounded whole-history read.
 *
 * This is still a whole-history read. Filtering by date server-side is the real fix —
 * see `backend/data-lifecycle` — but that changes the endpoints' contract, so it is a
 * separate piece of work.
 */
export function createRequestAllPages(request: PageRequest): RequestAllPages {
  return async function requestAllPages<T>(path: string): Promise<PaginatedResponse<T>> {
    const sep = path.includes('?') ? '&' : '?';
    const page = (offset: number) =>
      request<T>(`${path}${sep}limit=${PAGE_LIMIT}&offset=${offset}`);

    const first = await page(0);

    if (!first.hasMore || first.data.length === 0) {
      return {
        data: first.data,
        total: first.total ?? first.data.length,
        limit: first.data.length,
        offset: 0,
        hasMore: false,
      };
    }

    const data = [...first.data];

    if (first.total != null) {
      // `total` is known, so the outstanding pages can all be requested at once.
      const remaining = Math.min(
        Math.ceil((first.total - data.length) / PAGE_LIMIT),
        MAX_PAGES - 1
      );
      const rest = await Promise.all(
        Array.from({ length: remaining }, (_, i) => page((i + 1) * PAGE_LIMIT))
      );
      for (const res of rest) data.push(...res.data);
      return { data, total: first.total, limit: data.length, offset: 0, hasMore: data.length < first.total };
    }

    // No `total` to plan against — fall back to walking `hasMore` one page at a time.
    // Slower, but it must not stop at page one and report the result as complete.
    let more: boolean = first.hasMore;
    for (let pageIndex = 1; more && pageIndex < MAX_PAGES; pageIndex++) {
      const res = await page(data.length);
      data.push(...res.data);
      more = res.hasMore && res.data.length > 0;
    }
    return { data, total: data.length, limit: data.length, offset: 0, hasMore: more };
  };
}
