/**
 * The weight read is bounded, and stays bounded.
 *
 * `useWeight` used to call `weightApi.list()` with no arguments. The endpoint paginates only
 * when asked (`backend/src/controllers/weight.ts`, via `parseOptionalPagination`), so that
 * read returned a user's entire weight history on every Home render — to draw a seven-bar
 * sparkline. Critical rule 6.
 *
 * Both cases below fail if the bound is removed: the first if the query stops sending a
 * limit, the second if the cache is allowed to grow past what the query itself would return.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WEIGHT_HISTORY_LIMIT } from '@trackvibe/shared/domain';

const list = vi.fn();
const add = vi.fn();

vi.mock('@/core/api/health', () => ({
  weightApi: {
    list: (...args: unknown[]) => list(...args),
    add: (...args: unknown[]) => add(...args),
    delete: vi.fn(),
  },
}));

import { useWeight } from './useWeight';

/** `YYYY-MM-DD`, counting backwards from a fixed day so the rows sort predictably. */
function entriesBack(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(2026, 8, 16));
    date.setUTCDate(date.getUTCDate() - i);
    return { id: `e${i}`, date: date.toISOString().slice(0, 10), weight: 80 - i * 0.1 };
  });
}

/**
 * One client per test, built outside the component. Creating it inside the wrapper's body
 * makes a fresh cache on every re-render, so a `setQueryData` write is discarded by the next
 * render and the mutation cases silently prove nothing.
 */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe('useWeight', () => {
  beforeEach(() => {
    list.mockReset();
    add.mockReset();
  });

  it('asks the server for a bounded number of rows', async () => {
    list.mockResolvedValue([]);

    const { result } = renderHook(() => useWeight(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.weightLoading).toBe(false));

    expect(list).toHaveBeenCalledTimes(1);
    const params = list.mock.calls[0][0] as { limit?: number } | undefined;
    // Not just "some argument" — an unbounded read is exactly what this test exists to catch,
    // and `list()` or `list({})` both leave the limit off the query string.
    expect(params?.limit).toBe(WEIGHT_HISTORY_LIMIT);
  });

  it('keeps the cached list within the same bound after logging a weight', async () => {
    // A full page of history already cached, then one more entry logged on top of it.
    list.mockResolvedValue(entriesBack(WEIGHT_HISTORY_LIMIT));
    const created = { id: 'new', date: '2026-09-17', weight: 79.4 };
    add.mockResolvedValue(created);

    const { result } = renderHook(() => useWeight(), { wrapper: makeWrapper() });
    await waitFor(() =>
      expect(result.current.weightEntries).toHaveLength(WEIGHT_HISTORY_LIMIT)
    );

    await act(async () => {
      await result.current.addWeight({ date: created.date, weight: created.weight });
    });

    // `setQueryData` lands in the cache before React commits the re-render, so read the
    // hook's own view through waitFor rather than snapshotting it a tick too early.
    await waitFor(() => expect(result.current.latestWeight).toMatchObject({ id: 'new' }));
    expect(result.current.weightEntries).toHaveLength(WEIGHT_HISTORY_LIMIT);
  });

  it('replaces the same day rather than logging it twice', async () => {
    const existing = { id: 'today', date: '2026-09-16', weight: 80 };
    list.mockResolvedValue([existing]);
    const created = { id: 'today-again', date: '2026-09-16', weight: 79.2 };
    add.mockResolvedValue(created);

    const { result } = renderHook(() => useWeight(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.weightEntries).toHaveLength(1));

    await act(async () => {
      await result.current.addWeight({ date: created.date, weight: created.weight });
    });

    await waitFor(() =>
      expect(result.current.weightEntries[0]).toMatchObject({ id: 'today-again' })
    );
    expect(result.current.weightEntries).toHaveLength(1);
  });
});
