import { createRequestAllPages } from '@trackvibe/shared/api';
import { request } from './client';
import type { PaginatedResponse } from '../../types/api';

// The paging algorithm itself now lives in @trackvibe/shared/api — there is one copy, shared
// with the web client, so the two can no longer drift. See that module for why the bound
// (PAGE_LIMIT / MAX_PAGES) exists and why this is still a whole-history read.

export const requestAllPages = createRequestAllPages(
  <T>(path: string) => request<PaginatedResponse<T>>(path),
);

/**
 * What a `listAll()` returns: the rows, and whether the pager stopped before the end.
 *
 * `requestAllPages` has always reported truncation honestly on both of its return paths, and
 * every caller threw it away — so a user past MAX_PAGES x PAGE_LIMIT rows saw a short history
 * rendered as their complete one, with nothing to indicate otherwise. Returning a pair rather
 * than a bare array is what makes the signal impossible to drop by accident.
 */
export type ListAllResult<T> = { items: T[]; truncated: boolean };

/** `requestAllPages`, with the truncation flag kept instead of discarded. */
export async function listAllPages<T>(path: string): Promise<ListAllResult<T>> {
  const result = await requestAllPages<T>(path);
  return { items: result.data, truncated: result.hasMore };
}
