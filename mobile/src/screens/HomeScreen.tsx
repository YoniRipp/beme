import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks/useGoals';
import { useWorkouts } from '../hooks/useWorkouts';
import { useEnergy } from '../hooks/useEnergy';
import { LoadingView } from '../components/shared/LoadingView';
import { MobileScreen } from '../components/shared/MobileScreen';
import { MetricCard } from '../components/shared/MetricCard';
import { colors, radius, spacing } from '../theme';
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

    const weekWorkouts = workouts.filter((w) =>
      isWithinInterval(w.date, { start: weekStart, end: weekEnd })
    ).length;
    const workoutGoal = goals.find((g) => g.type === 'workouts' && g.period === 'weekly');
    const workoutTarget = workoutGoal?.target || 4;

    const todayFood = foodEntries.filter((e) => isWithinInterval(e.date, { start: dayStart, end: dayEnd }));
    const todayCalories = todayFood.reduce((sum, e) => sum + e.calories, 0);
    const todayProtein = todayFood.reduce((sum, e) => sum + e.protein, 0);
    const calorieGoal = goals.find((g) => g.type === 'calories' && g.period === 'daily');
    const calorieTarget = calorieGoal?.target || 2000;

    const weekCheckIns = checkIns.filter(
      (c) => c.sleepHours != null && isWithinInterval(c.date, { start: weekStart, end: weekEnd })
    );
    const avgSleep = weekCheckIns.length > 0
      ? weekCheckIns.reduce((sum, c) => sum + (c.sleepHours || 0), 0) / weekCheckIns.length
      : 0;

    return {
      weekWorkouts,
      workoutTarget,
      todayCalories,
      calorieTarget,
      todayProtein,
      avgSleep,
      meals: todayFood.length,
    };
  }, [workouts, foodEntries, checkIns, goals]);

  if (loading) return <LoadingView />;

  return (
    <MobileScreen
      title={`${getGreeting()}, ${user?.name || 'there'}`}
      subtitle={format(new Date(), 'EEEE, MMMM d')}
    >
      <Card mode="contained" style={styles.heroCard}>
        <Card.Content style={styles.heroContent}>
          <View>
            <Text variant="labelLarge" style={styles.eyebrow}>Today's fuel</Text>
            <Text variant="displaySmall" style={styles.heroValue}>{Math.round(progress.todayCalories)}</Text>
            <Text variant="bodyMedium" style={styles.heroMeta}>
              of {progress.calorieTarget} kcal · {progress.meals} meal{progress.meals === 1 ? '' : 's'} logged
            </Text>
          </View>
          <View style={styles.heroBar}>
            <View style={[styles.heroFill, { width: `${Math.min(progress.todayCalories / progress.calorieTarget, 1) * 100}%` }]} />
          </View>
        </Card.Content>
      </Card>

      <View style={styles.metrics}>
        <MetricCard
          icon="dumbbell"
          label="Workouts"
          value={`${progress.weekWorkouts}/${progress.workoutTarget}`}
          meta="this week"
          tone="workout"
        />
        <MetricCard
          icon="moon-waning-crescent"
          label="Sleep"
          value={progress.avgSleep > 0 ? `${progress.avgSleep.toFixed(1)}h` : '--'}
          meta="weekly avg"
          tone="sleep"
        />
      </View>

      <View style={styles.metrics}>
        <MetricCard
          icon="food-steak"
          label="Protein"
          value={`${Math.round(progress.todayProtein)}g`}
          meta="today"
          tone="food"
        />
        <MetricCard
          icon="target"
          label="Calories left"
          value={`${Math.max(progress.calorieTarget - Math.round(progress.todayCalories), 0)}`}
          meta="kcal"
        />
      </View>

      <View style={styles.actions}>
        <Button mode="contained" icon="food-apple" onPress={() => navigation.navigate('FoodEntryForm')} style={styles.primaryAction}>
          Log Food
        </Button>
        <Button mode="outlined" icon="dumbbell" onPress={() => navigation.navigate('WorkoutForm')} style={styles.secondaryAction}>
          Workout
        </Button>
        <Button mode="outlined" icon="moon-waning-crescent" onPress={() => navigation.navigate('SleepForm')} style={styles.secondaryAction}>
          Sleep
        </Button>
      </View>

      {goals.length === 0 && (
        <Card mode="contained" style={styles.prompt}>
          <Card.Content style={styles.promptContent}>
            <View style={{ flex: 1 }}>
              <Text variant="titleMedium" style={styles.promptTitle}>Set your first goal</Text>
              <Text variant="bodySmall" style={styles.promptText}>Choose a target for workouts, calories, or sleep.</Text>
            </View>
            <Button mode="contained-tonal" onPress={() => navigation.navigate('GoalForm')}>Add</Button>
          </Card.Content>
        </Card>
      )}
    </MobileScreen>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroContent: {
    gap: spacing.lg,
  },
  eyebrow: {
    color: colors.primary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  heroValue: {
    color: colors.text,
    fontWeight: '800',
  },
  heroMeta: {
    color: colors.textMuted,
  },
  heroBar: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  heroFill: {
    height: '100%',
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  metrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actions: {
    gap: spacing.sm,
  },
  primaryAction: {
    borderRadius: radius.lg,
  },
  secondaryAction: {
    borderRadius: radius.lg,
    borderColor: colors.border,
  },
  prompt: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.lg,
  },
  promptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  promptTitle: {
    color: colors.text,
    fontWeight: '800',
  },
  promptText: {
    color: colors.textMuted,
  },
});
