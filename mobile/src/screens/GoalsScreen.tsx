import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useGoals } from '../hooks/useGoals';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MobileScreen } from '../components/shared/MobileScreen';
import { MobileGoalCard } from '../components/shared/MobileGoalCard';
import { spacing } from '../theme';

export function GoalsScreen() {
  const navigation = useNavigation<any>();
  const { goals, goalsLoading, deleteGoal } = useGoals();
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
          {goals.map((goal) => (
            <MobileGoalCard
              key={goal.id}
              goal={goal}
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
        onConfirm={() => {
          if (deleteId) deleteGoal(deleteId);
          setDeleteId(null);
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
