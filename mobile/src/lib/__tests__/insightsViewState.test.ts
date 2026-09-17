import { insightsHaveData } from '../insightsViewState';

/**
 * The screen asked only about workouts and food, so an account that logged sleep and nothing else
 * got "No data yet" — while the screen was holding two stats (average sleep hours, sleep
 * consistency) computed from exactly that sleep.
 *
 * The rows' contents are irrelevant to the predicate, so these are empty objects: what is being
 * pinned is which of the three collections count, and that is the whole bug.
 */
const row = () => ({});

describe('insightsHaveData', () => {
  it('counts sleep check-ins, which is the case that was wrong', () => {
    expect(insightsHaveData({ workouts: [], foodEntries: [], checkIns: [row()] })).toBe(true);
  });

  it('counts workouts', () => {
    expect(insightsHaveData({ workouts: [row()], foodEntries: [], checkIns: [] })).toBe(true);
  });

  it('counts food entries', () => {
    expect(insightsHaveData({ workouts: [], foodEntries: [row()], checkIns: [] })).toBe(true);
  });

  it('is false only when all three are empty', () => {
    expect(insightsHaveData({ workouts: [], foodEntries: [], checkIns: [] })).toBe(false);
  });
});
