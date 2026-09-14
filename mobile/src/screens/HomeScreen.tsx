import React, { useMemo } from 'react';
import { View } from 'react-native';
import { ActivityIndicator, Button, Card, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns';
import {
  buildRecentActivity,
  firstNameOf,
  homeProgressMessage,
  remainingToTarget,
  resolveDailyTargets,
  resolveWorkoutTarget,
  targetFraction,
  type DailyTargets,
  type GoalTargetSource,
  type MacroTargetSource,
  type RecentActivityItem,
} from '@trackvibe/shared/domain';
import { useAuth } from '../context/AuthContext';
import { useGoals } from '../hooks/useGoals';
import { useProfile } from '../hooks/useProfile';
import { useWorkouts } from '../hooks/useWorkouts';
import { useEnergy } from '../hooks/useEnergy';
import { useWeight } from '../hooks/useWeight';
import { MobileScreen } from '../components/shared/MobileScreen';
import { MetricCard } from '../components/shared/MetricCard';
import { QuickTile } from '../components/shared/QuickTile';
import { SectionCard } from '../components/shared/SectionCard';
import { FuelCard } from '../components/home/FuelCard';
import { StreakCard } from '../components/home/StreakCard';
import { WaterCard } from '../components/home/WaterCard';
import { WeightCard } from '../components/home/WeightCard';
import { CycleCard } from '../components/home/CycleCard';
import { RecentActivityCard } from '../components/home/RecentActivityCard';
import { radius, spacing } from '../theme';
import { useThemedStyles } from '../theme/useThemedStyles';
import { getPeriodRange, toLocalDateString } from '../lib/dateRanges';

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

export interface QuickLogPills {
  sleep?: string;
  weight?: string;
}

/**
 * What today's quick-log tiles already have on record.
 *
 * The pills are the reason the grid is a grid: an action that has been used stays reachable
 * instead of disappearing, and the tile says what it already knows (the web's own comment,
 * `frontend/src/pages/Home.tsx:269-270`). Sleep in particular is ONLY here — it used to be
 * a stat tile as well, and one screen stating "7.5h" twice is not two facts.
 *
 * Weight matches on the local calendar date STRING rather than parsing the API value. The
 * API sends `YYYY-MM-DD`, and `new Date('2026-09-14')` is UTC MIDNIGHT — 20:00 on the 13th
 * in New York — so the web's `isSameDay(new Date(entry.date), new Date())` finds no entry
 * for today anywhere west of UTC, and the tile tells those users they have not weighed in
 * when they have. `toLocalDateString` renders `now` in the device's own calendar, and two
 * `YYYY-MM-DD` strings compare without a zone between them (`global/domain-conventions`).
 */
export function buildQuickLogPills(
  sleepHours: number | null,
  weightEntries: readonly { date: string; weight: number }[],
  now: Date
): QuickLogPills {
  const today = toLocalDateString(now);
  const todaysWeight = weightEntries.find((e) => e.date === today);
  return {
    sleep: sleepHours != null && sleepHours > 0 ? `${sleepHours}h` : undefined,
    weight: todaysWeight ? `${todaysWeight.weight}kg` : undefined,
  };
}

export function HomeScreen() {
  const styles = useThemedStyles((colors) => ({
    row: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    sectionLabel: {
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1,
      fontWeight: '700',
      marginBottom: -spacing.sm,
    },
    activitySkeleton: {
      alignItems: 'center',
      paddingVertical: spacing.lg,
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
  const { weightEntries } = useWeight();

  const progress = useMemo(
    () => buildHomeProgress({ goals, profile, workouts, foodEntries, checkIns }),
    [goals, profile, workouts, foodEntries, checkIns]
  );

  const recentActivity = useMemo(
    () => buildRecentActivity(foodEntries, workouts),
    [foodEntries, workouts]
  );

  const pills = useMemo(
    () => buildQuickLogPills(progress.sleepHours, weightEntries, new Date()),
    [progress.sleepHours, weightEntries]
  );

  /**
   * THE WHOLE-SCREEN LOADING GATE IS GONE, and that is deliberate.
   *
   * This screen used to open with `if (goalsLoading || workoutsLoading || energyLoading ||
   * profileLoading) return <LoadingView />`, so a centred spinner replaced everything —
   * greeting included — until the slowest of four queries landed, two of which page through
   * a user's whole history. The web layers instead, and its comment says why
   * (`frontend/src/pages/Home.tsx:179-180`): the fuel card must not wait on the workouts
   * query behind it. Each section below now waits on exactly what it reads, and the header
   * waits on nothing.
   */
  const targetsLoading = goalsLoading || profileLoading;
  const activityLoading = workoutsLoading || energyLoading;

  const openCalorieTarget = () => {
    const calorieGoal = goals.find((g) => g.type === 'calories' && g.period === 'daily');
    // The same row `resolveCalorieTarget` reads, so editing changes the number on screen
    // rather than adding a second goal the resolver will keep ignoring.
    navigation.navigate('GoalForm', calorieGoal ? { goalId: calorieGoal.id } : undefined);
  };

  const openActivity = (type: RecentActivityItem['type']) =>
    navigation.navigate(type === 'food' ? 'Energy' : 'Body');

  return (
    <MobileScreen
      kicker={format(new Date(), 'EEE · MMM d')}
      title={`Hey ${firstNameOf(user?.name)}`}
      subtitle={homeProgressMessage(progress.meals)}
    >
      <FuelCard
        todayCalories={progress.todayCalories}
        todayProtein={progress.todayProtein}
        todayCarbs={progress.todayCarbs}
        todayFats={progress.todayFats}
        targets={progress.targets}
        mealsLabel={`${progress.meals} meal${progress.meals === 1 ? '' : 's'} logged`}
        loading={energyLoading}
        targetsLoading={targetsLoading}
        onEditCalorieTarget={openCalorieTarget}
      />

      {/* The two numbers nothing else on this screen states. Protein, carbs and fat moved
          into the fuel card's bars and sleep into the quick-log pill, so their tiles are
          gone rather than repeated — the same consolidation the web made when it replaced
          its dashboard stats with the quick-log grid. */}
      <View style={styles.row}>
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
          icon="target"
          label="Calories left"
          value={progress.caloriesLeft != null ? `${progress.caloriesLeft}` : '--'}
          meta={progress.targets.calories != null ? 'kcal' : 'no target'}
        />
      </View>

      <StreakCard />

      <Text variant="labelSmall" style={styles.sectionLabel}>
        Quick log
      </Text>
      {/* 2x2 so no tile is ever orphaned on a half row, and every action stays reachable
          after it has been logged (the pill shows today's value). Replaces three stacked
          buttons that had no weight action and no logged-today state. */}
      <View style={styles.row}>
        <QuickTile icon="food-apple" label="Log food" onPress={() => navigation.navigate('FoodEntryForm')} />
        <QuickTile icon="dumbbell" label="Log workout" onPress={() => navigation.navigate('WorkoutForm')} />
      </View>
      <View style={styles.row}>
        <QuickTile
          icon="moon-waning-crescent"
          label="Log sleep"
          pill={pills.sleep}
          onPress={() => navigation.navigate('SleepForm')}
        />
        <QuickTile
          icon="scale-bathroom"
          label="Log weight"
          pill={pills.weight}
          onPress={() => navigation.navigate('WeightForm')}
        />
      </View>

      <WaterCard />
      <WeightCard onLogWeight={() => navigation.navigate('WeightForm')} />
      {profile.cycleTrackingEnabled && <CycleCard />}

      {/* The one section that genuinely needs both queries, so it owns that wait rather
          than imposing it on the screen. */}
      {activityLoading ? (
        <SectionCard title="Recent activity">
          <View style={styles.activitySkeleton} accessibilityLiveRegion="polite">
            <ActivityIndicator accessibilityLabel="Loading recent activity" />
          </View>
        </SectionCard>
      ) : (
        <RecentActivityCard items={recentActivity} onOpen={openActivity} />
      )}

      {!goalsLoading && goals.length === 0 && (
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
