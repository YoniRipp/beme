import { QueryClient } from '@tanstack/react-query';
import { isUnauthorized } from '../core/api/client';

/**
 * One retry for anything that might be transient, none for a 401.
 *
 * By the time a 401 surfaces here `request` has already cleared the token and told the auth
 * context to log the user out -- the session is gone, and asking again only spends another
 * round-trip of the user's mobile data to be told so a second time.
 *
 * Kept in step with `frontend/src/lib/queryClient.ts`. Library defaults are not a shared
 * baseline: a bare `new QueryClient()` retries three times with exponential backoff, so a
 * dead session cost four requests here against the web client's two.
 */
export function shouldRetry(failureCount: number, error: unknown): boolean {
  return !isUnauthorized(error) && failureCount < 1;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      retry: shouldRetry,
    },
  },
});
