import { request } from './client';
import type { PaginatedResponse } from '../../types/api';

// Ports frontend/src/core/api/client.ts's requestAllPages so both clients behave
// identically against the same paginated endpoints (see backend/src/schemas/routeSchemas.ts's
// paginationSchema — limit is hard-capped at 200 server-side).
//
// Kept in its own module rather than folded into `food.ts` or `client.ts`: it depends on
// nothing but `request`, so it is a self-contained unit today and a straightforward lift into
// `@trackvibe/shared` once the shared API transport is extracted there.

const PAGE_LIMIT = 200; // server caps limit at 200 per page
const MAX_PAGES = 25; // hard bound — a request path must never read a user's whole history

/**
 * Fetch every page of a paginated list endpoint ({ data, total, hasMore }).
 * Without explicit limit/offset the server returns only the newest 50 rows, which callers
 * used to mistake for the complete dataset (e.g. mobile food-entry totals truncating at 50).
 *
 * The first response carries `total` when known, so the remaining pages are requested
 * together rather than one after another. Otherwise it walks `hasMore` sequentially. Both
 * paths are capped at MAX_PAGES so this can never turn into an unbounded whole-history read.
 */
export async function requestAllPages<T>(path: string): Promise<PaginatedResponse<T>> {
  const sep = path.includes('?') ? '&' : '?';
  const page = (offset: number) =>
    request<PaginatedResponse<T>>(`${path}${sep}limit=${PAGE_LIMIT}&offset=${offset}`);

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
}
