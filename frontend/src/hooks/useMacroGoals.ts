import { useCallback, useMemo } from 'react';
import { useProfile } from './useProfile';

export interface MacroGoals {
  carbs: number;
  fat: number;
  protein: number;
}

const DEFAULTS: MacroGoals = { carbs: 300, fat: 80, protein: 120 };

export function useMacroGoals() {
  const { profile, updateProfile } = useProfile();

  const macroGoals: MacroGoals = useMemo(
    () => ({
      carbs: profile.macroCarbs ?? DEFAULTS.carbs,
      fat: profile.macroFat ?? DEFAULTS.fat,
      protein: profile.macroProtein ?? DEFAULTS.protein,
    }),
    [profile.macroCarbs, profile.macroFat, profile.macroProtein],
  );

  const setMacroGoals = useCallback(
    (next: MacroGoals) =>
      updateProfile({ macroCarbs: next.carbs, macroFat: next.fat, macroProtein: next.protein }),
    [updateProfile],
  );

  const calorieGoal = macroGoals.carbs * 4 + macroGoals.fat * 9 + macroGoals.protein * 4;

  return { macroGoals, setMacroGoals, calorieGoal };
}
