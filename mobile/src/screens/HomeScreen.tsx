import React, { useMemo } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button, Card } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks/useGoals';
import { useWorkouts } from '../hooks/useWorkouts';
import { useEnergy } from '../hooks/useEnergy';
import { ProgressRing } from '../components/shared/ProgressRing';
import { LoadingView } from '../components/shared/LoadingView';
import { getPeriodRange } from '../lib/dateRanges';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { goals, goalsLoading } = useGoals();
  const { workouts, workoutsLoading } = useWorkouts();
  const { foodEntries, checkIns, energyLoading } = useEnergy();

  const loading = goalsLoading || workoutsLoading || energyLoading;

  const progress = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const { start: dayStart, end: dayEnd } = getPeriodRange('daily');

    // Workouts this week
    const weekWorkouts = workouts.filter((w) =>
      isWithinInterval(w.date, { start: weekStart, end: weekEnd })
    ).length;
    const workoutGoal = goals.find((g) => g.type === 'workouts' && g.period === 'weekly');
    const workoutTarget = workoutGoal?.target || 0;
    const workoutPercent = workoutTarget > 0 ? Math.min(100, (weekWorkouts / workoutTarget) * 100) : 0;

    // Calories today
    const todayCalories = foodEntries
      .filter((e) => isWithinInterval(e.date, { start: dayStart, end: dayEnd }))
      .reduce((sum, e) => sum + e.calories, 0);
    const calorieGoal = goals.find((g) => g.type === 'calories' && g.period === 'daily');
    const calorieTarget = calorieGoal?.target || 0;
    const caloriePercent = calorieTarget > 0 ? Math.min(100, (todayCalories / calorieTarget) * 100) : 0;

    // Avg sleep this week
    const weekCheckIns = checkIns.filter(
      (c) => c.sleepHours != null && isWithinInterval(c.date, { start: weekStart, end: weekEnd })
    );
    const avgSleep = weekCheckIns.length > 0
      ? weekCheckIns.reduce((sum, c) => sum + (c.sleepHours || 0), 0) / weekCheckIns.length
      : 0;
    const sleepGoal = goals.find((g) => g.type === 'sleep');
    const sleepTarget = sleepGoal?.target || 0;
    const sleepPercent = sleepTarget > 0 ? Math.min(100, (avgSleep / sleepTarget) * 100) : 0;

    return {
      weekWorkouts, workoutTarget, workoutPercent,
      todayCalories, calorieTarget, caloriePercent,
      avgSleep, sleepTarget, sleepPercent,
    };
  }, [workouts, foodEntries, checkIns, goals]);

  if (loading) return <LoadingView />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="headlineSmall" style={styles.greeting}>
        {getGreeting()}, {user?.name || 'User'}
      </Text>
      <Text variant="bodyMedium" style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>

      <Card style={styles.progressCard} mode="outlined">
        <Card.Content>
          <Text variant="titleMedium" style={styles.sectionTitle}>Today's Progress</Text>
          <View style={styles.ringsRow}>
            <TouchableOpacity onPress={() => navigation.navigate('Body')} style={styles.ringItem}>
              <ProgressRing
                value={progress.workoutPercent}
                color="#3b82f6"
                label="Workouts"
                displayValue={`${progress.weekWorkouts}/${progress.workoutTarget || '?'}`}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Energy')} style={styles.ringItem}>
              <ProgressRing
                value={progress.caloriePercent}
                color="#ef4444"
                label="Calories"
                displayValue={`${Math.round(progress.todayCalories)}`}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate('Energy')} style={styles.ringItem}>
              <ProgressRing
                value={progress.sleepPercent}
                color="#8b5cf6"
                label="Sleep"
                displayValue={progress.avgSleep > 0 ? `${progress.avgSleep.toFixed(1)}h` : '--'}
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>

      <Text variant="titleMedium" style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <Button mode="outlined" icon="dumbbell" onPress={() => navigation.navigate('WorkoutForm')} style={styles.actionButton} compact>
          Add Workout
        </Button>
        <Button mode="outlined" icon="food-apple" onPress={() => navigation.navigate('FoodEntryForm')} style={styles.actionButton} compact>
          Log Food
        </Button>
        <Button mode="outlined" icon="moon-waning-crescent" onPress={() => navigation.navigate('SleepForm')} style={styles.actionButton} compact>
          Log Sleep
        </Button>
      </View>

      {goals.length === 0 && (
        <Card style={styles.goalsPrompt} mode="outlined">
          <Card.Content style={styles.goalsPromptContent}>
            <Text variant="bodyMedium">Set your first wellness goal</Text>
            <Button mode="contained" onPress={() => navigation.navigate('GoalForm')} style={styles.goalButton} compact>
              Add Goal
            </Button>
          </Card.Content>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16 },
  greeting: { fontWeight: '700', color: '#111827' },
  date: { color: '#6b7280', marginBottom: 16 },
  progressCard: { marginBottom: 20 },
  sectionTitle: { fontWeight: '600', marginBottom: 12 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  ringItem: { alignItems: 'center' },
  actionsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  actionButton: { flex: 1, minWidth: 100 },
  goalsPrompt: { marginTop: 8 },
  goalsPromptContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalButton: { backgroundColor: '#3b82f6' },
});
