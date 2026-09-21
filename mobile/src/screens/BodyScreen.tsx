import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Icon, Text } from 'react-native-paper';
import { Button, Card } from '../components/ui';
import { useNavigation } from '@react-navigation/native';
import { format, isToday, isYesterday, subWeeks } from 'date-fns';
import { useWorkouts } from '../hooks/useWorkouts';
import { useGoals } from '../hooks/useGoals';
import { Workout, WorkoutType } from '../types/workout';
import { getPeriodRange, parseLocalDateString, toLocalDateString } from '../lib/dateRanges';
import { SearchBar } from '../components/shared/SearchBar';
import { LoadingView } from '../components/shared/LoadingView';
import { ErrorNotice } from '../components/shared/ErrorNotice';
import { TruncationNotice } from '../components/shared/TruncationNotice';
import { EmptyState } from '../components/shared/EmptyState';
import { FilterChip } from '../components/shared/FilterChip';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MobileScreen } from '../components/shared/MobileScreen';
import { MobileWorkoutCard } from '../components/shared/MobileWorkoutCard';
import { AddAnotherCard } from '../components/shared/AddAnotherCard';
import { ProgressRing } from '../components/shared/ProgressRing';
import { fonts, radius, spacing } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import Toast from 'react-native-toast-message';

/** How many "Earlier" workouts to reveal per tap. Histories run to hundreds of cards. */
export const EARLIER_PAGE_SIZE = 10;

/** Fallback weekly workout target when the user has not set a `workouts` goal. */
export const DEFAULT_WEEKLY_WORKOUT_GOAL = 4;

/** Day-strip letters, Monday-first — the order the web draws them in. See `shape.md` #4. */
export const WEEK_DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
export const WEEK_DAY_NAMES = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

/**
 * The filter chips, matching the web's row exactly.
 *
 * Deliberately a literal rather than a map over `WORKOUT_TYPES`: that would add a
 * `Sports` chip, and whether both clients should gain one is an open question the owner
 * holds (`agent-os/specs/2026-09-14-1140-parity-workouts-week-summary/shape.md` #2).
 * `flexibility` is here because the Expo *form* already creates flexibility workouts that
 * the list could then never filter for.
 */
export type WorkoutFilter = 'all' | Extract<WorkoutType, 'strength' | 'cardio' | 'flexibility'>;
export const WORKOUT_FILTERS: { value: WorkoutFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'strength', label: 'Strength' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'flexibility', label: 'Flexibility' },
];

export interface WorkoutDayGroup {
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  label: string;
  workouts: Workout[];
}

/**
 * Groups a section's workouts by local calendar day, newest first unless `ascending`.
 * Ported from the web (`frontend/src/pages/Body.tsx`) so both clients label a day the
 * same way: `Today` / `Yesterday` / `EEEE, MMM d`, with the year appended once the day
 * falls outside the current one.
 */
export function groupWorkoutsByDate(workouts: Workout[], ascending = false): WorkoutDayGroup[] {
  const byDate = new Map<string, Workout[]>();
  for (const w of workouts) {
    const d = toLocalDateString(w.date);
    const bucket = byDate.get(d);
    if (bucket) bucket.push(w);
    else byDate.set(d, [w]);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) =>
    ascending ? a.localeCompare(b) : b.localeCompare(a)
  );
  const currentYear = new Date().getFullYear();
  return sortedDates.map((dateStr) => {
    const d = parseLocalDateString(dateStr);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else if (d.getFullYear() !== currentYear) label = format(d, 'EEEE, MMM d, yyyy');
    else label = format(d, 'EEEE, MMM d');
    return { date: dateStr, label, workouts: byDate.get(dateStr)! };
  });
}

export interface WorkoutWindows {
  upcoming: Workout[];
  thisWeek: Workout[];
  lastWeek: Workout[];
  earlier: Workout[];
}

/**
 * Splits the list into the four windows the web renders.
 *
 * The four are exhaustive on purpose, and that is the point of this function rather than
 * a cosmetic section heading. Expo previously bucketed into `thisWeek` (inside the
 * current week) and `older` (before it) and nothing else, so a workout dated *after*
 * this week — one the web's date picker can create, and which the API happily stores and
 * returns — matched no bucket and rendered nowhere. It was not even caught by the empty
 * state, which tested the filtered list rather than what had actually been rendered: a
 * user whose only workouts were in the future saw a screen with no list and no
 * explanation.
 *
 * The week window comes from `getPeriodRange('weekly')` — Sunday to Saturday, per
 * `agent-os/standards/global/domain-conventions.md` — rather than a second inline
 * `startOfWeek` call.
 */
