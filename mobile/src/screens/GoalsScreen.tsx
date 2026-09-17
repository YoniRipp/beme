import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Button } from '../components/ui';
import { useNavigation } from '@react-navigation/native';
import { useGoals } from '../hooks/useGoals';
import { useEnergy } from '../hooks/useEnergy';
import { useWorkouts } from '../hooks/useWorkouts';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MobileScreen } from '../components/shared/MobileScreen';
import { MobileGoalCard } from '../components/shared/MobileGoalCard';
import { spacing } from '../theme';
import { useThemedStyles } from '../theme/useThemedStyles';
import type { Goal } from '../types/goals';
import { computeGoalProgress, type GoalProgressDeps } from '@trackvibe/shared/domain';
import Toast from 'react-native-toast-message';

/**
 * Pairs each goal with its computed progress, using data the screen's hooks already
 * hold (useEnergy's foodEntries/checkIns, useWorkouts' workouts) — no new endpoint, no
 * unbounded per-user read. MobileGoalCard's `current` prop defaults to 0, and this
 * screen used to never pass one at all: every goal card showed "0 / target" regardless
 * of what the user had actually logged.
 *
 * `percentage` comes back from the same call rather than being re-derived on the card.
 * MobileGoalCard used to compute its own `current / goal.target`, which is a second,
 * smaller copy of arithmetic the shared calculator already does (and does with the
 * divide-by-zero and >100% clamps the card's copy lacked).
 *
 * Exported as a plain function so this wiring can be pinned without rendering the
 * screen or its React Query hooks (see hooks/useWorkouts.ts's buildWorkoutUpdateBody
 * for the same reasoning — a QueryClient left over in a test hangs jest). The
 * calculation itself lives in @trackvibe/shared/domain, shared with the web client.
 */
export function goalsWithCurrent(
  goals: Goal[],
  deps: GoalProgressDeps
): Array<{ goal: Goal; current: number; percentage: number }> {
  return goals.map((goal) => {
    const { current, percentage } = computeGoalProgress(goal, deps);
    return { goal, current, percentage };
  });
}

/** What the Goals screen should draw, given the state of its goals query. */
export interface GoalsViewState {
  /** The full-screen spinner. Nothing else renders while this is true. */
  loading: boolean;
  /** Message to render above the content, or null when the fetch is fine. */
  error: string | null;
  /** The first-run "add your first goal" panel. Never true at the same time as `error`. */
  empty: boolean;
  /** The goal list. Shown alongside `error` when a refetch failed over cached goals. */
  list: boolean;
}

/**
 * THE BUG THIS EXISTS FOR: the screen destructured `{ goals, goalsLoading, deleteGoal }`
 * and never read `goalsError`, which `useGoals` has always returned. When GET /api/goals
 * fails, `goalsLoading` is false and `goals` falls back to `[]`, so the screen rendered the
 * first-run empty state — telling a user with a full list of goals that they have none, and
 * inviting them to recreate one on top of goals that still exist server-side. A failed
 * request must never be indistinguishable from an empty account.
 *
 * Precedence, matching the web's `ContentWithLoading` (frontend/src/pages/Goals.tsx passes it
 * `error={goalsError}`): loading wins over everything; an error renders above the content;
 * cached goals still render underneath it, because "we couldn't refresh, here's what we have"
 * beats a blank screen. The one place this is deliberately stricter than the web is the empty
 * state — the web would render its EmptyState under the error banner, and on a phone that
 * reads as "you have no goals" no matter what is written above it.
 *
 * Pure and exported so it can be pinned without mounting the screen: a QueryClient left over
 * in a jest run leaves a notifyManager batch timer that hangs the suite (see
 * hooks/useWorkouts.ts's buildWorkoutUpdateBody, and `goalsWithCurrent` above).
 */
export function goalsViewState(input: {
  loading: boolean;
  error: string | null;
  goalCount: number;
}): GoalsViewState {
  if (input.loading) {
    return { loading: true, error: null, empty: false, list: false };
  }
  const hasGoals = input.goalCount > 0;
  return {
    loading: false,
    error: input.error,
    empty: !hasGoals && !input.error,
    list: hasGoals,
  };
}

export function GoalsScreen() {
  const navigation = useNavigation<any>();
  const { goals, goalsLoading, goalsError, deleteGoal } = useGoals();
  const { foodEntries, checkIns } = useEnergy();
  const { workouts } = useWorkouts();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const themed = useThemedStyles((colors) => ({
    error: { color: colors.danger },
  }));

  const view = goalsViewState({ loading: goalsLoading, error: goalsError, goalCount: goals.length });

  if (view.loading) return <LoadingView message="Loading goals..." />;

  return (
    <MobileScreen title="Stay on target" subtitle="Set targets that guide your week.">
      {view.error && (
        <Text variant="bodySmall" style={themed.error} accessibilityRole="alert">
          {view.error}
        </Text>
      )}

      {view.empty && (
        <EmptyState
          icon="target"
          title="Add your first goal"
          subtitle="Set a target for workouts, calories, or sleep to stay on track."
          actionLabel="Add a goal"
          onAction={() => navigation.navigate('GoalForm')}
        />
      )}

      {view.list && (
        <View style={styles.stack}>
          {goalsWithCurrent(goals, { foodEntries, workouts, checkIns }).map(
            ({ goal, current, percentage }) => (
              <MobileGoalCard
                key={goal.id}
                goal={goal}
                current={current}
                percentage={percentage}
                onEdit={() => navigation.navigate('GoalForm', { goalId: goal.id })}
                onDelete={() => setDeleteId(goal.id)}
              />
            )
          )}
          {/* The web's AddAnotherCard is a dashed, low-emphasis affordance, not a filled
              primary button — adding a fifth goal is not the main action on a screen that
              already lists four. `outlined` is Paper's nearest equivalent; Paper has no
              dashed border variant. */}
          <Button mode="outlined" icon="plus" onPress={() => navigation.navigate('GoalForm')}>
            Add another goal
          </Button>
        </View>
      )}

      <ConfirmDialog
        visible={!!deleteId}
        onDismiss={() => setDeleteId(null)}
        title="Delete Goal"
        message="Are you sure you want to delete this goal? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const id = deleteId;
          setDeleteId(null);
          if (!id) return;
          try {
            await deleteGoal(id);
            Toast.show({ type: 'success', text1: 'Goal deleted' });
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete goal' });
          }
        }}
      />
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  stack: {
    gap: spacing.md,
  },
});
