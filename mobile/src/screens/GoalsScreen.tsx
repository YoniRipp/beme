import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
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
import type { Goal } from '../types/goals';
import { computeGoalProgress, type GoalProgressDeps } from '@trackvibe/shared/domain';
import Toast from 'react-native-toast-message';

/**
 * Pairs each goal with its computed `current`, using data the screen's hooks already
 * hold (useEnergy's foodEntries/checkIns, useWorkouts' workouts) — no new endpoint, no
 * unbounded per-user read. MobileGoalCard's `current` prop defaults to 0, and this
 * screen used to never pass one at all: every goal card showed "0 / target" regardless
 * of what the user had actually logged.
 *
 * Exported as a plain function so this wiring can be pinned without rendering the
 * screen or its React Query hooks (see hooks/useWorkouts.ts's buildWorkoutUpdateBody
 * for the same reasoning — a QueryClient left over in a test hangs jest). The
 * calculation itself lives in @trackvibe/shared/domain, shared with the web client.
 */
export function goalsWithCurrent(
  goals: Goal[],
  deps: GoalProgressDeps
): Array<{ goal: Goal; current: number }> {
  return goals.map((goal) => ({ goal, current: computeGoalProgress(goal, deps).current }));
}

export function GoalsScreen() {
  const navigation = useNavigation<any>();
  const { goals, goalsLoading, deleteGoal } = useGoals();
  const { foodEntries, checkIns } = useEnergy();
  const { workouts } = useWorkouts();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (goalsLoading) return <LoadingView />;

  return (
    <MobileScreen title="Goals" subtitle="Set targets that guide your week.">
      {goals.length === 0 ? (
        <EmptyState
          icon="target"
          title="No goals yet"
          subtitle="Set your first wellness goal"
          actionLabel="Add Goal"
          onAction={() => navigation.navigate('GoalForm')}
        />
      ) : (
        <View style={styles.stack}>
          {goalsWithCurrent(goals, { foodEntries, workouts, checkIns }).map(({ goal, current }) => (
            <MobileGoalCard
              key={goal.id}
              goal={goal}
              current={current}
              onEdit={() => navigation.navigate('GoalForm', { goalId: goal.id })}
              onDelete={() => setDeleteId(goal.id)}
            />
          ))}
          <Button mode="contained" icon="plus" onPress={() => navigation.navigate('GoalForm')}>
            Add Goal
          </Button>
        </View>
      )}

      <ConfirmDialog
        visible={!!deleteId}
        onDismiss={() => setDeleteId(null)}
        title="Delete Goal"
        message="Are you sure you want to delete this goal?"
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const id = deleteId;
          setDeleteId(null);
          if (!id) return;
          try {
            await deleteGoal(id);
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