export function splitWorkoutsIntoWindows(workouts: Workout[], now: Date = new Date()): WorkoutWindows {
  const { start: weekStart, end: weekEnd } = getPeriodRange('weekly', now);
  const lastWeekStart = subWeeks(weekStart, 1);

  const newestFirst = [...workouts].sort((a, b) => b.date.getTime() - a.date.getTime());

  return {
    // Ascending: the nearest planned session is the one the user cares about first.
    upcoming: newestFirst.filter((w) => w.date > weekEnd).reverse(),
    thisWeek: newestFirst.filter((w) => w.date >= weekStart && w.date <= weekEnd),
    lastWeek: newestFirst.filter((w) => w.date >= lastWeekStart && w.date < weekStart),
    earlier: newestFirst.filter((w) => w.date < lastWeekStart),
  };
}

/** Index of a date in the Monday-first day strip. */
export function dayStripIndex(date: Date): number {
  const day = date.getDay();
  return day === 0 ? 6 : day - 1;
}

/**
 * One flag per day-strip position: did this week log a workout that day?
 *
 * Fed from the *unfiltered* list, as the web does — its ring counts filtered workouts
 * while this strip does not, which is `shape.md` open question #3. Ported as-is rather
 * than quietly reconciled; the owner holds that call.
 */
export function hasWorkoutByDay(workouts: Workout[], now: Date = new Date()): boolean[] {
  const { start: weekStart, end: weekEnd } = getPeriodRange('weekly', now);
  const flags = [false, false, false, false, false, false, false];
  for (const w of workouts) {
    if (w.date >= weekStart && w.date <= weekEnd) flags[dayStripIndex(w.date)] = true;
  }
  return flags;
}

/**
 * The spoken sentence for a day chip. The tick is the only visual cue, so without this a
 * screen reader reads the strip as seven bare letters.
 */
export function dayStripLabel(dayName: string, isTodayCell: boolean, logged: boolean): string {
  return `${dayName}${isTodayCell ? ' (today)' : ''}${logged ? ': workout logged' : ': no workout'}`;
}

/** The weekly `workouts` goal target, falling back to 4 when the user has not set one. */
export function weeklyWorkoutTarget(goals: { type: string; period: string; target: number }[]): number {
  const goal = goals.find((g) => g.type === 'workouts' && g.period === 'weekly');
  return goal?.target || DEFAULT_WEEKLY_WORKOUT_GOAL;
}

