import React from 'react';
import { render } from '@testing-library/react-native';
import { SettingsProvider } from '../../../context/SettingsContext';
import { ThemeProvider } from '../../../theme/ThemeContext';
import { useSettings } from '../../../hooks/useSettings';
import { MobileWorkoutCard } from '../MobileWorkoutCard';
import type { Workout } from '../../../types/workout';
import { DEFAULT_SETTINGS } from '@trackvibe/shared/settings';

jest.mock('../../../hooks/useSettings', () => ({ useSettings: jest.fn() }));

const mockUseSettings = useSettings as jest.Mock;

// The provider stack is real here (AsyncStorage -> SettingsProvider -> PaperProvider), and a
// cold worker also pays to transform that whole module graph, so Jest's 5s default is not a
// budget for the assertion — it is a budget for a first React Native render.
jest.setTimeout(30_000);

const workout: Workout = {
  id: 'w1',
  date: new Date(2026, 8, 21),
  title: 'Workout',
  type: 'strength',
  durationMinutes: 45,
  exercises: [{ name: 'Bench', sets: 3, reps: 10, weight: 60 }],
  completed: false,
};

/**
 * This card must NOT follow the user's unit preference, and that is the opposite of what it
 * looked like it should do — so it is pinned rather than left to a comment.
 *
 * It used to call `getWeightUnit(settings.units)` and print `60lbs` for a stored `60`, with
 * the number untouched. That is a 2.2x misstatement of what somebody lifted, and worse than
 * ignoring the preference outright.
 *
 * The weight card can honour the preference because `weight_entries` now carries the unit it
 * was captured in (`1776700000000_add-weight-entry-unit.js`), so there is something to
 * convert FROM. Per-exercise weights live inside the workout's JSON payload and carry no
 * unit, so here there is not. Until they are tagged too, the domain's own unit is the only
 * thing this card can truthfully print.
 *
 * If a future change tags exercise weights, delete this test along with the constant it
 * guards — do not "fix" it by reinstating the relabel.
 */
describe('MobileWorkoutCard — the unit it prints', () => {
  const renderCard = () =>
    render(
      <SettingsProvider>
        <ThemeProvider>
          <MobileWorkoutCard workout={workout} expanded />
        </ThemeProvider>
      </SettingsProvider>
    );

  it.each([['metric'], ['imperial']] as const)(
    'prints kg for a %s user, because exercise weights carry no unit to convert from',
    async (units) => {
      // Spread the real defaults: ThemeProvider reads `theme` and `balanceDisplayColor`
      // from the same blob, and a settings stub missing them crashes the palette builder
      // long before the assertion is reached.
      mockUseSettings.mockReturnValue({ settings: { ...DEFAULT_SETTINGS, units } });
      const r = await renderCard();

      expect(await r.findByText(/60kg/)).toBeTruthy();
      expect(r.queryByText(/60lbs/)).toBeNull();
    }
  );
});
