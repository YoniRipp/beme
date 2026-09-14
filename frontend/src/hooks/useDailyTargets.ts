import { useCallback, useMemo } from 'react';
import { resolveDailyTargets, type DailyTargets } from '@trackvibe/shared/domain';
import { useProfile } from './useProfile';
import { useGoals } from './useGoals';

/**
 * The user's daily targets, from the two stores that hold them.
 *
 *   calories -> the `goals` table, row `type: 'calories'` / `period: 'daily'`
 *   macros   -> the profile's `macroCarbs / macroFat / macroProtein`, in grams
 *
 * Replaces `useMacroGoals`, which derived the calorie target from the profile macros
 * (`carbs*4 + fat*9 + protein*4`, defaulting to 2400). That derivation meant a calorie
 * goal set on this app's own Goals page was ignored by this app's own Home, and it put
 * the web 400 kcal away from the Expo client for the same account. The goals table owns
 * the calorie target now; the profile still owns the macro grams, because the goals
 * table's type enum (`calories | workouts | sleep`) cannot express them.
 *
 * `null` means unset. No target is invented here or downstream — see
 * `@trackvibe/shared/domain`'s targets module.
 */

export interface DailyTargetsInput {
  /** kcal/day. `null` removes the daily calorie goal. */
  calories: number | null;
  /** Grams/day. Always supplied — the profile upsert ignores nulls, so macros cannot be cleared. */
  carbs: number;
  fat: number;
  protein: number;
}

export function useDailyTargets() {
  const { profile, profileLoading, updateProfile } = useProfile();
  const { goals, goalsLoading, addGoal, updateGoal, deleteGoal } = useGoals();

  const targets: DailyTargets = useMemo(
    () => resolveDailyTargets(goals, profile),
    [goals, profile]
  );

  /**
   * The row `targets.calories` came from, so a save edits the number the user is looking
   * at. `goals` has no unique constraint on (user, type, period); the shared resolver and
   * this lookup must agree on which duplicate wins, so both take the first.
   */
  const calorieGoal = useMemo(
    () => goals.find((g) => g.type === 'calories' && g.period === 'daily'),
    [goals]
  );

  const saveDailyTargets = useCallback(
    async (next: DailyTargetsInput): Promise<void> => {
      await updateProfile({
        macroCarbs: next.carbs,
        macroFat: next.fat,
        macroProtein: next.protein,
      });

      if (next.calories == null) {
        // Cleared. Removing the row is the only way to have no calorie target, and it is
        // the same row the Goals page shows — the modal says so before you save.
        if (calorieGoal) await deleteGoal(calorieGoal.id);
        return;
      }
      if (calorieGoal) {
        if (calorieGoal.target !== next.calories) {
          await updateGoal(calorieGoal.id, { target: next.calories });
        }
        return;
      }
      await addGoal({ type: 'calories', target: next.calories, period: 'daily' });
    },
    [updateProfile, calorieGoal, addGoal, updateGoal, deleteGoal]
  );

  return {
    targets,
    targetsLoading: profileLoading || goalsLoading,
    saveDailyTargets,
  };
}
