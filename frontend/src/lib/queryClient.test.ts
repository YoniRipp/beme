/**
 * Retry policy. A 401 never becomes a 200 by asking again: the token is gone, and every
 * extra attempt is another wasted round-trip and another `auth:logout` dispatch. Anything
 * that might be transient keeps the single retry the client has always had.
 */
import { describe, it, expect } from 'vitest';
import { shouldRetry } from './queryClient';
import { ApiError } from '@/core/api/client';

describe('shouldRetry', () => {
  it('does not retry an unauthorized response', () => {
    expect(shouldRetry(0, new ApiError('Session expired', 401))).toBe(false);
  });

  it('retries a server error once', () => {
    expect(shouldRetry(0, new ApiError('Internal Server Error', 500))).toBe(true);
  });

  it('stops after a single retry', () => {
    expect(shouldRetry(1, new ApiError('Internal Server Error', 500))).toBe(false);
  });

  it('retries a network failure, which carries no status at all', () => {
    expect(shouldRetry(0, new Error('Failed to fetch'))).toBe(true);
  });
});
