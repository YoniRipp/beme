import { useState, useMemo } from 'react';
import { useEnergy } from '@/hooks/useEnergy';
import { FoodEntry, type DailyCheckIn } from '@/types/energy';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Moon, Plus, Trash2, Pencil, UtensilsCrossed } from 'lucide-react';
import { isSameDay, isWithinInterval, format } from 'date-fns';
import { getPeriodRange, toLocalDateString } from '@/lib/dateRanges';

function formatMealTime(entry: FoodEntry): string | null {
  const start = entry.startTime;
  const end = entry.endTime;
  if (!start && !end) return null;
  if (start && end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const durMin = (eh * 60 + em) - (sh * 60 + sm);
    const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h` : `${durMin} min`;
    return `${start}–${end} (${durStr})`;
  }
  return start ?? end ?? null;
}

export function Energy() {
  const { checkIns, foodEntries, energyLoading, addCheckIn, updateCheckIn, deleteCheckIn, addFoodEntry, updateFoodEntry, deleteFoodEntry } = useEnergy();
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [editingCheckIn, setEditingCheckIn] = useState<DailyCheckIn | undefined>(undefined);
  const [deleteConfirmCheckInId, setDeleteConfirmCheckInId] = useState<string | null>(null);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [editingFoodEntry, setEditingFoodEntry] = useState<FoodEntry | undefined>(undefined);
  const [caloriePeriod, setCaloriePeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [sleepPeriod, setSleepPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const now = new Date();

  const periodFoodEntries = useMemo(() => {
    const range = getPeriodRange(caloriePeriod, now);
    const filtered = foodEntries.filter(f =>
      isWithinInterval(new Date(f.date), range)
    );

    // Sort: date desc, then entries with time first, then by startTime asc
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

  // Calculate totals for selected period
  const periodTotals = useMemo(() => {
    return periodFoodEntries.reduce(
      (acc, entry) => ({
        calories: acc.calories + entry.calories,
        protein: acc.protein + entry.protein,
        carbs: acc.carbs + entry.carbs,
        fats: acc.fats + entry.fats,
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );
  }, [periodFoodEntries]);

  // Calculate sleep averages for periods
  const sleepData = useMemo(() => {
    const ranges = {
      daily: getPeriodRange('daily', now),
      weekly: getPeriodRange('weekly', now),
      monthly: getPeriodRange('monthly', now),
      yearly: getPeriodRange('yearly', now),
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
  }, [checkIns, now]);

  const selectedSleep = sleepData[sleepPeriod];

  // Get today's check-in for sleep modal
  const todayCheckIn = useMemo(() => {
    return checkIns.find(c => isSameDay(new Date(c.date), now));
  }, [checkIns, now]);

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
        date: now,
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

  const handleEditFood = (entry: FoodEntry) => {
    setEditingFoodEntry(entry);
    setFoodModalOpen(true);
  };

  const handleDeleteFood = (id: string) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteFood = () => {
    if (deleteConfirmId) {
      deleteFoodEntry(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24">
      <ContentWithLoading loading={energyLoading} loadingText="Loading energy...">
      {/* Calories Balance Card */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Calorie Balance</h3>

        {/* Period selector — horizontally scrollable on mobile */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
            const range = getPeriodRange(period, now);
            const periodEntries = foodEntries.filter(f =>
              isWithinInterval(new Date(f.date), range)
            );
            const periodCal = periodEntries.reduce((sum, e) => sum + e.calories, 0);

            return (
              <button
                key={period}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition-all min-w-[80px] ${
                  caloriePeriod === period
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:bg-muted'
                }`}
                onClick={() => setCaloriePeriod(period)}
              >
                <p className="text-xs text-muted-foreground capitalize">{period}</p>
                <p className="text-sm font-semibold">{periodCal} cal</p>
              </button>
            );
          })}
        </div>
        
        <div className="mb-4">
          <p className="text-3xl font-bold mb-2">{periodTotals.calories} cal</p>
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <p className="text-sm text-muted-foreground">Protein</p>
              <p className="text-lg font-semibold">{periodTotals.protein.toFixed(1)}g</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Carbs</p>
              <p className="text-lg font-semibold">{periodTotals.carbs.toFixed(1)}g</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fats</p>
              <p className="text-lg font-semibold">{periodTotals.fats.toFixed(1)}g</p>
            </div>
          </div>
        </div>

        {/* Food entries list */}
        <div className="space-y-2">
          {periodFoodEntries.length === 0 ? (
            <Card 
              className="p-8 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center"
              onClick={handleAddFood}
            >
              <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
              <p className="text-lg font-medium mb-1">Add your first food entry</p>
              <p className="text-sm text-muted-foreground">Tap to log what you ate</p>
            </Card>
          ) : (
            <>
              {periodFoodEntries.map((entry) => {
                const mealTime = formatMealTime(entry);
                return (
                <div 
                  key={entry.id} 
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  role="button"
                  tabIndex={0}
                  aria-label={`Food entry: ${entry.name}, ${entry.calories} calories`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleEditFood(entry);
                    }
                  }}
                >
                  <div 
                    className="flex-1 cursor-pointer"
                    onClick={() => handleEditFood(entry)}
                  >
                    <p className="font-medium">
                      {entry.name}
                      {entry.portionAmount != null
                        ? ` • ${entry.portionAmount}${entry.portionUnit ? ` ${entry.portionUnit}` : ''}`
                        : ''}
                    </p>
                    {mealTime && (
                      <p className="text-sm text-muted-foreground">{mealTime}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      {entry.calories} cal • P: {entry.protein}g C: {entry.carbs}g F: {entry.fats}g
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteFood(entry.id);
                    }}
                    aria-label={`Delete food entry: ${entry.name}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </Button>
                </div>
              );
              })}
              <Card 
                className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50"
                onClick={handleAddFood}
              >
                <Plus className="w-8 h-8 mx-auto text-primary" />
                <p className="text-sm font-medium mt-2 text-muted-foreground">Add another food entry</p>
              </Card>
            </>
          )}
        </div>
      </Card>

      {/* Sleep Hours Card */}
      <Card className="p-4 sm:p-6">
        <h3 className="text-lg font-semibold mb-4">Hours Slept</h3>

        {/* Period selector — horizontally scrollable on mobile */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
          {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((period) => {
            const sleep = sleepData[period];
            return (
              <button
                key={period}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-left transition-all min-w-[80px] ${
                  sleepPeriod === period
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'border-border bg-card hover:bg-muted'
                }`}
                onClick={() => setSleepPeriod(period)}
              >
                <p className="text-xs text-muted-foreground capitalize">{period}</p>
                <p className="text-sm font-semibold">
                  {sleep.hours > 0 ? `${sleep.hours.toFixed(1)}h` : '—'}
                </p>
              </button>
            );
          })}
        </div>
        
        <div className="mb-4">
          <p className="text-3xl font-bold">
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
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div>
                    <p className="font-medium">{format(new Date(c.date), 'EEE, MMM d, yyyy')}</p>
                    <p className="text-sm text-muted-foreground">{c.sleepHours ?? 0}h slept</p>
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

        <Card 
          className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50"
          onClick={openSleepModalForToday}
        >
          <Moon className="w-8 h-8 mx-auto text-primary" />
          <p className="text-sm font-medium mt-2 text-muted-foreground">Log sleep</p>
        </Card>
      </Card>
      </ContentWithLoading>

      {/* Floating Add Food button — visible on mobile */}
      <button
        className="fixed bottom-20 right-20 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-lg hover:bg-primary/90 active:scale-95 transition-all sm:hidden"
        onClick={handleAddFood}
        aria-label="Add food entry"
      >
        <UtensilsCrossed className="w-4 h-4" />
        Log Food
      </button>

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
    </div>
  );
}
