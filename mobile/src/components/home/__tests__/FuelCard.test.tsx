import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { DailyTargets } from '@trackvibe/shared/domain';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { FuelCard } from '../FuelCard';

/**
 * The fuel card's two loading states, which are the point of this card's rewrite.
 *
 * `loading` is the FOOD query and nothing else — Expo used to hide the whole screen behind
 * four queries, two of which page a user's entire history, so the number people open the app
 * for waited on a workouts read it does not use.
 *
 * `targetsLoading` is separate because an unresolved target is not an absent one. Painting
 * "Set a daily calorie target" while the goals query is still in flight offers a user with a
 * 2,200 kcal goal the chance to set the goal they already have.
 *
 * Note `await render(...)` and the raised timeout: this mounts the real provider stack, same
 * as MobileGoalCard.test.tsx and ProgressRing.test.tsx.
 */
jest.setTimeout(30_000);

const NO_TARGETS: DailyTargets = { calories: null, carbs: null, fat: null, protein: null };

const renderCard = (over: Partial<React.ComponentProps<typeof FuelCard>> = {}) =>
  render(
    <SettingsProvider>
      <ThemeProvider>
        <FuelCard
          todayCalories={800}
          todayProtein={40}
          todayCarbs={90}
          todayFats={20}
          targets={NO_TARGETS}
          mealsLabel="2 meals logged"
          loading={false}
          targetsLoading={false}
          onEditCalorieTarget={() => {}}
          onEditMacroTargets={() => {}}
          {...over}
        />
      </ThemeProvider>
    </SettingsProvider>
  );

describe('FuelCard — waiting on the food query', () => {
  it('shows a spinner in place of the numbers while food is loading', async () => {
    const r = await renderCard({ loading: true });

    expect(await r.findByLabelText("Loading today's fuel")).toBeTruthy();
    expect(r.queryByText('800')).toBeNull();
  });

  it('renders the calorie total as soon as food has landed', async () => {
    const r = await renderCard();

    expect(await r.findByText('800')).toBeTruthy();
  });
});

describe('FuelCard — waiting on the target queries', () => {
  it('offers no target affordance at all while goals and profile are in flight', async () => {
    const r = await renderCard({ targetsLoading: true });

    // Neither presentation: the answer is not known yet, so neither is honest.
    expect(r.queryByLabelText('Set a daily calorie target')).toBeNull();
    expect(r.queryByLabelText('Edit daily calorie target')).toBeNull();
    // The card itself still renders — this gate is about the affordance, not the card.
    expect(await r.findByText('800')).toBeTruthy();
  });

  it('invites the user to set a target once the queries say there is none', async () => {
    const r = await renderCard({ targetsLoading: false });

    expect(await r.findByLabelText('Set a daily calorie target')).toBeTruthy();
    expect(r.queryByLabelText('Edit daily calorie target')).toBeNull();
  });

  it('offers an edit affordance once a target exists', async () => {
    const r = await renderCard({ targets: { ...NO_TARGETS, calories: 2200 } });

    expect(await r.findByLabelText('Edit daily calorie target')).toBeTruthy();
    expect(r.queryByLabelText('Set a daily calorie target')).toBeNull();
  });
});

describe('FuelCard — macros', () => {
  it('shows grams alone until the profile has a target for them', async () => {
    const r = await renderCard();

    expect(await r.findByText('40g')).toBeTruthy();
    expect(r.queryByText('40/150g')).toBeNull();
  });

  it('shows grams against the target once the profile has one', async () => {
    const r = await renderCard({
      targets: { calories: null, protein: 150, carbs: 250, fat: 70 },
    });

    expect(await r.findByText('40/150g')).toBeTruthy();
    expect(await r.findByText('90/250g')).toBeTruthy();
    expect(await r.findByText('20/70g')).toBeTruthy();
  });

  /** A ring at 0% says "nothing logged against your goal"; no target says "there is no goal". */
  it('captions the ring differently with and without a calorie target', async () => {
    const withTarget = await renderCard({ targets: { ...NO_TARGETS, calories: 2200 } });
    expect(await withTarget.findByText('of 2200 kcal')).toBeTruthy();

    const without = await renderCard();
    expect(await without.findByText('kcal in')).toBeTruthy();
    expect(without.queryByText(/of \d+ kcal/)).toBeNull();
  });
});

/**
 * The macro bars were inert for the whole life of this client — able to fill, never filling,
 * with nowhere in the app to set what they fill against. They are a control now, and the
 * thing worth pinning is that tapping them reaches the MACRO editor and not the calorie one:
 * the two write different stores (profile grams vs the goals table's kcal row), so crossing
 * the wires would silently edit the wrong number.
 */
describe('FuelCard — the macro bars are a control', () => {
  it('opens the macro editor, not the calorie one', async () => {
    const onEditMacroTargets = jest.fn();
    const onEditCalorieTarget = jest.fn();
    const r = await renderCard({ onEditMacroTargets, onEditCalorieTarget });

    fireEvent.press(r.getByLabelText('Edit daily macro targets'));

    expect(onEditMacroTargets).toHaveBeenCalledTimes(1);
    expect(onEditCalorieTarget).not.toHaveBeenCalled();
  });

  it('keeps the calorie affordance on its own separate control', async () => {
    const onEditMacroTargets = jest.fn();
    const onEditCalorieTarget = jest.fn();
    const r = await renderCard({ onEditMacroTargets, onEditCalorieTarget });

    fireEvent.press(r.getByLabelText('Set a daily calorie target'));

    expect(onEditCalorieTarget).toHaveBeenCalledTimes(1);
    expect(onEditMacroTargets).not.toHaveBeenCalled();
  });
});
