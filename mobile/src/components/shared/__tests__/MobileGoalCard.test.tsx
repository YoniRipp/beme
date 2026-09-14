import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { MobileGoalCard } from '../MobileGoalCard';
import type { Goal } from '../../../types/goals';

/**
 * The card's numbers, in the web Goals card's vocabulary.
 *
 * `computeGoalProgress` returns an AVERAGE for a sleep goal, so `current` is routinely
 * 7.333333333333333. The web has always formatted that ("7.3h / 8.0h hours avg"); this card
 * printed `current.toLocaleString()` and rendered "7.333 / 8 hours". The formatter and the
 * unit nouns now come from @trackvibe/shared/domain so the two clients cannot drift again —
 * these cases pin that this card actually calls them.
 *
 * Note `await render(...)`: RNTL 14 made render async (see SettingsScreen.test.tsx).
 *
 * The timeout is raised because this suite mounts the real provider stack — SettingsProvider
 * reads AsyncStorage, ThemeProvider gates on it and then mounts PaperProvider — and the
 * first render in a worker also pays for babel-transforming that whole module graph. Jest's
 * 5s default is not a budget for the assertion; it is a budget for a cold React Native
 * render, and this repo's other provider-mounting suite already sits close to it.
 */
jest.setTimeout(30_000);

const goal = (over: Partial<Goal> = {}): Goal => ({
  id: 'g',
  type: 'calories',
  target: 2000,
  period: 'daily',
  createdAt: new Date(2026, 8, 1),
  ...over,
});

const renderCard = (props: React.ComponentProps<typeof MobileGoalCard>) =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <MobileGoalCard {...props} />
      </ThemeProvider>
    </SettingsProvider>
  );

describe('MobileGoalCard values', () => {
  it('rounds a sleep average to one decimal instead of printing 7.333', async () => {
    const r = await renderCard({ goal: goal({ type: 'sleep', target: 8 }), current: 22 / 3 });

    await r.findByText(/7\.3h \/ 8\.0h hours avg/);
    expect(r.queryByText(/7\.333/)).toBeNull();
  });

  it("uses the web Goals card's noun for calories, not the food card's kcal", async () => {
    const r = await renderCard({ goal: goal(), current: 1850 });

    await r.findByText(/1,850 \/ 2,000 calories/);
    expect(r.queryByText(/kcal/)).toBeNull();
  });

  it('states the percentage complete, which the card never showed at all', async () => {
    const r = await renderCard({ goal: goal(), current: 1000, percentage: 50 });

    await r.findByText('50% complete');
  });

  it('gives the progress bar an accessible name and value', async () => {
    const r = await renderCard({ goal: goal(), current: 1000, percentage: 50 });

    // The name is the web's sr-only sentence; the value is Paper's own, which it applies
    // after spreading the caller's props (so the caller cannot supply one).
    const bar = await r.findByLabelText('calories goal progress 50 percent');
    expect(bar.props.accessibilityValue).toMatchObject({ min: 0, max: 100, now: 50 });
  });

  it('labels both icon buttons, which carried no accessible name', async () => {
    const r = await renderCard({ goal: goal(), current: 0, onEdit: () => {}, onDelete: () => {} });

    await r.findByLabelText('Edit goal');
    await r.findByLabelText('Delete goal');
  });

  it('takes the percentage it is handed rather than deriving its own', async () => {
    // computeGoalProgress clamps at 100; a card that recomputed current/target would say 250%.
    const r = await renderCard({ goal: goal(), current: 5000, percentage: 100 });

    await r.findByText('100% complete');
    expect(r.queryByText('250% complete')).toBeNull();
  });
});
