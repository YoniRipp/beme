import { createRequestAllPages } from '@trackvibe/shared/api';
import { request } from './client';
import type { PaginatedResponse } from '../../types/api';

// The paging algorithm itself now lives in @trackvibe/shared/api — there is one copy, shared
// with the web client, so the two can no longer drift. See that module for why the bound
// (PAGE_LIMIT / MAX_PAGES) exists and why this is still a whole-history read.

export const requestAllPages = createRequestAllPages(
  <T>(path: string) => request<PaginatedResponse<T>>(path),
);
