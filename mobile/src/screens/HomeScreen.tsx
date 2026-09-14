import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  remainingToTarget,
  resolveDailyTargets,
  resolveWorkoutTarget,
  targetFraction,
  type DailyTargets,
  type GoalTargetSource,
  type MacroTargetSource,
} from '@trackvibe/shared/domain';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks/useGoals';
import { useProfile } from '../hooks/useProfile';
import { useWorkouts } from '../hooks/useWorkouts';
import { useEnergy } from '../hooks/useEnergy';
import { LoadingView } from '../components/shared/LoadingView';
import { MobileScreen } from '../components/shared/MobileScreen';
import { MetricCard } from '../components/shared/MetricCard';
import { radius, spacing } from '../theme';
import { useThemedStyles } from '../theme/useThemedStyles';
import { getPeriodRange } from '../lib/dateRanges';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

/** What every number on this screen is computed from. */
export interface HomeProgressDeps {
  goals: readonly GoalTargetSource[];
  profile: MacroTargetSource | null | undefined;
  workouts: readonly { date: Date }[];
  foodEntries: readonly { date: Date; calories: number; protein: number; carbs: number; fats: number }[];
  checkIns: readonly { date: Date; sleepHours?: number }[];
}

export interface HomeProgress {
  weekWorkouts: number;
  workoutTarget: number | null;
  todayCalories: number;
  todayProtein: number;
  todayCarbs: number;
  todayFats: number;
  targets: DailyTargets;
  calorieFraction: number | null;
  caloriesLeft: number | null;
  /** Hours slept last night, or `null` when today has no check-in. */
  sleepHours: number | null;
  meals: number;
}

/**
 * Every derived number on Home, as a pure function of the screen's hook data.
 *
 * Exported so the wiring can be pinned without rendering the screen or its React Query
 * hooks — a QueryClient left alive in a jest test hangs the run (see GoalsScreen's
 * `goalsWithCurrent` and useWorkouts' `buildWorkoutUpdateBody` for the same reasoning).
 *
 * Three things changed here and they are the point of this screen's rewrite:
 *
 *  - `|| 2000` and `|| 4` are gone. An unset target is `null` and renders as unset. The
 *    old fallbacks meant a user who had never set a goal saw a target they never chose,
 *    and a different one on each client (the web derived 2400 from default macro grams).
 *  - Protein, carbs and fat gain targets, from the profile's grams. They had none here at
 *    all: the protein card read "72g" against nothing.
 *  - Sleep is last night's hours, not the week's average. The same tile meant two
 *    different things on the two clients; the web's is a log-today affordance and can
 *    only sensibly show today, so today is what both show.
 */
export function buildHomeProgress(deps: HomeProgressDeps, now: Date = new Date()): HomeProgress {
  const weekStart = startOfWeek(now, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
  const { start: dayStart, end: dayEnd } = getPeriodRange('daily', now);

  const weekWorkouts = deps.workouts.filter((w) =>
    isWithinInterval(w.date, { start: weekStart, end: weekEnd })
  ).length;

  const todayFood = deps.foodEntries.filter((e) =>
    isWithinInterval(e.date, { start: dayStart, end: dayEnd })
  );
  const todayCalories = todayFood.reduce((sum, e) => sum + e.calories, 0);

  const todayCheckIn = deps.checkIns.find(
    (c) => c.sleepHours != null && isWithinInterval(c.date, { start: dayStart, end: dayEnd })
  );

  const targets = resolveDailyTargets(deps.goals, deps.profile);

  return {
    weekWorkouts,
    workoutTarget: resolveWorkoutTarget(deps.goals),
    todayCalories,
    todayProtein: todayFood.reduce((sum, e) => sum + e.protein, 0),
    todayCarbs: todayFood.reduce((sum, e) => sum + e.carbs, 0),
    todayFats: todayFood.reduce((sum, e) => sum + e.fats, 0),
    targets,
    calorieFraction: targetFraction(todayCalories, targets.calories),
    caloriesLeft: remainingToTarget(Math.round(todayCalories), targets.calories),
    sleepHours: todayCheckIn?.sleepHours ?? null,
    meals: todayFood.length,
  };
}

/** "72/120g" once a target exists, "72g" until then — never "72/300g" out of thin air. */
function gramsAgainstTarget(current: number, target: number | null): string {
  const rounded = Math.round(current);
  return target != null ? `${rounded}/${target}g` : `${rounded}g`;
}

export function HomeScreen() {
  const styles = useThemedStyles((colors) => ({
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
    heroAction: {
      alignSelf: 'flex-start',
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
  }));
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const { goals, goalsLoading } = useGoals();
  const { profile, profileLoading } = useProfile();
  const { workouts, workoutsLoading } = useWorkouts();
  const { foodEntries, checkIns, energyLoading } = useEnergy();

  const loading = goalsLoading || workoutsLoading || energyLoading || profileLoading;

  const progress = useMemo(
    () => buildHomeProgress({ goals, profile, workouts, foodEntries, checkIns }),
    [goals, profile, workouts, foodEntries, checkIns]
  );

  if (loading) return <LoadingView />;

  const mealsLabel = `${progress.meals} meal${progress.meals === 1 ? '' : 's'} logged`;
  const hasCalorieTarget = progress.targets.calories != null;

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
              {hasCalorieTarget
                ? `of ${progress.targets.calories} kcal · ${mealsLabel}`
                : `kcal · ${mealsLabel}`}
            </Text>
          </View>
          {/* No target, no bar. A bar at 0% against nothing reads as "you have logged
              nothing", which is a different and wrong statement. */}
          {hasCalorieTarget ? (
            <View style={styles.heroBar}>
              <View style={[styles.heroFill, { width: `${(progress.calorieFraction ?? 0) * 100}%` }]} />
            </View>
          ) : (
            <Button
              mode="text"
              compact
              icon="target"
              style={styles.heroAction}
              onPress={() => navigation.navigate('GoalForm')}
            >
              Set a daily calorie target
            </Button>
          )}
        </Card.Content>
      </Card>

      <View style={styles.metrics}>
        <MetricCard
          icon="dumbbell"
          label="Workouts"
          value={
            progress.workoutTarget != null
              ? `${progress.weekWorkouts}/${progress.workoutTarget}`
              : `${progress.weekWorkouts}`
          }
          meta="this week"
          tone="workout"
        />
        <MetricCard
          icon="moon-waning-crescent"
          label="Sleep"
          value={progress.sleepHours != null ? `${progress.sleepHours.toFixed(1)}h` : '--'}
          meta="last night"
          tone="sleep"
        />
      </View>

      <View style={styles.metrics}>
        <MetricCard
          icon="food-steak"
          label="Protein"
          value={gramsAgainstTarget(progress.todayProtein, progress.targets.protein)}
          meta="today"
          tone="food"
        />
        <MetricCard
          icon="target"
          label="Calories left"
          value={progress.caloriesLeft != null ? `${progress.caloriesLeft}` : '--'}
          meta={hasCalorieTarget ? 'kcal' : 'no target'}
        />
      </View>

      <View style={styles.metrics}>
        <MetricCard
          icon="barley"
          label="Carbs"
          value={gramsAgainstTarget(progress.todayCarbs, progress.targets.carbs)}
          meta="today"
          tone="food"
        />
        <MetricCard
          icon="oil"
          label="Fat"
          value={gramsAgainstTarget(progress.todayFats, progress.targets.fat)}
          meta="today"
          tone="food"
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
