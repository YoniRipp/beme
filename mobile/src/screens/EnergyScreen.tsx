import React, { useState, useMemo } from 'react';
import { View, FlatList, ScrollView, StyleSheet } from 'react-native';
import { Card, Text, SegmentedButtons, IconButton, FAB, Divider } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { format, isWithinInterval } from 'date-fns';
import { useEnergy } from '../hooks/useEnergy';
import { FoodEntry, DailyCheckIn } from '../types/energy';
import { PeriodSelector } from '../components/shared/PeriodSelector';
import { LoadingView } from '../components/shared/LoadingView';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { getPeriodRange, PeriodKey } from '../lib/dateRanges';

export function EnergyScreen() {
  const navigation = useNavigation<any>();
  const { foodEntries, checkIns, energyLoading, refetchEnergy, deleteFoodEntry, deleteCheckIn } = useEnergy();
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

  const totalCalories = periodEntries.reduce((sum, e) => sum + e.calories, 0);
  const totalProtein = periodEntries.reduce((sum, e) => sum + e.protein, 0);
  const totalCarbs = periodEntries.reduce((sum, e) => sum + e.carbs, 0);
  const totalFats = periodEntries.reduce((sum, e) => sum + e.fats, 0);
  const avgSleep = periodCheckIns.length > 0
    ? periodCheckIns.reduce((sum, c) => sum + (c.sleepHours || 0), 0) / periodCheckIns.length
    : 0;

  if (energyLoading) return <LoadingView />;

  const renderFoodEntry = ({ item }: { item: FoodEntry }) => (
    <Card style={styles.entryCard} mode="outlined">
      <Card.Content style={styles.entryContent}>
        <View style={styles.entryLeft}>
          <Text variant="titleSmall" style={styles.entryName}>{item.name}</Text>
          <Text variant="bodySmall" style={styles.entryMeta}>
            {item.calories} cal · P:{item.protein}g C:{item.carbs}g F:{item.fats}g
          </Text>
          {item.portionAmount && (
            <Text variant="bodySmall" style={styles.entryPortion}>
              {item.portionAmount}{item.portionUnit || 'g'}
            </Text>
          )}
          <Text variant="bodySmall" style={styles.entryDate}>{format(item.date, 'EEE, MMM d')}</Text>
        </View>
        <View style={styles.entryActions}>
          <IconButton icon="pencil" size={18} onPress={() => navigation.navigate('FoodEntryForm', { entryId: item.id })} />
          <IconButton icon="trash-can-outline" size={18} iconColor="#ef4444" onPress={() => setDeleteTarget({ type: 'food', id: item.id })} />
        </View>
      </Card.Content>
    </Card>
  );

  const renderCheckIn = ({ item }: { item: DailyCheckIn }) => (
    <Card style={styles.entryCard} mode="outlined">
      <Card.Content style={styles.entryContent}>
        <View style={styles.entryLeft}>
          <Text variant="titleSmall">{item.sleepHours}h sleep</Text>
          <Text variant="bodySmall" style={styles.entryDate}>{format(item.date, 'EEE, MMM d')}</Text>
        </View>
        <View style={styles.entryActions}>
          <IconButton icon="pencil" size={18} onPress={() => navigation.navigate('SleepForm', { checkInId: item.id })} />
          <IconButton icon="trash-can-outline" size={18} iconColor="#ef4444" onPress={() => setDeleteTarget({ type: 'sleep', id: item.id })} />
        </View>
      </Card.Content>
    </Card>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <SegmentedButtons
          value={tab}
          onValueChange={setTab}
          buttons={[
            { value: 'food', label: 'Food', icon: 'food-apple' },
            { value: 'sleep', label: 'Sleep', icon: 'moon-waning-crescent' },
          ]}
          style={styles.tabSegment}
        />
        <PeriodSelector value={period} onChange={setPeriod} />
      </View>

      {tab === 'food' ? (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statMain}>
              <Text variant="headlineLarge" style={styles.calorieTotal}>{Math.round(totalCalories)}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>calories</Text>
            </View>
            <View style={styles.macroRow}>
              <View style={styles.macroItem}><Text variant="titleSmall" style={{ color: '#3b82f6' }}>{Math.round(totalProtein)}g</Text><Text variant="bodySmall">Protein</Text></View>
              <View style={styles.macroItem}><Text variant="titleSmall" style={{ color: '#f59e0b' }}>{Math.round(totalCarbs)}g</Text><Text variant="bodySmall">Carbs</Text></View>
              <View style={styles.macroItem}><Text variant="titleSmall" style={{ color: '#ef4444' }}>{Math.round(totalFats)}g</Text><Text variant="bodySmall">Fats</Text></View>
            </View>
          </View>
          {periodEntries.length === 0 ? (
            <EmptyState icon="food-apple" title="No food entries" subtitle="Log what you eat" actionLabel="Log Food" onAction={() => navigation.navigate('FoodEntryForm')} />
          ) : (
            <FlatList data={periodEntries} keyExtractor={(i) => i.id} renderItem={renderFoodEntry} contentContainerStyle={styles.list} onRefresh={refetchEnergy} refreshing={energyLoading} />
          )}
        </>
      ) : (
        <>
          <View style={styles.statsRow}>
            <View style={styles.statMain}>
              <Text variant="headlineLarge" style={styles.calorieTotal}>{avgSleep > 0 ? avgSleep.toFixed(1) : '--'}</Text>
              <Text variant="bodySmall" style={styles.statLabel}>{period === 'daily' ? 'hours' : 'avg hours'}</Text>
            </View>
            <Text variant="bodySmall" style={styles.statSub}>{periodCheckIns.length} day{periodCheckIns.length !== 1 ? 's' : ''} logged</Text>
          </View>
          {periodCheckIns.length === 0 ? (
            <EmptyState icon="moon-waning-crescent" title="No sleep logged" subtitle="Track your sleep" actionLabel="Log Sleep" onAction={() => navigation.navigate('SleepForm')} />
          ) : (
            <FlatList data={periodCheckIns} keyExtractor={(i) => i.id} renderItem={renderCheckIn} contentContainerStyle={styles.list} onRefresh={refetchEnergy} refreshing={energyLoading} />
          )}
        </>
      )}

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => navigation.navigate(tab === 'food' ? 'FoodEntryForm' : 'SleepForm')}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        onDismiss={() => setDeleteTarget(null)}
        title={deleteTarget?.type === 'food' ? 'Delete Food Entry' : 'Delete Sleep Log'}
        message="Are you sure you want to delete this entry?"
        confirmLabel="Delete"
        destructive
        onConfirm={() => {
          if (deleteTarget) {
            if (deleteTarget.type === 'food') deleteFoodEntry(deleteTarget.id);
            else deleteCheckIn(deleteTarget.id);
          }
          setDeleteTarget(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { paddingHorizontal: 16, paddingTop: 12 },
  tabSegment: { marginBottom: 8 },
  statsRow: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  statMain: { alignItems: 'center', marginBottom: 8 },
  calorieTotal: { fontWeight: '700', color: '#111827' },
  statLabel: { color: '#6b7280' },
  statSub: { color: '#9ca3af', textAlign: 'center' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  macroItem: { alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  entryCard: { marginBottom: 8 },
  entryContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  entryLeft: { flex: 1 },
  entryName: { fontWeight: '600' },
  entryMeta: { color: '#6b7280', marginTop: 2 },
  entryPortion: { color: '#9ca3af' },
  entryDate: { color: '#9ca3af', marginTop: 2 },
  entryActions: { flexDirection: 'row' },
  fab: { position: 'absolute', right: 16, bottom: 16, backgroundColor: '#3b82f6' },
});
