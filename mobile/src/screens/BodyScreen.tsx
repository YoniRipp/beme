import React, { useState, useMemo } from 'react';
import { View, SectionList, StyleSheet, TouchableOpacity } from 'react-native';
import { Card, Text, Chip, IconButton, FAB, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useWorkouts } from '../hooks/useWorkouts';
import { Workout } from '../types/workout';
import { SearchBar } from '../components/shared/SearchBar';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';

export function BodyScreen() {
  const navigation = useNavigation<any>();
  const { workouts, workoutsLoading, refetchWorkouts, deleteWorkout } = useWorkouts();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return workouts;
    const q = search.toLowerCase();
    return workouts.filter(
      (w) =>
        w.title.toLowerCase().includes(q) ||
        w.type.toLowerCase().includes(q) ||
        w.notes?.toLowerCase().includes(q) ||
        w.exercises.some((e) => e.name.toLowerCase().includes(q))
    );
  }, [workouts, search]);

  const sections = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => b.date.getTime() - a.date.getTime());
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const thisWeek = sorted.filter((w) => w.date >= weekStart && w.date <= weekEnd);
    const older = sorted.filter((w) => w.date < weekStart);

    const result: { title: string; data: Workout[] }[] = [];
    if (thisWeek.length > 0) result.push({ title: 'This Week', data: thisWeek });
    if (older.length > 0) result.push({ title: 'Older', data: older });
    return result;
  }, [filtered]);

  if (workoutsLoading) return <LoadingView />;

  const renderWorkout = ({ item }: { item: Workout }) => {
    const isExpanded = expandedId === item.id;
    return (
      <Card style={styles.card} mode="outlined">
        <TouchableOpacity onPress={() => setExpandedId(isExpanded ? null : item.id)} activeOpacity={0.7}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <View style={styles.cardLeft}>
                <Text variant="titleMedium" style={styles.workoutTitle}>{item.title}</Text>
                <View style={styles.chipRow}>
                  <Chip compact style={styles.typeChip} textStyle={styles.chipText}>{item.type}</Chip>
                  <Text variant="bodySmall" style={styles.meta}>
                    {item.exercises.length} exercise{item.exercises.length !== 1 ? 's' : ''}
                    {item.durationMinutes > 0 ? ` · ${item.durationMinutes} min` : ''}
                  </Text>
                </View>
                <Text variant="bodySmall" style={styles.date}>{format(item.date, 'EEE, MMM d')}</Text>
              </View>
              <View style={styles.cardActions}>
                <IconButton icon="pencil" size={18} onPress={() => navigation.navigate('WorkoutForm', { workoutId: item.id })} />
                <IconButton icon="trash-can-outline" size={18} iconColor="#ef4444" onPress={() => setDeleteId(item.id)} />
              </View>
            </View>
            {isExpanded && item.exercises.length > 0 && (
              <View style={styles.exercises}>
                <Divider style={styles.divider} />
                {item.exercises.map((ex, i) => (
                  <Text key={i} variant="bodySmall" style={styles.exercise}>
                    {ex.name}: {ex.sets}×{ex.reps}{ex.weight ? ` @ ${ex.weight}kg` : ''}
                  </Text>
                ))}
              </View>
            )}
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchWrapper}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search workouts..." />
      </View>
      {sections.length === 0 ? (
        <EmptyState
          icon="dumbbell"
          title="No workouts yet"
          subtitle="Log your first workout"
          actionLabel="Add Workout"
          onAction={() => navigation.navigate('WorkoutForm')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderWorkout}
          renderSectionHeader={({ section }) => (
            <Text variant="titleSmall" style={styles.sectionHeader}>{section.title}</Text>
          )}
          contentContainerStyle={styles.list}
          onRefresh={refetchWorkouts}
          refreshing={workoutsLoading}
          stickySectionHeadersEnabled={false}
        />
      )}
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate('WorkoutForm')} />
      <ConfirmDialog
        visible={!!deleteId}
        onDismiss={() => setDeleteId(null)}
        title="Delete Workout"
        message="Are you sure you want to delete this workout?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => { if (deleteId) deleteWorkout(deleteId); setDeleteId(null); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchWrapper: { paddingHorizontal: 16, paddingTop: 12 },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  sectionHeader: { fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  card: { marginBottom: 10 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  cardLeft: { flex: 1 },
  workoutTitle: { fontWeight: '600' },
  chipRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  typeChip: { marginRight: 8 },
  chipText: { fontSize: 11 },
  meta: { color: '#6b7280' },
  date: { color: '#9ca3af', marginTop: 2 },
  cardActions: { flexDirection: 'row' },
  exercises: { marginTop: 8 },
  divider: { marginBottom: 8 },
  exercise: { color: '#4b5563', marginBottom: 2 },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#3b82f6' },
});