export function BodyScreen() {
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    goalCard: {
      padding: spacing.lg,
      gap: spacing.lg,
    },
    goalTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: spacing.md,
    },
    eyebrow: {
      color: colors.textMuted,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    goalCount: {
      marginTop: spacing.xs,
      fontFamily: fonts.bold,
      fontWeight: '800',
      color: colors.primary,
    },
    goalTarget: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontWeight: '800',
    },
    dayStrip: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    dayCell: {
      alignItems: 'center',
      gap: spacing.xs,
    },
    dayLetter: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    // An unlogged day is an EMPTY box — no tick, no label inside — so its own fill is the
    // only thing that says a day is there. `surfaceMuted` (`--paper-2`) against the
    // enclosing `colors.surface` card is 1.03:1 in dark, which erases the six unlogged
    // days and leaves the logged ones floating. `muted` is 1.19:1, and is literally what
    // the web paints this element with (`pages/Body.tsx`: `bg-muted text-muted-foreground`
    // for `!hasWorkoutByDay[i]`).
    dayBox: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
    dayBoxLogged: {
      backgroundColor: colors.primary,
    },
    dayBoxToday: {
      borderWidth: 2,
      borderColor: colors.text,
    },
    // `flexGrow: 0` keeps this horizontal scroller sized to its own content inside the
    // screen's vertical ScrollView instead of stretching to fill it.
    filterScroll: {
      flexGrow: 0,
    },
    filterRow: {
      gap: spacing.sm,
      paddingRight: spacing.lg,
    },
    // Left-aligned rather than full width: Paper stretches a `Button` to its container, and
    // a full-bleed text button reads as a primary action, which this side trip is not.
    libraryLinkRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    section: {
      gap: spacing.md,
    },
    sectionTitle: {
      color: colors.textMuted,
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
    dayGroup: {
      gap: spacing.sm,
    },
    dayGroupLabel: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '700',
      paddingLeft: spacing.xs,
    },
    cardStack: {
      gap: spacing.sm,
    },
    showMore: {
      minHeight: 44,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: radius.md,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    showMoreLabel: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontWeight: '700',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
  }));
  const navigation = useNavigation<any>();
  const { workouts, workoutsLoading, workoutsError, workoutsTruncated, refetchWorkouts, deleteWorkout, toggleWorkoutCompleted } =
    useWorkouts();
  const { goals, goalsLoading } = useGoals();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [filter, setFilter] = useState<WorkoutFilter>('all');
  const [earlierVisible, setEarlierVisible] = useState(EARLIER_PAGE_SIZE);

  // A new search or filter is a fresh list, so start it back at the first page.
  useEffect(() => {
    setEarlierVisible(EARLIER_PAGE_SIZE);
  }, [search, filter]);

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

  const windows = useMemo(() => splitWorkoutsIntoWindows(filtered), [filtered]);
  const groupedUpcoming = useMemo(() => groupWorkoutsByDate(windows.upcoming, true), [windows.upcoming]);
  const groupedThisWeek = useMemo(() => groupWorkoutsByDate(windows.thisWeek), [windows.thisWeek]);
  const groupedLastWeek = useMemo(() => groupWorkoutsByDate(windows.lastWeek), [windows.lastWeek]);
  const groupedEarlier = useMemo(
    () => groupWorkoutsByDate(windows.earlier.slice(0, earlierVisible)),
    [windows.earlier, earlierVisible]
  );

  // Counted from the windows, not from `filtered`: the empty state must answer "did any
  // section actually render", which is the check the two-bucket version got wrong.
  const renderedCount =
    windows.upcoming.length + windows.thisWeek.length + windows.lastWeek.length + windows.earlier.length;

  // The user's own weekly target, as HomeScreen already reads it — the web hardcodes 4
  // (`shape.md` open question #1) and this client deliberately does not.
  const weeklyGoal = useMemo(() => weeklyWorkoutTarget(goals), [goals]);
  const dayFlags = useMemo(() => hasWorkoutByDay(workouts), [workouts]);
  const todayIdx = dayStripIndex(new Date());
  const weekCount = windows.thisWeek.length;
  const weekPct = Math.min(weekCount / weeklyGoal, 1) * 100;

  const openForm = (workoutId?: string) =>
    navigation.navigate('WorkoutForm', workoutId ? { workoutId } : undefined);

  const clearFilters = () => {
    setSearch('');
    setFilter('all');
  };

  const handleToggleCompleted = async (id: string, completed: boolean) => {
    try {
      await toggleWorkoutCompleted(id, completed);
    } catch {
      Toast.show({ type: 'error', text1: 'Failed to update workout' });
    }
  };

  if (workoutsLoading || goalsLoading) return <LoadingView />;

  const renderSection = (title: string, groups: WorkoutDayGroup[], footer?: React.ReactNode) => {
    if (groups.length === 0) return null;
    return (
      <View style={styles.section} key={title}>
        <Text variant="labelLarge" style={styles.sectionTitle}>{title}</Text>
        {groups.map(({ date, label, workouts: dayWorkouts }) => (
          <View key={date} style={styles.dayGroup}>
            <Text variant="bodySmall" style={styles.dayGroupLabel}>{label}</Text>
            <View style={styles.cardStack}>
              {dayWorkouts.map((workout) => (
                <MobileWorkoutCard
                  key={workout.id}
                  workout={workout}
                  expanded={expandedId === workout.id}
                  onPress={() => setExpandedId(expandedId === workout.id ? null : workout.id)}
                  onEdit={() => openForm(workout.id)}
                  onDelete={() => setDeleteId(workout.id)}
                  onToggleCompleted={handleToggleCompleted}
                />
              ))}
            </View>
          </View>
        ))}
        {footer}
      </View>
    );
  };

  return (
    <MobileScreen
      title="Workouts"
      subtitle="Track strength, cardio, and weekly consistency."
      onRefresh={refetchWorkouts}
    >
      <ErrorNotice message={workoutsError} />
      <TruncationNotice truncated={workoutsTruncated} />
      <Card style={styles.goalCard}>
        <View style={styles.goalTopRow}>
          <View>
            <Text variant="labelSmall" style={styles.eyebrow}>Goal · {weeklyGoal}/week</Text>
            <Text variant="headlineMedium" style={styles.goalCount}>
              {weekCount}
              <Text variant="headlineMedium" style={styles.goalTarget}>/{weeklyGoal}</Text>
            </Text>
          </View>
          <View
            accessible
            accessibilityRole="progressbar"
            accessibilityLabel="Workouts this week"
            accessibilityValue={{ min: 0, max: weeklyGoal, now: weekCount, text: `${weekCount} of ${weeklyGoal}` }}
          >
            {/* No text inside the arc: the count beside it is already the largest number
                in the card, and the web's ring draws none either. */}
            <ProgressRing value={weekPct} size={72} strokeWidth={10} displayValue="" />
          </View>
        </View>
        <View style={styles.dayStrip} accessibilityRole="list" accessibilityLabel="Workouts logged each day this week">
          {WEEK_DAY_LETTERS.map((letter, i) => (
            <View
              key={WEEK_DAY_NAMES[i]}
              style={styles.dayCell}
              accessible
              accessibilityLabel={dayStripLabel(WEEK_DAY_NAMES[i], todayIdx === i, dayFlags[i])}
            >
              <Text variant="labelSmall" style={styles.dayLetter}>{letter}</Text>
              <View
                style={[
                  styles.dayBox,
                  dayFlags[i] && styles.dayBoxLogged,
                  todayIdx === i && styles.dayBoxToday,
                ]}
              >
                {dayFlags[i] && <Icon source="check" size={16} color={colors.primaryForeground} />}
              </View>
            </View>
          ))}
        </View>
      </Card>

      <SearchBar value={search} onChangeText={setSearch} placeholder="Search workouts..." />

      {/* A scrolling chip row rather than Paper's SegmentedButtons: four equal segments
          truncate "Flexibility" at 375px, and this is also the shape the web uses.

          The chips themselves now come from `components/shared/FilterChip` — they were the
          first copy of that pill and the exercise library needed three more rows of them. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
        accessibilityLabel="Filter workouts by type"
      >
        {WORKOUT_FILTERS.map(({ value, label }) => (
          <FilterChip
            key={value}
            label={label}
            selected={filter === value}
            onPress={() => setFilter(value)}
            accessibilityLabel={`${label} workouts`}
          />
        ))}
      </ScrollView>

      {/* The browse entry to the exercise catalog, which otherwise only exists as a picker
          inside the workout form. Kept to a text button rather than a card: this screen is
          about the workouts you have logged, and the library is a side trip from it. */}
      <View style={styles.libraryLinkRow}>
        <Button
          mode="text"
          icon="book-open-variant"
          onPress={() => navigation.navigate('Exercises')}
          accessibilityLabel="Browse the exercise library"
        >
          Exercise library
        </Button>
      </View>

      {renderedCount === 0 ? (
        workouts.length === 0 ? (
          <EmptyState
            icon="dumbbell"
            title="Add your first workout"
            subtitle="Start tracking strength, cardio, and weekly consistency."
            actionLabel="Add a workout"
            onAction={() => openForm()}
          />
        ) : (
          <EmptyState
            title="No workouts match"
            subtitle="Try a different search or filter."
            actionLabel="Clear filters"
            onAction={clearFilters}
          />
        )
      ) : (
        <>
          {renderSection('Upcoming', groupedUpcoming)}
          {renderSection('This week', groupedThisWeek)}
          {renderSection('Last week', groupedLastWeek)}
          {renderSection(
            'Earlier',
            groupedEarlier,
            windows.earlier.length > earlierVisible ? (
              <Pressable
                style={styles.showMore}
                onPress={() => setEarlierVisible((n) => n + EARLIER_PAGE_SIZE)}
                accessibilityRole="button"
              >
                <Text variant="labelMedium" style={styles.showMoreLabel}>
                  Show {Math.min(EARLIER_PAGE_SIZE, windows.earlier.length - earlierVisible)} more
                </Text>
              </Pressable>
            ) : undefined
          )}
          <AddAnotherCard onPress={() => openForm()} label="Add another workout" />
        </>
      )}

      <ConfirmDialog
        visible={!!deleteId}
        onDismiss={() => setDeleteId(null)}
        title="Delete workout"
        message="Are you sure you want to delete this workout? This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const id = deleteId;
          setDeleteId(null);
          if (!id) return;
          try {
            await deleteWorkout(id);
            Toast.show({ type: 'success', text1: 'Workout deleted' });
          } catch {
            Toast.show({ type: 'error', text1: 'Failed to delete workout' });
          }
        }}
      />
    </MobileScreen>
  );
}
