import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { Card as PaperCard, Icon, SegmentedButtons, Text } from 'react-native-paper';
import { Button, Card, IconButton } from '../components/ui';
import { useNavigation } from '@react-navigation/native';
import { format, isWithinInterval } from 'date-fns';
import { useEnergy } from '../hooks/useEnergy';
import { FoodEntry, DailyCheckIn } from '../types/energy';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MobileScreen } from '../components/shared/MobileScreen';
import { ErrorNotice } from '../components/shared/ErrorNotice';
import { MobileFoodCard } from '../components/shared/MobileFoodCard';
import { MetricCard } from '../components/shared/MetricCard';
import { fonts, radius, spacing } from '../theme';
import { useThemeContext } from '../theme/ThemeContext';
import { useThemedStyles } from '../theme/useThemedStyles';
import { getPeriodRange, PeriodKey } from '../lib/dateRanges';
import { inferMealTypeFromHour } from '@trackvibe/shared/domain';
import Toast from 'react-native-toast-message';

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

const MEALS: Array<{ key: MealType; label: string; icon: string }> = [
  { key: 'breakfast', label: 'Breakfast', icon: 'weather-sunny' },
  { key: 'lunch', label: 'Lunch', icon: 'weather-partly-cloudy' },
  { key: 'dinner', label: 'Dinner', icon: 'weather-sunset' },
  { key: 'snack', label: 'Snack', icon: 'cookie-outline' },
];

/**
 * Which meal an entry belongs to. The stored `mealType` wins; otherwise the hour comes from
 * `startTime`/`endTime`. Only the hour-to-meal bucketing is shared -- this field precedence
 * matches the web's `features/energy/mealType.ts`, including its flaw.
 *
 * **The `entry.date.getHours()` fallback cannot work**, and the web's copy cannot either.
 * `food_entries.date` is a Postgres DATE that the mappers turn into local midnight, so that
 * expression is always 0 and the branch always returns breakfast. An entry with no `mealType`
 * and no `startTime` -- a legacy row, since the form has set `startTime` for a while -- lands
 * in breakfast whenever it was actually eaten.
 *
 * Left as it shipped, and matching the web deliberately: which bucket those rows belong in is
 * a product call, written up in `docs/HANDOFF.md` under "Needs the owner".
 */
function inferMeal(entry: FoodEntry): MealType {
  if (entry.mealType) return entry.mealType;
  const time = entry.startTime || entry.endTime;
  const hour = time ? Number(time.split(':')[0]) : entry.date.getHours();
  return inferMealTypeFromHour(hour);
}

