import { useState, useMemo, useCallback } from 'react';
import { useEnergy } from '@/hooks/useEnergy';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import { FoodEntry, type DailyCheckIn } from '@/types/energy';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { BulkFoodEntryModal } from '@/components/energy/BulkFoodEntryModal';
import { DuplicateDayDialog } from '@/components/energy/DuplicateDayDialog';
import { FoodCard } from '@/components/energy/FoodCard';
import { MacroCircles } from '@/components/home/MacroCircles';
import { MacroGoalModal } from '@/components/home/MacroGoalModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyStateCard } from '@/components/shared/EmptyStateCard';
import { AddAnotherCard } from '@/components/shared/AddAnotherCard';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { Moon, Trash2, Pencil, ChevronDown, Plus, ClipboardList, Copy, Sun, CloudSun, Sunset, Cookie, UtensilsCrossed } from 'lucide-react';
import { isSameDay, isWithinInterval, format, startOfWeek, endOfWeek } from 'date-fns';
import { getPeriodRange, toLocalDateString } from '@/lib/dateRanges';

interface FoodGroup {
  key: string;
  label: string;
  entries: FoodEntry[];
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}

type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

const MEAL_ICONS: Record<MealType, typeof Sun> = {
  Breakfast: Sun,
  Lunch: CloudSun,
  Dinner: Sunset,
  Snack: Cookie,
};

function getMealType(entry: FoodEntry): MealType {
  // Prefer explicit mealType field
  if (entry.mealType) {
    const mt = entry.mealType.charAt(0).toUpperCase() + entry.mealType.slice(1);
    if (mt === 'Breakfast' || mt === 'Lunch' || mt === 'Dinner' || mt === 'Snack') return mt;
  }
  const time = entry.startTime ?? entry.endTime;
  if (!time) {
    const h = new Date(entry.date).getHours();
    if (h < 11) return 'Breakfast';
    if (h < 14) return 'Lunch';
    if (h < 17) return 'Snack';
    return 'Dinner';
  }
  const hour = parseInt(time.split(':')[0], 10);
  if (hour < 11) return 'Breakfast';
  if (hour < 14) return 'Lunch';
  if (hour < 17) return 'Snack';
  return 'Dinner';
}

interface MealGroup {
  meal: MealType;
  entries: FoodEntry[];
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}

function groupByMeal(entries: FoodEntry[]): MealGroup[] {
  const order: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const groups = new Map<MealType, FoodEntry[]>();
  for (const m of order) groups.set(m, []);
  for (const e of entries) {
    const meal = getMealType(e);
    groups.get(meal)!.push(e);
  }
  return order.map((meal) => {
    const mealEntries = groups.get(meal)!;
    return {
      meal,
      entries: mealEntries,
      totalCal: mealEntries.reduce((s, e) => s + e.calories, 0),
      totalProtein: mealEntries.reduce((s, e) => s + e.protein, 0),
      totalCarbs: mealEntries.reduce((s, e) => s + e.carbs, 0),
      totalFats: mealEntries.reduce((s, e) => s + e.fats, 0),
    };
  });
  // All 4 meals always returned — no filter
}

function groupFoodEntries(
  entries: FoodEntry[],
  period: 'daily' | 'weekly' | 'monthly' | 'yearly',
): FoodGroup[] {
  if (period === 'daily') return [];

  const bucketMap = new Map<string, { label: string; entries: FoodEntry[] }>();

  for (const entry of entries) {
    const d = new Date(entry.date);
    let key: string;
    let label: string;

    if (period === 'weekly') {
      key = format(d, 'yyyy-MM-dd');
      label = format(d, 'EEEE, MMM d');
    } else if (period === 'monthly') {
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const we = endOfWeek(d, { weekStartsOn: 0 });
      key = format(ws, 'yyyy-MM-dd');
      label = `${format(ws, 'MMM d')} – ${format(we, 'MMM d')}`;
    } else {
      key = format(d, 'yyyy-MM');
      label = format(d, 'MMMM yyyy');
    }

    if (!bucketMap.has(key)) {
      bucketMap.set(key, { label, entries: [] });
    }
    bucketMap.get(key)!.entries.push(entry);
  }

  const sortedKeys = Array.from(bucketMap.keys()).sort((a, b) => b.localeCompare(a));

  return sortedKeys.map((key) => {
    const bucket = bucketMap.get(key)!;
    const totalCal = bucket.entries.reduce((s, e) => s + e.calories, 0);
    const totalProtein = bucket.entries.reduce((s, e) => s + e.protein, 0);
    const totalCarbs = bucket.entries.reduce((s, e) => s + e.carbs, 0);
    const totalFats = bucket.entries.reduce((s, e) => s + e.fats, 0);
    return {
      key,
      label: bucket.label,
      entries: bucket.entries,
      totalCal,
      totalProtein,
      totalCarbs,
      totalFats,
    };
  });
}

