import { useState, useCallback } from 'react';

export interface MacroGoals {
  carbs: number;
  fat: number;
  protein: number;
}

const STORAGE_KEY = 'beme-macro-goals';
const DEFAULTS: MacroGoals = { carbs: 300, fat: 80, protein: 120 };

function loadGoals(): MacroGoals {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      carbs: typeof parsed.carbs === 'number' && parsed.carbs > 0 ? parsed.carbs : DEFAULTS.carbs,
      fat: typeof parsed.fat === 'number' && parsed.fat > 0 ? parsed.fat : DEFAULTS.fat,
      protein: typeof parsed.protein === 'number' && parsed.protein > 0 ? parsed.protein : DEFAULTS.protein,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useMacroGoals() {
  const [goals, setGoalsState] = useState<MacroGoals>(loadGoals);

  const setGoals = useCallback((next: MacroGoals) => {
    setGoalsState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const calorieGoal = goals.carbs * 4 + goals.fat * 9 + goals.protein * 4;

  return { macroGoals: goals, setMacroGoals: setGoals, calorieGoal };
}
