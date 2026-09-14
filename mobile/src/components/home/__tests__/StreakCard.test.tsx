import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { StreakCard, isPersonalBest } from '../StreakCard';
import type { ApiStreak } from '../../../core/api/health';

/**
 * `useStreaks` is mocked rather than driven through a QueryClient: a client left alive in a
 * jest run leaves a notifyManager batch timer that outlives the test and hangs the suite
 * (the reason every other Expo test here is render-free or hook-mocked).
 */
const streakState: {
  workoutStreak: ApiStreak | null;
  foodStreak: ApiStreak | null;
  waterStreak: ApiStreak | null;
  streaksLoading: boolean;
} = { workoutStreak: null, foodStreak: null, waterStreak: null, streaksLoading: false };

jest.mock('../../../hooks/useStreaks', () => ({
  useStreaks: () => streakState,
}));

jest.setTimeout(30_000);

const streak = (over: Partial<ApiStreak> = {}): ApiStreak => ({
  id: 's',
  type: 'workout',
  currentCount: 4,
  bestCount: 4,
  lastDate: '2026-09-14',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

beforeEach(() => {
  streakState.workoutStreak = null;
  streakState.foodStreak = null;
  streakState.waterStreak = null;
  streakState.streaksLoading = false;
});

const renderCard = () =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <StreakCard />
      </ThemeProvider>
    </SettingsProvider>
  );

describe('StreakCard — when it renders nothing', () => {
  /** The web returns null in the same case (`StreakCard.tsx:22`). A new account should not
   *  be handed a card announcing three zeros. */
  it('renders nothing at all when every streak is zero', async () => {
    streakState.workoutStreak = streak({ currentCount: 0, bestCount: 0 });
    streakState.foodStreak = streak({ type: 'food', currentCount: 0, bestCount: 0 });

    const r = await renderCard();

    expect(r.queryByText('Streaks')).toBeNull();
  });

  it('renders nothing while the query is still in flight', async () => {
    streakState.streaksLoading = true;
    streakState.workoutStreak = streak({ currentCount: 4 });

    const r = await renderCard();

    expect(r.queryByText('Streaks')).toBeNull();
  });

  it('renders nothing when the account has no streak rows yet', async () => {
    const r = await renderCard();

    expect(r.queryByText('Streaks')).toBeNull();
  });
});

describe('StreakCard — when it renders', () => {
  it('shows only the streaks that are actually running', async () => {
    streakState.workoutStreak = streak({ currentCount: 4, bestCount: 9 });
    streakState.foodStreak = streak({ type: 'food', currentCount: 0, bestCount: 12 });

    const r = await renderCard();

    expect(await r.findByText('Streaks')).toBeTruthy();
    expect(await r.findByText('Workout')).toBeTruthy();
    // A food streak that has lapsed is not a food streak, however good its record was.
    expect(r.queryByText('Food')).toBeNull();
  });

  it('marks a run at or above the record as the personal best', async () => {
    streakState.waterStreak = streak({ type: 'water', currentCount: 12, bestCount: 12 });

    const r = await renderCard();

    expect(await r.findByText('Best')).toBeTruthy();
  });

  it('shows the record to beat when the current run is behind it', async () => {
    streakState.workoutStreak = streak({ currentCount: 4, bestCount: 9 });

    const r = await renderCard();

    expect(await r.findByText('9')).toBeTruthy();
    expect(r.queryByText('Best')).toBeNull();
  });
});

describe('isPersonalBest', () => {
  it('is true once the current run reaches the record', () => {
    expect(isPersonalBest(streak({ currentCount: 9, bestCount: 9 }))).toBe(true);
    expect(isPersonalBest(streak({ currentCount: 10, bestCount: 9 }))).toBe(true);
  });

  it('is false while the record still stands', () => {
    expect(isPersonalBest(streak({ currentCount: 4, bestCount: 9 }))).toBe(false);
  });

  /** A first-ever day-one streak is not a record worth a trophy — the web's `bestCount > 1`. */
  it('does not call a brand-new one-day streak a record', () => {
    expect(isPersonalBest(streak({ currentCount: 1, bestCount: 1 }))).toBe(false);
  });
});
