import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, SegmentedButtons, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useWorkouts } from '../hooks/useWorkouts';
import { Workout } from '../types/workout';
import { SearchBar } from '../components/shared/SearchBar';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MobileScreen } from '../components/shared/MobileScreen';
import { MobileWorkoutCard } from '../components/shared/MobileWorkoutCard';
import { MetricCard } from '../components/shared/MetricCard';
import { colors, spacing } from '../theme';

function groupWorkouts(workouts: Workout[]) {
  const sorted = [...workouts].sort((a, b) => b.date.getTime() - a.date.getTime());
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

  return {
    thisWeek: sorted.filter((w) => w.date >= weekStart && w.date <= weekEnd),
    older: sorted.filter((w) => w.date < weekStart),
  };
}

export function BodyScreen() {
  const navigation = useNavigation<any>();
  const { workouts, workoutsLoading, deleteWorkout } = useWorkouts();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return workouts.filter((workout) => {
      const matchesSearch = !q ||
        workout.title.toLowerCase().includes(q) ||
        workout.type.toLowerCase().includes(q) ||
        workout.notes?.toLowerCase().includes(q) ||
        workout.exercises.some((e) => e.name.toLowerCase().includes(q));
      const matchesFilter = filter === 'all' || workout.type === filter;
      return matchesSearch && matchesFilter;
    });
  }, [workouts, search, filter]);

  const grouped = useMemo(() => groupWorkouts(filtered), [filtered]);
  const totalExercises = grouped.thisWeek.reduce((sum, workout) => sum + workout.exercises.length, 0);
  const totalMinutes = grouped.thisWeek.reduce((sum, workout) => sum + workout.durationMinutes, 0);

  if (workoutsLoading) return <LoadingView />;

  const renderSection = (title: string, items: Workout[]) => {
    if (items.length === 0) return null;
    return (
      <View style={styles.section}>
        <Text variant="labelLarge" style={styles.sectionTitle}>{title}</Text>
        <View style={styles.cardStack}>
          {items.map((workout) => (
            <MobileWorkoutCard
              key={workout.id}
              workout={workout}
              expanded={expandedId === workout.id}
              onPress={() => setExpandedId(expandedId === workout.id ? null : workout.id)}
              onEdit={() => navigation.navigate('WorkoutForm', { workoutId: workout.id })}
              onDelete={() => setDeleteId(workout.id)}
            />
          ))}
        </View>
      </View>
    );
  };

  return (
    <MobileScreen title="Workouts" subtitle="Plan, log, and review your training.">
      <View style={styles.metricRow}>
        <MetricCard icon="dumbbell" label="This week" value={`${grouped.thisWeek.length}`} meta="workouts" tone="workout" />
        <MetricCard icon="timer-outline" label="Volume" value={`${totalExercises}`} meta={`${totalMinutes} min`} tone="primary" />
      </View>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search workouts..." />
      <SegmentedButtons
        value={filter}
        onValueChange={setFilter}
        buttons={[
          { value: 'all', label: 'All' },
          { value: 'strength', label: 'Strength' },
          { value: 'cardio', label: 'Cardio' },
        ]}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="No workouts yet"
          subtitle="Log your first workout"
          actionLabel="Add Workout"
          onAction={() => navigation.navigate('WorkoutForm')}
        />
      ) : (
        <>
          {renderSection('This week', grouped.thisWeek)}
          {renderSection('Older', grouped.older)}
          <Button mode="contained" icon="plus" onPress={() => navigation.navigate('WorkoutForm')} style={styles.addButton}>
            Add Workout
          </Button>
        </>
      )}

      <ConfirmDialog
        visible={!!deleteId}
        onDismiss={() => setDeleteId(null)}
        title="Delete Workout"
        message="Are you sure you want to delete this workout?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteId) deleteWorkout(deleteId); setDeleteId(null); }}
      />
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  cardStack: {
    gap: spacing.sm,
  },
  addButton: {
    marginTop: spacing.sm,
  },
});
