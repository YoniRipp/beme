/**
 * The contract both weight and water reads depend on.
 *
 * `frontend/src/hooks/useWeight.ts` and `mobile/src/hooks/useWeight.ts` bound their reads by
 * sending `limit`, and the SQL only gets a LIMIT if this helper returns something
 * (`backend/src/models/weight.ts`). If it silently dropped the value, both clients would go
 * back to reading a user's entire history — critical rule 6 — and nothing else would notice.
 *
 * The `undefined` case is equally load-bearing in the other direction: it is what lets older
 * callers that send neither parameter keep their unpaginated responses.
 */
import { describe, it, expect } from 'vitest';
import { parseOptionalPagination } from './pagination.js';

describe('parseOptionalPagination', () => {
  it('returns undefined when the caller sends neither parameter', () => {
    expect(parseOptionalPagination({})).toBeUndefined();
    expect(parseOptionalPagination({ startDate: '2026-09-01' })).toBeUndefined();
  });

  it('passes a requested limit through so it can reach SQL', () => {
    expect(parseOptionalPagination({ limit: '30' })).toEqual({ limit: 30, offset: 0 });
  });

  it('clamps the limit to 1..200', () => {
    expect(parseOptionalPagination({ limit: '5000' })?.limit).toBe(200);
    expect(parseOptionalPagination({ limit: '0' })?.limit).toBe(50);
    expect(parseOptionalPagination({ limit: '-10' })?.limit).toBe(1);
  });

  it('falls back to a bounded default rather than to no bound', () => {
    // The point of the fallback: garbage in must not mean "return everything".
    expect(parseOptionalPagination({ limit: 'abc' })).toEqual({ limit: 50, offset: 0 });
    expect(parseOptionalPagination({ offset: '10' })).toEqual({ limit: 50, offset: 10 });
  });

  it('never returns a negative offset', () => {
    expect(parseOptionalPagination({ offset: '-5' })?.offset).toBe(0);
    expect(parseOptionalPagination({ limit: '10', offset: 'abc' })?.offset).toBe(0);
  });
});
