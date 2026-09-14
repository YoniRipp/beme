import { describe, it, expect, vi } from 'vitest';
import { createRequestAllPages, PAGE_LIMIT, MAX_PAGES } from '../pagination';
import type { PaginatedResponse } from '../../types/api';

function page(count: number, total: number | null, offset: number, hasMore: boolean): PaginatedResponse<{ id: number }> {
  return {
    data: Array.from({ length: count }, (_, i) => ({ id: offset + i })),
    total: total as number,
    limit: PAGE_LIMIT,
    offset,
    hasMore,
  };
}

describe('createRequestAllPages', () => {
  it('asks for an explicit limit and offset', async () => {
    const request = vi.fn().mockResolvedValue(page(0, 0, 0, false));
    await createRequestAllPages(request)('/api/workouts');

    expect(request).toHaveBeenCalledWith('/api/workouts?limit=200&offset=0');
  });

  it('keeps an existing query string and joins with &', async () => {
    const request = vi.fn().mockResolvedValue(page(0, 0, 0, false));
    await createRequestAllPages(request)('/api/food-entries?date=2026-01-01');

    expect(request).toHaveBeenCalledWith('/api/food-entries?date=2026-01-01&limit=200&offset=0');
  });

  it('returns a single page unchanged when there is no more', async () => {
    const request = vi.fn().mockResolvedValue(page(3, 3, 0, false));
    const result = await createRequestAllPages(request)<{ id: number }>('/api/workouts');

    expect(request).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ data: [{ id: 0 }, { id: 1 }, { id: 2 }], total: 3, limit: 3, offset: 0, hasMore: false });
  });

  it('fans the remaining pages out in parallel when total is known', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(page(PAGE_LIMIT, 450, 0, true))
      .mockResolvedValueOnce(page(PAGE_LIMIT, 450, 200, true))
      .mockResolvedValueOnce(page(50, 450, 400, false));

    const result = await createRequestAllPages(request)<{ id: number }>('/api/food-entries');

    expect(request).toHaveBeenCalledTimes(3);
    expect(request).toHaveBeenNthCalledWith(2, '/api/food-entries?limit=200&offset=200');
    expect(request).toHaveBeenNthCalledWith(3, '/api/food-entries?limit=200&offset=400');
    expect(result.data).toHaveLength(450);
    expect(result.total).toBe(450);
    expect(result.hasMore).toBe(false);
  });

  it('walks hasMore one page at a time when total is absent', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(page(PAGE_LIMIT, null, 0, true))
      .mockResolvedValueOnce(page(PAGE_LIMIT, null, 200, true))
      .mockResolvedValueOnce(page(10, null, 400, false));

    const result = await createRequestAllPages(request)<{ id: number }>('/api/workouts');

    expect(request).toHaveBeenCalledTimes(3);
    expect(result.data).toHaveLength(410);
    expect(result.hasMore).toBe(false);
  });

  it('stops at MAX_PAGES when total is known, so one request can never read a whole history', async () => {
    const request = vi.fn().mockImplementation((path: string) => {
      const offset = Number(new URL(path, 'http://x').searchParams.get('offset'));
      return Promise.resolve(page(PAGE_LIMIT, 1_000_000, offset, true));
    });

    const result = await createRequestAllPages(request)<{ id: number }>('/api/food-entries');

    expect(request).toHaveBeenCalledTimes(MAX_PAGES);
    expect(result.data).toHaveLength(PAGE_LIMIT * MAX_PAGES);
    expect(result.hasMore).toBe(true);
  });

  it('stops at MAX_PAGES when walking hasMore too', async () => {
    const request = vi.fn().mockImplementation((path: string) => {
      const offset = Number(new URL(path, 'http://x').searchParams.get('offset'));
      return Promise.resolve(page(PAGE_LIMIT, null, offset, true));
    });

    const result = await createRequestAllPages(request)<{ id: number }>('/api/workouts');

    expect(request).toHaveBeenCalledTimes(MAX_PAGES);
    expect(result.data).toHaveLength(PAGE_LIMIT * MAX_PAGES);
    expect(result.hasMore).toBe(true);
  });

  it('stops walking when a page comes back empty even though hasMore is true', async () => {
    const request = vi.fn()
      .mockResolvedValueOnce(page(PAGE_LIMIT, null, 0, true))
      .mockResolvedValueOnce(page(0, null, 200, true));

    const result = await createRequestAllPages(request)<{ id: number }>('/api/workouts');

    expect(request).toHaveBeenCalledTimes(2);
    expect(result.data).toHaveLength(PAGE_LIMIT);
    expect(result.hasMore).toBe(false);
  });

  it('keeps the page bound at 200 rows and 25 pages', () => {
    expect(PAGE_LIMIT).toBe(200);
    expect(MAX_PAGES).toBe(25);
  });
});
