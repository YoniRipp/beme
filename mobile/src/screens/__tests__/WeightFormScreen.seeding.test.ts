import { act, renderHook } from '@testing-library/react-native';
import { isValidWeight, useWeightFormState, weightFormSeed } from '../WeightFormScreen';

/**
 * The weight form seeds from a query that may not have resolved when the screen mounts, and
 * what it must never do is seed over the user.
 *
 * THE BUG THIS PINS: the quick-log "Log weight" tile opens this form immediately. On a cold
 * start the weight query is still in flight, so the fields are empty and the user starts
 * typing. A seed effect that only asks "have I seeded yet" then fires when the query lands
 * and replaces the typed value with yesterday's reading — and Save posts that. A wrong
 * number written into the weight log is data corruption, not a display glitch, which is the
 * same class of failure `GoalFormScreen.seeding.test.ts` exists for.
 *
 * `useWeightFormState` is the extracted field state, so this runs with `renderHook` rather
 * than mounting the screen — which would pull in `useWeight` and a QueryClient, whose
 * leftover notifyManager batch timer hangs the jest run.
 *
 * Note `await renderHook(...)` / `await rerender(...)`: RNTL 14 made both async.
 */

const TODAY = '2026-09-16';
const YESTERDAY = '2026-09-15';

type Entry = { date: string; weight: number; notes?: string };

const NONE: Entry[] = [];

const mount = (initialProps: Entry[]) =>
  renderHook((entries: Entry[]) => useWeightFormState(entries, TODAY), { initialProps });

describe('useWeightFormState — seeding', () => {
  it('opens empty while the query is still in flight', async () => {
    const { result } = await mount(NONE);

    expect(result.current.weight).toBe('');
    expect(result.current.notes).toBe('');
  });

  it('fills in from the query when it resolves after mount', async () => {
    const { result, rerender } = await mount(NONE);

    await rerender([{ date: YESTERDAY, weight: 82.4 }]);

    expect(result.current.weight).toBe('82.4');
  });

  it("prefers today's entry, so the form edits today rather than replacing it", async () => {
    const { result } = await mount([
      { date: TODAY, weight: 81, notes: 'morning' },
      { date: YESTERDAY, weight: 82.4, notes: 'post-run' },
    ]);

    expect(result.current.weight).toBe('81');
    expect(result.current.notes).toBe('morning');
  });

  it("does not carry yesterday's note onto today's row", async () => {
    const { result } = await mount([{ date: YESTERDAY, weight: 82.4, notes: 'post-run' }]);

    expect(result.current.weight).toBe('82.4');
    expect(result.current.notes).toBe('');
  });

  it('THE BUG: a late query result must not overwrite what the user typed', async () => {
    // Cold start from the quick tile: nothing loaded yet.
    const { result, rerender } = await mount(NONE);

    await act(async () => {
      result.current.setWeight('81.5');
    });

    // The query lands a moment later, carrying a different reading.
    await rerender([{ date: YESTERDAY, weight: 82.4 }]);

    expect(result.current.weight).toBe('81.5');
  });

  it('a late result must not overwrite a typed note either', async () => {
    const { result, rerender } = await mount(NONE);

    await act(async () => {
      result.current.setNotes('after the gym');
    });

    await rerender([{ date: TODAY, weight: 81, notes: 'morning' }]);

    expect(result.current.notes).toBe('after the gym');
  });

  /** Touching one field protects the whole form — the user is mid-entry, not mid-field. */
  it('typing a weight also stops the note being seeded over', async () => {
    const { result, rerender } = await mount(NONE);

    await act(async () => {
      result.current.setWeight('81.5');
    });
    await rerender([{ date: TODAY, weight: 90, notes: 'morning' }]);

    expect(result.current.notes).toBe('');
  });

  it('a background refetch does not re-seed over the seeded value', async () => {
    const { result, rerender } = await mount([{ date: YESTERDAY, weight: 82.4 }]);
    expect(result.current.weight).toBe('82.4');

    await act(async () => {
      result.current.setWeight('79');
    });
    // Same data, new array identity — exactly what a refetch produces.
    await rerender([{ date: YESTERDAY, weight: 82.4 }]);

    expect(result.current.weight).toBe('79');
  });

  it('lets the user clear the field without it being refilled', async () => {
    const { result, rerender } = await mount([{ date: YESTERDAY, weight: 82.4 }]);

    await act(async () => {
      result.current.setWeight('');
    });
    await rerender([{ date: YESTERDAY, weight: 82.4 }]);

    expect(result.current.weight).toBe('');
  });
});

describe('weightFormSeed', () => {
  it('is empty when there is nothing to seed from', () => {
    expect(weightFormSeed([], TODAY)).toEqual({ weight: '', notes: '' });
  });

  it('falls back to the most recent reading', () => {
    expect(weightFormSeed([{ date: YESTERDAY, weight: 82.4 }], TODAY).weight).toBe('82.4');
  });
});

describe('isValidWeight', () => {
  it('accepts the range the web accepts', () => {
    expect(isValidWeight(10)).toBe(true);
    expect(isValidWeight(82.4)).toBe(true);
    expect(isValidWeight(500)).toBe(true);
  });

  it('rejects values outside it', () => {
    expect(isValidWeight(9.9)).toBe(false);
    expect(isValidWeight(501)).toBe(false);
    expect(isValidWeight(0)).toBe(false);
    expect(isValidWeight(-80)).toBe(false);
  });

  /** `Number('')` is 0 and `Number('abc')` is NaN; neither may reach the API as a weight. */
  it('rejects what a text field produces when it is empty or junk', () => {
    expect(isValidWeight(Number(''))).toBe(false);
    expect(isValidWeight(Number('abc'))).toBe(false);
    expect(isValidWeight(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
