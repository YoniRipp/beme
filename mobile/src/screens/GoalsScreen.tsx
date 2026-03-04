import React, { useState } from 'react';
import { View, FlatList, StyleSheet } from 'react-native';
import { Card, Text, IconButton, FAB, Chip } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useGoals } from '../hooks/useGoals';
import { Goal } from '../types/goals';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

const TYPE_ICONS: Record<string, string> = {
  workouts: 'dumbbell',
  calories: 'fire',
  sleep: 'moon-waning-crescent',
};

const TYPE_COLORS: Record<string, string> = {
  workouts: '#3b82f6',
  calories: '#ef4444',
  sleep: '#8b5cf6',
};

export function GoalsScreen() {
  const navigation = useNavigation<any>();
  const { goals, goalsLoading, refetchGoals, deleteGoal } = useGoals();
  const [deleteId, setDeleteId] = useState<string | null>(null);

  if (goalsLoading) return <LoadingView />;

  const renderGoal = ({ item }: { item: Goal }) => (
    <Card style={[styles.card, { borderLeftColor: TYPE_COLORS[item.type] || '#6b7280' }]} mode="outlined">
      <Card.Content style={styles.cardContent}>
        <View style={styles.cardLeft}>
          <Chip icon={TYPE_ICONS[item.type] || 'target'} compact style={styles.typeChip}>
            {item.type}
          </Chip>
          <Text variant="titleMedium" style={styles.target}>
            {item.target} {item.type === 'calories' ? 'cal' : item.type === 'sleep' ? 'hrs' : ''} / {item.period}
          </Text>
        </View>
        <View style={styles.cardActions}>
          <IconButton
            icon="pencil"
            size={20}
            onPress={() => navigation.navigate('GoalForm', { goalId: item.id })}
          />
          <IconButton
            icon="trash-can-outline"
            size={20}
            iconColor="#ef4444"
            onPress={() => setDeleteId(item.id)}
          />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      {goals.length === 0 ? (
        <EmptyState
          icon="target"
          title="No goals yet"
          subtitle="Set your first wellness goal"
          actionLabel="Add Goal"
          onAction={() => navigation.navigate('GoalForm')}
        />
      ) : (
        <FlatList
          data={goals}
          keyExtractor={(item) => item.id}
          renderItem={renderGoal}
          contentContainerStyle={styles.list}
          onRefresh={refetchGoals}
          refreshing={goalsLoading}
        />
      )}
      {goals.length > 0 && (
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => navigation.navigate('GoalForm')}
        />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 16 },
  card: { marginBottom: 12, borderLeftWidth: 4 },
  cardContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  typeChip: { alignSelf: 'flex-start', marginBottom: 4 },
  target: { fontWeight: '600' },
  cardActions: { flexDirection: 'row' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#3b82f6' },
});