function CollapsibleGroup({
  group,
  defaultOpen,
  period,
  onEdit,
  onDelete,
}: {
  group: FoodGroup;
  defaultOpen: boolean;
  period: 'weekly' | 'monthly' | 'yearly';
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const isAvg = period !== 'weekly';
  const uniqueDays = new Set(group.entries.map((e) => e.date)).size;
  const displayCal = isAvg && uniqueDays > 1
    ? Math.round(group.totalCal / uniqueDays)
    : group.totalCal;
  const calLabel = isAvg && uniqueDays > 1 ? `${displayCal} cal/day` : `${displayCal} cal`;

  return (
    <div className="bg-card overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="text-left">
          <p className="text-sm font-semibold">{group.label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {group.entries.length} {group.entries.length === 1 ? 'item' : 'items'}
            {isAvg && uniqueDays > 1 && ` · ${uniqueDays} days`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-display text-base font-medium tabular-nums">{calLabel}</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {open && (
        <div className="px-2 pb-2 space-y-1">
          {group.entries.map((entry) => (
            <FoodCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function MealGroupHeader({
  meal,
  totalCal,
  totalProtein,
  totalCarbs,
  totalFats,
}: {
  meal: MealType;
  totalCal: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
}) {
  const Icon = MEAL_ICONS[meal];
  return (
    <div className="flex items-end justify-between px-1 pt-1 pb-2">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-terracotta/10 text-terracotta flex items-center justify-center">
          <Icon className="w-4 h-4" />
        </div>
        <span className="font-display text-base font-medium tracking-tight">{meal}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="font-display text-sm font-medium tabular-nums">{totalCal}<span className="text-[10px] uppercase tracking-wider text-muted-foreground ml-1 font-sans">kcal</span></span>
        <span className="text-[10px] text-muted-foreground tabular-nums hidden sm:inline">
          P {totalProtein}g · C {totalCarbs}g · F {totalFats}g
        </span>
      </div>
    </div>
  );
}

export function Energy() {
  const { checkIns, foodEntries, energyLoading, addCheckIn, updateCheckIn, deleteCheckIn, addFoodEntry, updateFoodEntry, deleteFoodEntry, addFoodEntriesBatch, duplicateDay } = useEnergy();
  const { macroGoals, setMacroGoals, calorieGoal } = useMacroGoals();
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<DailyCheckIn | undefined>(undefined);
  const [deleteConfirmCheckInId, setDeleteConfirmCheckInId] = useState<string | null>(null);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [editingFoodEntry, setEditingFoodEntry] = useState<FoodEntry | undefined>(undefined);
  const [caloriePeriod, setCaloriePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [sleepPeriod, setSleepPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [macroGoalModalOpen, setMacroGoalModalOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [activeMealType, setActiveMealType] = useState<MealType | undefined>();

  const today = useMemo(() => new Date(), []);

  const periodFoodEntries = useMemo(() => {
    const range = getPeriodRange(caloriePeriod, today);
    const filtered = foodEntries.filter(f =>
      isWithinInterval(new Date(f.date), range)
    );

    filtered.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateB !== dateA) return dateB - dateA;
      const hasTimeA = !!(a.startTime ?? a.endTime);
      const hasTimeB = !!(b.startTime ?? b.endTime);
      if (hasTimeB && !hasTimeA) return 1;
      if (hasTimeA && !hasTimeB) return -1;
      if (hasTimeA && hasTimeB) {
        const tA = a.startTime ?? a.endTime ?? '';
        const tB = b.startTime ?? b.endTime ?? '';
        return tA.localeCompare(tB);
      }
      return 0;
    });

    return filtered;
  }, [foodEntries, caloriePeriod]);

  const foodGroups = useMemo(
    () => groupFoodEntries(periodFoodEntries, caloriePeriod),
    [periodFoodEntries, caloriePeriod],
  );

  const mealGroups = useMemo(
    () => caloriePeriod === 'daily' ? groupByMeal(periodFoodEntries) : [],
    [periodFoodEntries, caloriePeriod],
  );

  const periodTotals = useMemo(() => {
    const totals = periodFoodEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fats: acc.fats + entry.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
    if (caloriePeriod === 'daily' || periodFoodEntries.length === 0) return totals;
    const uniqueDays = new Set(periodFoodEntries.map(e => e.date)).size;
    if (uniqueDays <= 1) return totals;
    return {
      calories: Math.round(totals.calories / uniqueDays),
      protein: totals.protein / uniqueDays,
      carbs: totals.carbs / uniqueDays,
      fats: totals.fats / uniqueDays,
    };
  }, [periodFoodEntries, caloriePeriod]);

  const sleepData = useMemo(() => {
    const ranges = {
      daily: getPeriodRange('daily', today),
      weekly: getPeriodRange('weekly', today),
      monthly: getPeriodRange('monthly', today),
      yearly: getPeriodRange('yearly', today),
    };

    const calculateSleep = (range: { start: Date; end: Date }) => {
      const periodCheckIns = checkIns.filter(c =>
        isWithinInterval(new Date(c.date), range)
      );
      const totalHours = periodCheckIns.reduce((sum, c) => sum + (c.sleepHours || 0), 0);
      return {
        hours: periodCheckIns.length > 0 ? totalHours / periodCheckIns.length : 0,
        count: periodCheckIns.length,
      };
    };

    return {
      daily: calculateSleep(ranges.daily),
      weekly: calculateSleep(ranges.weekly),
      monthly: calculateSleep(ranges.monthly),
      yearly: calculateSleep(ranges.yearly),
    };
  }, [checkIns, today]);

  const selectedSleep = sleepData[sleepPeriod];

  const todayCheckIn = useMemo(() => {
    return checkIns.find(c => isSameDay(new Date(c.date), today));
  }, [checkIns, today]);

  const recentCheckIns = useMemo(() => {
    return [...checkIns]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 14);
  }, [checkIns]);

  const handleSleepSave = (hours: number) => {
    if (editingCheckIn) {
      updateCheckIn(editingCheckIn.id, { sleepHours: hours });
      setEditingCheckIn(undefined);
    } else if (todayCheckIn) {
      updateCheckIn(todayCheckIn.id, { sleepHours: hours });
    } else {
      addCheckIn({
        date: today,
        sleepHours: hours,
      });
    }
  };

  const openSleepModalForToday = () => {
    setEditingCheckIn(undefined);
    setSleepModalOpen(true);
  };

  const openSleepModalForCheckIn = (checkIn: DailyCheckIn) => {
    setEditingCheckIn(checkIn);
    setSleepModalOpen(true);
  };

  const confirmDeleteCheckIn = () => {
    if (deleteConfirmCheckInId) {
      deleteCheckIn(deleteConfirmCheckInId);
      setDeleteConfirmCheckInId(null);
    }
  };

  const handleFoodSave = (entry: Omit<FoodEntry, 'id'>) => {
    if (editingFoodEntry) {
      updateFoodEntry(editingFoodEntry.id, entry);
    } else {
      addFoodEntry(entry);
    }
    setEditingFoodEntry(undefined);
  };

  const handleAddFood = useCallback((mealType?: MealType) => {
    setEditingFoodEntry(undefined);
    setActiveMealType(mealType);
    setFoodModalOpen(true);
  }, []);


  const handleEditFood = useCallback((entry: FoodEntry) => {
    setEditingFoodEntry(entry);
    setActiveMealType(undefined);
    setFoodModalOpen(true);
  }, []);

  const handleDeleteFood = useCallback((id: string) => {
    setDeleteConfirmId(id);
  }, []);

  const confirmDeleteFood = () => {
    if (deleteConfirmId) {
      deleteFoodEntry(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="max-w-lg md:max-w-6xl mx-auto space-y-5 pb-24">
      <ContentWithLoading loading={energyLoading} loadingText="Loading energy...">
      {/* Action buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setBulkModalOpen(true)}
        >
          <ClipboardList className="w-3.5 h-3.5" />
          Add Menu
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 h-8 text-xs"
          onClick={() => setDuplicateDialogOpen(true)}
        >
          <Copy className="w-3.5 h-3.5" />
          Copy Day
        </Button>
      </div>

      {/* Calorie + Macro Section */}
      {(() => {
        const calGoalTarget = calorieGoal;
        const calPct = calGoalTarget > 0 ? Math.min(periodTotals.calories / calGoalTarget, 1) : 0;

        const periodSelectorEl = (
          <PeriodSelector
            options={(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
              const range = getPeriodRange(period, today);
              const entries = foodEntries.filter(f => isWithinInterval(new Date(f.date), range));
              const totalCal = entries.reduce((sum, e) => sum + e.calories, 0);
              if (period === 'daily') return { value: period, label: period, summary: `${totalCal} cal` };
              const days = new Set(entries.map(e => e.date)).size;
              const avg = days > 0 ? Math.round(totalCal / days) : 0;
              return { value: period, label: period, summary: `${avg} avg` };
            })}
            selected={caloriePeriod}
            onChange={setCaloriePeriod}
          />
        );

        const calorieRingEl = (
          <div className="relative w-44 h-44">
            <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - calPct)} className="transition-all duration-700 ease-out" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-display text-[40px] font-medium tabular-nums leading-none tracking-tight">{Math.round(periodTotals.calories)}</span>
              <span className="text-[11px] text-muted-foreground leading-none mt-2">of {calGoalTarget}{caloriePeriod !== 'daily' ? ' / day' : ''} kcal</span>
            </div>
          </div>
        );

        const macroCirclesEl = (
          <MacroCircles
            carbs={{ current: Math.round(periodTotals.carbs), goal: macroGoals.carbs }}
            fat={{ current: Math.round(periodTotals.fats), goal: macroGoals.fat }}
            protein={{ current: Math.round(periodTotals.protein), goal: macroGoals.protein }}
            onEditGoals={() => setMacroGoalModalOpen(true)}
          />
        );

        return (
          <>
            {/* Mobile: stacked cards */}
            <div className="md:hidden space-y-4">
              <Card className="overflow-hidden">
                <CardContent className="p-5">
                  {periodSelectorEl}
                  <div className="flex justify-center mt-4">{calorieRingEl}</div>
                </CardContent>
              </Card>
              <Card className="overflow-hidden">
                <CardContent className="p-5">{macroCirclesEl}</CardContent>
              </Card>
            </div>

            {/* Desktop: single card, all circles in one row */}
            <Card className="hidden md:block overflow-hidden">
              <CardContent className="p-6">
                {periodSelectorEl}
                <div className="flex items-center justify-center gap-10 mt-5">
                  <div className="shrink-0">{calorieRingEl}</div>
                  <div className="flex-1">{macroCirclesEl}</div>
                </div>
              </CardContent>
            </Card>
          </>
        );
      })()}

      {/* Food entries */}
      <div className="space-y-4">
        <h3 className="font-display text-xl font-medium tracking-tight">Journal</h3>

        {caloriePeriod === 'daily' ? (
          /* Daily: unified input + compact meal-grouped timeline */
          <>
            {periodFoodEntries.length === 0 ? (
              /* Empty state */
              <Card>
                <div className="flex flex-col items-center gap-4 p-8 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-terracotta/10 flex items-center justify-center">
                    <UtensilsCrossed className="w-7 h-7 text-terracotta" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-medium tracking-tight">What did you eat today?</p>
                    <p className="text-sm text-muted-foreground mt-1.5 max-w-xs leading-relaxed">
                      Log your meals to track your nutrition and stay on top of your goals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddFood()}
                    className="inline-flex items-center justify-center gap-1.5 h-11 px-6 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-colors press"
                  >
                    <Plus className="w-4 h-4" />
                    Add food
                  </button>
                </div>
              </Card>
            ) : (
              <>
                {/* Add food button */}
                <button
                  type="button"
                  onClick={() => handleAddFood()}
                  className="w-full flex items-center justify-center gap-1.5 h-11 text-sm font-medium text-primary-foreground bg-primary rounded-full hover:bg-primary/90 transition-colors press"
                >
                  <Plus className="w-4 h-4" />
                  Add food
                </button>

                {/* Compact meal-grouped timeline */}
                <div className="space-y-5">
                  {mealGroups
                    .filter((group) => group.entries.length > 0)
                    .map((group) => (
                      <div key={group.meal}>
                        <MealGroupHeader
                          meal={group.meal}
                          totalCal={group.totalCal}
                          totalProtein={group.totalProtein}
                          totalCarbs={group.totalCarbs}
                          totalFats={group.totalFats}
                        />
                        <Card>
                          <div className="p-2 space-y-1">
                            {group.entries.map((entry) => (
                              <FoodCard
                                key={entry.id}
                                entry={entry}
                                onEdit={handleEditFood}
                                onDelete={handleDeleteFood}
                              />
                            ))}
                          </div>
                        </Card>
                      </div>
                    ))}
                </div>
              </>
            )}
          </>
        ) : periodFoodEntries.length === 0 ? (
          <EmptyStateCard
            onClick={() => handleAddFood()}
            title="Add your first food entry"
            description="Tap to log what you ate"
          />
        ) : (
          /* Weekly/Monthly/Yearly: unified accordion */
          <>
            <Card className="overflow-hidden divide-y divide-border">
              {foodGroups.map((group, i) => (
                <CollapsibleGroup
                  key={group.key}
                  group={group}
                  defaultOpen={i === 0}
                  period={caloriePeriod as 'weekly' | 'monthly' | 'yearly'}
                  onEdit={handleEditFood}
                  onDelete={handleDeleteFood}
                />
              ))}
            </Card>
            <AddAnotherCard onClick={() => handleAddFood()} label="Add food entry" />
          </>
        )}
      </div>

      {/* Sleep Hours Card */}
      <Card className="p-5 sm:p-6">
        <h3 className="font-display text-xl font-medium tracking-tight mb-4">Sleep</h3>

        <PeriodSelector
          options={(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
            const sleep = sleepData[period];
            return { value: period, label: period, summary: sleep.hours > 0 ? `${sleep.hours.toFixed(1)}h` : '—' };
          })}
          selected={sleepPeriod}
          onChange={setSleepPeriod}
        />

        <div className="my-5">
          <p className="font-display text-4xl font-medium tabular-nums tracking-tight leading-none">
            {sleepPeriod === 'daily'
              ? (selectedSleep.count > 0 ? <>{selectedSleep.hours.toFixed(1)}<span className="text-xl font-sans font-normal text-muted-foreground ml-1.5">h</span></> : <span className="text-base font-sans text-muted-foreground">Not logged</span>)
              : selectedSleep.count > 0
                ? <>{selectedSleep.hours.toFixed(1)}<span className="text-xl font-sans font-normal text-muted-foreground ml-1.5">h avg</span></>
                : <span className="text-base font-sans text-muted-foreground">No data</span>}
          </p>
          {sleepPeriod !== 'daily' && selectedSleep.count > 0 && (
            <p className="text-sm text-muted-foreground mt-1.5">
              {selectedSleep.count} {selectedSleep.count === 1 ? 'day' : 'days'} logged
            </p>
          )}
        </div>

        {recentCheckIns.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-2">Sleep log</h4>
            {recentCheckIns.map((c) => {
              const dateStr = toLocalDateString(new Date(c.date));
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-muted/60 rounded-xl"
                >
                  <div>
                    <p className="font-medium text-sm">{format(new Date(c.date), 'EEE, MMM d, yyyy')}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{c.sleepHours ?? 0}h slept</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openSleepModalForCheckIn(c)}
                      aria-label={`Edit sleep for ${dateStr}`}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteConfirmCheckInId(c.id)}
                      aria-label={`Delete sleep for ${dateStr}`}
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <AddAnotherCard onClick={openSleepModalForToday} icon={Moon} label="Log sleep" />
      </Card>
      </ContentWithLoading>

      <SleepEditModal
        open={sleepModalOpen}
        onOpenChange={(open) => {
          setSleepModalOpen(open);
          if (!open) setEditingCheckIn(undefined);
        }}
        onSave={handleSleepSave}
        checkIn={editingCheckIn ? { id: editingCheckIn.id, date: toLocalDateString(new Date(editingCheckIn.date)), sleepHours: editingCheckIn.sleepHours } : undefined}
        currentHours={!editingCheckIn ? todayCheckIn?.sleepHours : undefined}
      />

      <FoodEntryModal
        open={foodModalOpen}
        onOpenChange={setFoodModalOpen}
        onSave={handleFoodSave}
        entry={editingFoodEntry}
        defaultMealType={activeMealType ? activeMealType.toLowerCase() as 'breakfast' | 'lunch' | 'dinner' | 'snack' : undefined}
      />

      <ConfirmationDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Food Entry"
        message="Are you sure you want to delete this food entry? This action cannot be undone."
        onConfirm={confirmDeleteFood}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />

      <ConfirmationDialog
        open={!!deleteConfirmCheckInId}
        onOpenChange={(open) => !open && setDeleteConfirmCheckInId(null)}
        title="Delete Sleep Log"
        message="Are you sure you want to delete this sleep entry? This action cannot be undone."
        onConfirm={confirmDeleteCheckIn}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />

      <MacroGoalModal
        open={macroGoalModalOpen}
        onOpenChange={setMacroGoalModalOpen}
        goals={macroGoals}
        onSave={setMacroGoals}
      />

      <BulkFoodEntryModal
        open={bulkModalOpen}
        onOpenChange={setBulkModalOpen}
        onSave={addFoodEntriesBatch}
      />

      <DuplicateDayDialog
        open={duplicateDialogOpen}
        onOpenChange={setDuplicateDialogOpen}
        onDuplicate={duplicateDay}
      />
    </div>
  );
}
