/**
 * The cycle read is bounded, and the day count is honest.
 *
 * `useCycle` used to call `cycleApi.list()` with no arguments. That endpoint takes a date
 * window and offers no pagination at all, so the call returned a user's entire cycle history
 * on every Home render — critical rule 6, and the same shape as the `useWeight` bug.
 *
 * The second case is the user-visible half. `currentCycleDay` counts from the newest period
 * start *in what was fetched*, so without a window an account that logged once and stopped was
 * told it was on "Day 214 of ~28" and `CycleTracker` drew its ring full.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CYCLE_WINDOW_DAYS } from '@trackvibe/shared/domain';

const list = vi.fn();

vi.mock('@/core/api/health', () => ({
  cycleApi: {
    list: (...args: unknown[]) => list(...args),
    add: vi.fn(),
    delete: vi.fn(),
  },
}));

import { useCycle } from './useCycle';

/** One client per test, built outside the component so a re-render cannot reset the cache. */
function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

const NOW = new Date(2026, 8, 16, 9, 0);

describe('useCycle', () => {
  beforeEach(() => list.mockReset());

  it('asks the server for a bounded date window', async () => {
    list.mockResolvedValue([]);

    const { result } = renderHook(() => useCycle(NOW), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.cycleLoading).toBe(false));

    expect(list).toHaveBeenCalledTimes(1);
    const [startDate, endDate] = list.mock.calls[0] as [string, string];
    // Not just "some argument": `list()` and `list(undefined, undefined)` both send no window.
    expect(endDate).toBe('2026-09-16');
    expect(startDate).toBe('2026-03-20');
    expect(CYCLE_WINDOW_DAYS).toBe(180);
  });

  it('counts the cycle day from the most recent period start', async () => {
    list.mockResolvedValue([{ id: 'a', date: '2026-09-10', periodStart: true }]);

    const { result } = renderHook(() => useCycle(NOW), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.currentCycleDay).not.toBeNull());

    expect(result.current.currentCycleDay).toBe(7);
    expect(result.current.lastPeriodStart).toBe('2026-09-10');
  });

  it('routes the day count through the shared helper', async () => {
    // Deliberately NOT claiming to prove the calendar-day arithmetic. In UTC — which is what
    // the runner uses — the old millisecond division agrees with the correct answer, so an
    // assertion here would pass against either implementation; a first draft of this case did
    // exactly that and let a deliberate revert go green. The arithmetic is proven in
    // `packages/shared/src/domain/__tests__/cycle.test.ts`, which sets TZ to the zones where
    // the two genuinely disagree. This case pins only that the hook is wired to it.
    list.mockResolvedValue([{ id: 'a', date: '2026-09-15', periodStart: true }]);

    const { result } = renderHook(() => useCycle(new Date(2026, 8, 16, 7, 30)), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.currentCycleDay).not.toBeNull());

    expect(result.current.currentCycleDay).toBe(2);
  });

  it('says there is no cycle data rather than "Day 214" when the log is stale', async () => {
    // The window is what makes this true: a period start from last year is simply not in the
    // response, so there is nothing to count from.
    list.mockResolvedValue([]);

    const { result } = renderHook(() => useCycle(NOW), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.cycleLoading).toBe(false));

    expect(result.current.currentCycleDay).toBeNull();
    expect(result.current.lastPeriodStart).toBeNull();
  });
});