export function EnergyScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useThemeContext();
  const styles = useThemedStyles((colors) => ({
    summaryCard: {},
    summaryContent: {
      gap: spacing.sm,
    },
    eyebrow: {
      color: colors.primary,
      letterSpacing: 1,
      textTransform: 'uppercase',
    },
    total: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '800',
    },
    macroRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    macro: {
      color: colors.textMuted,
      fontFamily: fonts.bold,
      fontWeight: '700',
    },
    metricRow: {
      flexDirection: 'row',
      gap: spacing.md,
    },
    sectionStack: {
      gap: spacing.xl,
    },
    mealSection: {
      gap: spacing.sm,
    },
    mealHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    mealTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
    },
    mealIcon: {
      width: 34,
      height: 34,
      borderRadius: radius.sm,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    sectionTitle: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '800',
    },
    muted: {
      color: colors.textMuted,
    },
    cardStack: {
      gap: spacing.sm,
    },
    /**
     * Stays on Paper's `Card`, not `ui/Card`: a dashed edge with no shadow is an affordance,
     * the same thing the web draws for its empty slots and `AddAnotherCard`. Giving it the
     * raised-card treatment would make an empty meal look like a logged one.
     */
    emptyMealCard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.border,
    },
    emptyMealContent: {
      alignItems: 'center',
      paddingVertical: spacing.md,
    },
    logCard: {},
    logRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    logTitle: {
      color: colors.text,
      fontFamily: fonts.bold,
      fontWeight: '800',
    },
    actionRow: {
      flexDirection: 'row',
    },
  }));
  const { foodEntries, checkIns, energyLoading, energyError, refetchEnergy, deleteFoodEntry, deleteCheckIn } =
    useEnergy();
  const [tab, setTab] = useState('food');
  const [period, setPeriod] = useState<PeriodKey>('daily');
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'food' | 'sleep'; id: string } | null>(null);

  const { start, end } = useMemo(() => getPeriodRange(period), [period]);

  const periodEntries = useMemo(
    () => foodEntries.filter((e) => isWithinInterval(e.date, { start, end })).sort((a, b) => b.date.getTime() - a.date.getTime()),
    [foodEntries, start, end]
  );

  const periodCheckIns = useMemo(
    () => checkIns.filter((c) => c.sleepHours != null && isWithinInterval(c.date, { start, end })).sort((a, b) => b.date.getTime() - a.date.getTime()),
    [checkIns, start, end]
  );

  const totals = useMemo(() => ({
    calories: periodEntries.reduce((sum, e) => sum + e.calories, 0),
    protein: periodEntries.reduce((sum, e) => sum + e.protein, 0),
    carbs: periodEntries.reduce((sum, e) => sum + e.carbs, 0),
    fats: periodEntries.reduce((sum, e) => sum + e.fats, 0),
  }), [periodEntries]);

  const avgSleep = periodCheckIns.length > 0
    ? periodCheckIns.reduce((sum, c) => sum + (c.sleepHours || 0), 0) / periodCheckIns.length
    : 0;

  const mealGroups = useMemo(() => MEALS.map((meal) => {
    const entries = periodEntries.filter((entry) => inferMeal(entry) === meal.key);
    return {
      ...meal,
      entries,
      calories: entries.reduce((sum, entry) => sum + entry.calories, 0),
    };
  }), [periodEntries]);

  if (energyLoading) return <LoadingView />;

  const addFood = (mealType?: MealType) => navigation.navigate('FoodEntryForm', mealType ? { mealType } : undefined);

  const renderSleep = (item: DailyCheckIn) => (
    <Card key={item.id} mode="contained" style={styles.logCard}>
      <Card.Content style={styles.logRow}>
        <View>
          <Text variant="titleMedium" style={styles.logTitle}>{item.sleepHours}h sleep</Text>
          <Text variant="bodySmall" style={styles.muted}>{format(item.date, 'EEE, MMM d')}</Text>
        </View>
        <View style={styles.actionRow}>
          <IconButton icon="pencil" size={18} onPress={() => navigation.navigate('SleepForm', { checkInId: item.id })} />
          <IconButton icon="trash-can-outline" size={18} iconColor={colors.danger} onPress={() => setDeleteTarget({ type: 'sleep', id: item.id })} />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <MobileScreen title="Journal" subtitle="Food, calories, macros, and sleep." onRefresh={refetchEnergy}>
      {/* `useEnergy` has always computed this and no screen has ever read it. Without it a
          failed fetch renders `[]`, so "No food entries" is what a user sees when the request
          500s -- and the empty states below are reachable either way. */}
      <ErrorNotice message={energyError} />
      <SegmentedButtons
        value={tab}
        onValueChange={setTab}
        buttons={[
          { value: 'food', label: 'Food', icon: 'food-apple' },
          { value: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent' },
        ]}
      />
      <PeriodSelector value={period} onChange={setPeriod} />

      {tab === 'food' ? (
        <>
          <Card mode="contained" style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <Text variant="labelLarge" style={styles.eyebrow}>Calories</Text>
              <Text variant="displaySmall" style={styles.total}>{Math.round(totals.calories)}</Text>
              <View style={styles.macroRow}>
                <Text style={styles.macro}>P {Math.round(totals.protein)}g</Text>
                <Text style={styles.macro}>C {Math.round(totals.carbs)}g</Text>
                <Text style={styles.macro}>F {Math.round(totals.fats)}g</Text>
              </View>
            </Card.Content>
          </Card>

          {period === 'daily' ? (
            <View style={styles.sectionStack}>
              {mealGroups.map((meal) => (
                <View key={meal.key} style={styles.mealSection}>
                  <View style={styles.mealHeader}>
                    <View style={styles.mealTitleRow}>
                      <View style={styles.mealIcon}>
                        <Icon source={meal.icon} size={18} color={colors.primary} />
                      </View>
                      <View>
                        <Text variant="titleMedium" style={styles.sectionTitle}>{meal.label}</Text>
                        <Text variant="bodySmall" style={styles.muted}>{Math.round(meal.calories)} kcal</Text>
                      </View>
                    </View>
                    <Button mode="contained-tonal" compact icon="plus" onPress={() => addFood(meal.key)}>
                      Add
                    </Button>
                  </View>
                  {meal.entries.length > 0 ? (
                    <View style={styles.cardStack}>
                      {meal.entries.map((entry) => (
                        <MobileFoodCard
                          key={entry.id}
                          entry={entry}
                          onEdit={() => navigation.navigate('FoodEntryForm', { entryId: entry.id })}
                          onDelete={() => setDeleteTarget({ type: 'food', id: entry.id })}
                        />
                      ))}
                    </View>
                  ) : (
                    <PaperCard mode="contained" style={styles.emptyMealCard} onPress={() => addFood(meal.key)}>
                      <PaperCard.Content style={styles.emptyMealContent}>
                        <Text variant="bodyMedium" style={styles.muted}>No {meal.label.toLowerCase()} logged</Text>
                      </PaperCard.Content>
                    </PaperCard>
                  )}
                </View>
              ))}
            </View>
          ) : periodEntries.length === 0 ? (
            <EmptyState icon="food-apple" title="No food entries" subtitle="Log what you eat" actionLabel="Log Food" onAction={() => addFood()} />
          ) : (
            <View style={styles.cardStack}>
              {periodEntries.map((entry) => (
                <MobileFoodCard
                  key={entry.id}
                  entry={entry}
                  onEdit={() => navigation.navigate('FoodEntryForm', { entryId: entry.id })}
                  onDelete={() => setDeleteTarget({ type: 'food', id: entry.id })}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <>
          <View style={styles.metricRow}>
            <MetricCard icon="moon-waning-crescent" label={period === 'daily' ? 'Hours' : 'Avg hours'} value={avgSleep > 0 ? avgSleep.toFixed(1) : '--'} tone="sleep" />
            <MetricCard icon="calendar-check" label="Logged" value={`${periodCheckIns.length}`} meta="days" tone="primary" />
          </View>
          {periodCheckIns.length === 0 ? (
            <EmptyState icon="moon-waning-crescent" title="No sleep logged" subtitle="Track your sleep" actionLabel="Log Sleep" onAction={() => navigation.navigate('SleepForm')} />
          ) : (
            <View style={styles.cardStack}>
              {periodCheckIns.map(renderSleep)}
            </View>
          )}
        </>
      )}

      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'food' ? 'Delete Food Entry' : 'Delete Sleep Log'}
        message="Are you sure you want to delete this entry?"
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          const target = deleteTarget;
          setDeleteTarget(null);
          if (!target) return;
          try {
            if (target.type === 'food') await deleteFoodEntry(target.id);
            else await deleteCheckIn(target.id);
          } catch {
            Toast.show({
              type: 'error',
              text1: target.type === 'food' ? 'Failed to delete entry' : 'Failed to delete check-in',
            });
          }
        }}
      />
    </MobileScreen>
  );
}
