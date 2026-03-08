import { useState, useMemo, useCallback } from 'react';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import { FoodEntry, type DailyCheckIn } from '@/types/energy';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { FoodCard } from '@/components/energy/FoodCard';
import { MacroCircles } from '@/components/home/MacroCircles';
import { MacroGoalModal } from '@/components/home/MacroGoalModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyStateCard } from '@/components/shared/EmptyStateCard';
import { AddAnotherCard } from '@/components/shared/AddAnotherCard';
import { PeriodSelector } from '@/components/shared/PeriodSelector';
import { Moon, Trash2, Pencil, ChevronDown, Plus } from 'lucide-react';
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

function getMealType(entry: FoodEntry): MealType {
  const time = entry.startTime ?? entry.endTime;
  if (!time) {
    // Guess from date hour
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

function groupByMeal(entries: FoodEntry[]): { meal: MealType; entries: FoodEntry[]; totalCal: number }[] {
  const order: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
  const groups = new Map<MealType, FoodEntry[]>();
  for (const m of order) groups.set(m, []);
  for (const e of entries) {
    const meal = getMealType(e);
    groups.get(meal)!.push(e);
  }
  return order
    .map((meal) => {
      const mealEntries = groups.get(meal)!;
      return {
        meal,
        entries: mealEntries,
        totalCal: mealEntries.reduce((s, e) => s + e.calories, 0),
      };
    })
    .filter((g) => g.entries.length > 0);
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
    <div className="rounded-2xl border bg-white overflow-hidden">
      <button
        type="button"
        className="w-full flex items-center justify-between p-3 hover:bg-muted/40 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <div className="text-left">
          <p className="text-sm font-medium">{group.label}</p>
          <p className="text-xs text-muted-foreground">
            {group.entries.length} {group.entries.length === 1 ? 'item' : 'items'}
            {isAvg && uniqueDays > 1 && ` • ${uniqueDays} days`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold tabular-nums">{calLabel}</span>
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 space-y-2">
          {group.entries.map((entry) => (
            <FoodCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  );
}

function MealSection({
  meal,
  entries,
  totalCal,
  onEdit,
  onDelete,
  onAdd,
}: {
  meal: MealType;
  entries: FoodEntry[];
  totalCal: number;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <Card className="rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h4 className="text-sm font-semibold">{meal}</h4>
        <span className="text-sm font-medium text-muted-foreground tabular-nums">{totalCal} cal</span>
      </div>
      <div className="px-3 pb-3 space-y-2">
        {entries.map((entry) => (
          <FoodCard key={entry.id} entry={entry} onEdit={onEdit} onDelete={onDelete} />
        ))}
        <button
          type="button"
          onClick={onAdd}
          className="w-full flex items-center justify-center gap-1.5 py-2 text-sm text-primary font-medium hover:bg-muted/50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Food
        </button>
      </div>
    </Card>
  );
}

export function Energy() {
  const { checkIns, foodEntries, energyLoading, addCheckIn, updateCheckIn, deleteCheckIn, addFoodEntry, updateFoodEntry, deleteFoodEntry } = useEnergy();
  const { goals } = useGoals();
  const { macroGoals, setMacroGoals } = useMacroGoals();
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<DailyCheckIn | undefined>(undefined);
  const [deleteConfirmCheckInId, setDeleteConfirmCheckInId] = useState<string | null>(null);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [editingFoodEntry, setEditingFoodEntry] = useState<FoodEntry | undefined>(undefined);
  const [caloriePeriod, setCaloriePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [sleepPeriod, setSleepPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [macroGoalModalOpen, setMacroGoalModalOpen] = useState(false);

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

  const handleAddFood = () => {
    setEditingFoodEntry(undefined);
    setFoodModalOpen(true);
  };

  const handleEditFood = useCallback((entry: FoodEntry) => {
    setEditingFoodEntry(entry);
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
    <div className="max-w-lg mx-auto space-y-5 pb-24">
      <ContentWithLoading loading={energyLoading} loadingText="Loading energy...">
      {/* Calorie Progress Ring */}
      {(() => {
        const calorieGoal = goals.find((g) => g.type === 'calories' && g.period === 'daily');
        const calGoalTarget = calorieGoal?.target ?? 2000;
        const calPct = calGoalTarget > 0 ? Math.min(periodTotals.calories / calGoalTarget, 1) : 0;
        const calRemaining = Math.max(calGoalTarget - periodTotals.calories, 0);
        return (
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="p-5">
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

              <div className="flex justify-center my-4">
                <div className="relative w-44 h-44">
                  <svg viewBox="0 0 100 100" className="w-44 h-44 -rotate-90">
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="7"
                      className="text-muted"
                    />
                    <circle
                      cx="50" cy="50" r="42"
                      fill="none"
                      stroke="hsl(138, 15%, 54%)"
                      strokeWidth="7"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 42}
                      strokeDashoffset={2 * Math.PI * 42 * (1 - calPct)}
                      className="transition-all duration-700 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold tabular-nums leading-none">{Math.round(periodTotals.calories)}</span>
                    <span className="text-xs text-muted-foreground mt-1">{caloriePeriod !== 'daily' ? 'cal/day' : 'eaten'}</span>
                    <div className="w-8 h-px bg-border my-1.5" />
                    <span className="text-sm font-semibold tabular-nums text-primary leading-none">{Math.round(calRemaining)}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">remaining of {calGoalTarget}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Macro Circles */}
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-5">
          <MacroCircles
            carbs={{ current: Math.round(periodTotals.carbs), goal: macroGoals.carbs }}
            fat={{ current: Math.round(periodTotals.fats), goal: macroGoals.fat }}
            protein={{ current: Math.round(periodTotals.protein), goal: macroGoals.protein }}
            onEditGoals={() => setMacroGoalModalOpen(true)}
          />
        </CardContent>
      </Card>

      {/* Food entries */}
      <div className="space-y-3">
        {periodFoodEntries.length === 0 ? (
          <EmptyStateCard
            onClick={handleAddFood}
            title="Add your first food entry"
            description="Tap to log what you ate"
          />
        ) : caloriePeriod === 'daily' ? (
          /* Daily: grouped by meal type (MFP style) */
          <>
            {mealGroups.map((group) => (
              <MealSection
                key={group.meal}
                meal={group.meal}
                entries={group.entries}
                totalCal={group.totalCal}
                onEdit={handleEditFood}
                onDelete={handleDeleteFood}
                onAdd={handleAddFood}
              />
            ))}
            {mealGroups.length === 0 && (
              <AddAnotherCard onClick={handleAddFood} label="Add food entry" />
            )}
          </>
        ) : (
          /* Weekly/Monthly/Yearly: collapsible time-bucket groups */
          <>
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
            <AddAnotherCard onClick={handleAddFood} label="Add food entry" />
          </>
        )}
      </div>

      {/* Sleep Hours Card */}
      <Card className="p-4 sm:p-5 rounded-2xl">
        <h3 className="text-lg font-semibold mb-3">Hours Slept</h3>

        <PeriodSelector
          options={(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
            const sleep = sleepData[period];
            return { value: period, label: period, summary: sleep.hours > 0 ? `${sleep.hours.toFixed(1)}h` : '—' };
          })}
          selected={sleepPeriod}
          onChange={setSleepPeriod}
        />

        <div className="mb-4">
          <p className="text-2xl font-bold tabular-nums">
            {sleepPeriod === 'daily'
              ? (selectedSleep.count > 0 ? `${selectedSleep.hours.toFixed(1)}h` : 'Not logged')
              : selectedSleep.count > 0
                ? `${selectedSleep.hours.toFixed(1)}h avg`
                : 'No data'}
          </p>
          {sleepPeriod !== 'daily' && selectedSleep.count > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {selectedSleep.count} {selectedSleep.count === 1 ? 'day' : 'days'} logged
            </p>
          )}
        </div>

        {recentCheckIns.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-sm font-medium text-muted-foreground">Sleep log</h4>
            {recentCheckIns.map((c) => {
              const dateStr = toLocalDateString(new Date(c.date));
              return (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-xl"
                >
                  <div>
                    <p className="font-medium text-sm">{format(new Date(c.date), 'EEE, MMM d, yyyy')}</p>
                    <p className="text-xs text-muted-foreground">{c.sleepHours ?? 0}h slept</p>
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
    </div>
  );
}
