import { useMemo, useState } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { DashboardProgressCards } from '@/components/home/DashboardProgressCards';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { GoalModal } from '@/components/goals/GoalModal';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceMicHero } from '@/components/voice/VoiceMicHero';
import { getGreeting } from '@/lib/utils';
import { Goal } from '@/types/goals';
import { FoodEntry } from '@/types/energy';
import { Workout } from '@/types/workout';
import { Dumbbell, UtensilsCrossed, Moon, Target, Flame } from 'lucide-react';
import { isSameDay, format } from 'date-fns';
import { toast } from 'sonner';

export function Home() {
  const { workouts, workoutsLoading, addWorkout } = useWorkouts();
  const { checkIns, foodEntries, addCheckIn, updateCheckIn, addFoodEntry, getCheckInByDate, energyLoading } = useEnergy();
  const { addGoal, updateGoal, goalsLoading } = useGoals();

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [foodModalOpen, setFoodModalOpen] = useState(false);

  const handleGoalSave = (goal: Omit<Goal, 'id' | 'createdAt'>) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, goal);
      toast.success('Goal updated');
    } else {
      addGoal(goal);
      toast.success('Goal added');
    }
    setEditingGoal(undefined);
  };

  const todayCheckIn = useMemo(
    () => getCheckInByDate(new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getCheckInByDate, checkIns]
  );

  const handleSleepSave = (hours: number) => {
    if (todayCheckIn) {
      updateCheckIn(todayCheckIn.id, { sleepHours: hours });
      toast.success('Sleep updated');
    } else {
      addCheckIn({ date: new Date(), sleepHours: hours });
      toast.success('Sleep logged');
    }
    setSleepModalOpen(false);
  };

  const handleWorkoutSave = (workout: Omit<Workout, 'id'>) => {
    addWorkout(workout);
    toast.success('Workout added');
  };

  const handleFoodSave = (entry: Omit<FoodEntry, 'id'>) => {
    addFoodEntry(entry);
    toast.success('Food entry added');
  };

  // Today's summary data
  const todaySummary = useMemo(() => {
    const now = new Date();
    const todayFoods = foodEntries.filter((f) => isSameDay(new Date(f.date), now));
    const totalCal = todayFoods.reduce((s, f) => s + f.calories, 0);
    const totalProtein = todayFoods.reduce((s, f) => s + f.protein, 0);
    const totalCarbs = todayFoods.reduce((s, f) => s + f.carbs, 0);
    const totalFats = todayFoods.reduce((s, f) => s + f.fats, 0);
    const mealsCount = todayFoods.length;
    const todayWorkouts = workouts.filter((w) => isSameDay(new Date(w.date), now));
    const sleepHours = todayCheckIn?.sleepHours;
    return { totalCal, totalProtein, totalCarbs, totalFats, mealsCount, todayWorkouts, sleepHours };
  }, [foodEntries, workouts, todayCheckIn]);

  // Recent activity: last 5 food + workout entries combined
  const recentActivity = useMemo(() => {
    const foodItems = foodEntries.slice(0, 10).map((f) => ({
      id: f.id,
      type: 'food' as const,
      name: f.name,
      detail: `${f.calories} cal`,
      date: new Date(f.date),
    }));
    const workoutItems = workouts.slice(0, 10).map((w) => ({
      id: w.id,
      type: 'workout' as const,
      name: w.title,
      detail: `${w.exercises.length} exercise${w.exercises.length !== 1 ? 's' : ''}`,
      date: new Date(w.date),
    }));
    return [...foodItems, ...workoutItems]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5);
  }, [foodEntries, workouts]);

  const greeting = getGreeting();

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* Hero: greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
      </div>

      {/* Voice hero — primary input */}
      <VoiceMicHero />

      <ContentWithLoading loading={workoutsLoading || energyLoading || goalsLoading} loadingText="Loading dashboard...">
      <div className="space-y-5">
        {/* Today's Summary */}
        <Card className="rounded-2xl overflow-hidden bg-gradient-to-br from-card to-muted/20">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground tracking-wide uppercase">Today</h3>
              <span className="text-xs text-muted-foreground">{format(new Date(), 'EEE, MMM d')}</span>
            </div>
            <div className="flex items-center gap-5">
              {/* Calorie ring */}
              <div className="relative w-20 h-20 shrink-0">
                <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="text-muted/30"
                  />
                  <circle
                    cx="18" cy="18" r="15.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeDasharray={`${Math.min((todaySummary.totalCal / 2000) * 97.4, 97.4)} 97.4`}
                    strokeLinecap="round"
                    className="text-orange-500"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-bold tabular-nums leading-none">{todaySummary.totalCal}</span>
                  <span className="text-[10px] text-muted-foreground leading-none mt-0.5">kcal</span>
                </div>
              </div>
              {/* Stats */}
              <div className="flex-1 space-y-2">
                {todaySummary.sleepHours != null && (
                  <div className="flex items-center gap-2">
                    <Moon className="w-3.5 h-3.5 text-indigo-500" />
                    <span className="text-sm font-medium tabular-nums">{todaySummary.sleepHours}h</span>
                    <span className="text-xs text-muted-foreground">sleep</span>
                  </div>
                )}
                {todaySummary.todayWorkouts.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-sm font-medium tabular-nums">{todaySummary.todayWorkouts.length}</span>
                    <span className="text-xs text-muted-foreground">workout{todaySummary.todayWorkouts.length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <UtensilsCrossed className="w-3.5 h-3.5 text-orange-500" />
                  <span className="text-sm font-medium tabular-nums">{todaySummary.mealsCount}</span>
                  <span className="text-xs text-muted-foreground">meal{todaySummary.mealsCount !== 1 ? 's' : ''}</span>
                </div>
              </div>
            </div>
            {/* Macro pills */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-border/50">
              <div className="flex-1 rounded-lg bg-blue-50 px-3 py-1.5 text-center">
                <p className="text-xs text-blue-600 font-medium">{todaySummary.totalProtein.toFixed(0)}g</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Protein</p>
              </div>
              <div className="flex-1 rounded-lg bg-amber-50 px-3 py-1.5 text-center">
                <p className="text-xs text-amber-600 font-medium">{todaySummary.totalCarbs.toFixed(0)}g</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Carbs</p>
              </div>
              <div className="flex-1 rounded-lg bg-rose-50 px-3 py-1.5 text-center">
                <p className="text-xs text-rose-600 font-medium">{todaySummary.totalFats.toFixed(0)}g</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Fats</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Quick Add</h3>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Workout', icon: Dumbbell, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', action: () => setWorkoutModalOpen(true) },
              { label: 'Food', icon: UtensilsCrossed, color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', action: () => setFoodModalOpen(true) },
              { label: 'Sleep', icon: Moon, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', action: () => setSleepModalOpen(true) },
              { label: 'Goal', icon: Target, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', action: () => { setEditingGoal(undefined); setGoalModalOpen(true); } },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  type="button"
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-xl border ${item.border} ${item.bg} hover:opacity-80 active:scale-[0.97] transition-all`}
                  onClick={item.action}
                >
                  <Icon className={`w-5 h-5 ${item.color}`} />
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Goals Progress */}
        <Card className="rounded-2xl overflow-hidden bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="Goals" subtitle="Today's progress" />
            <DashboardProgressCards
              onAddGoal={() => {
                setEditingGoal(undefined);
                setGoalModalOpen(true);
              }}
              onAddWorkout={() => setWorkoutModalOpen(true)}
              onAddFood={() => setFoodModalOpen(true)}
              onAddSleep={() => setSleepModalOpen(true)}
            />
          </CardContent>
        </Card>

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card className="rounded-2xl overflow-hidden">
            <CardContent className="p-4 sm:p-5">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">Recent Activity</h3>
              <div className="space-y-2">
                {recentActivity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 py-2"
                  >
                    <div className={`p-1.5 rounded-lg ${item.type === 'food' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                      {item.type === 'food'
                        ? <Flame className="w-3.5 h-3.5" />
                        : <Dumbbell className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {isSameDay(item.date, new Date()) ? 'Today' : format(item.date, 'EEE, MMM d')}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      </ContentWithLoading>

      <GoalModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        onSave={handleGoalSave}
        goal={editingGoal}
      />

      <WorkoutModal
        open={workoutModalOpen}
        onOpenChange={setWorkoutModalOpen}
        onSave={handleWorkoutSave}
      />

      <FoodEntryModal
        open={foodModalOpen}
        onOpenChange={setFoodModalOpen}
        onSave={handleFoodSave}
      />

      <SleepEditModal
        open={sleepModalOpen}
        onOpenChange={setSleepModalOpen}
        onSave={handleSleepSave}
        currentHours={todayCheckIn?.sleepHours}
      />
    </div>
  );
}
