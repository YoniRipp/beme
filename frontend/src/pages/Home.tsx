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
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-4 sm:p-5">
            <h3 className="text-sm font-medium text-muted-foreground mb-3">Today</h3>
            <div className="flex items-center gap-4 mb-3">
              <div>
                <p className="text-3xl font-bold tabular-nums">{todaySummary.totalCal}</p>
                <p className="text-xs text-muted-foreground">calories</p>
              </div>
              {todaySummary.sleepHours != null && (
                <div className="border-l pl-4">
                  <p className="text-lg font-semibold tabular-nums">{todaySummary.sleepHours}h</p>
                  <p className="text-xs text-muted-foreground">sleep</p>
                </div>
              )}
              {todaySummary.todayWorkouts.length > 0 && (
                <div className="border-l pl-4">
                  <p className="text-lg font-semibold tabular-nums">{todaySummary.todayWorkouts.length}</p>
                  <p className="text-xs text-muted-foreground">workout{todaySummary.todayWorkouts.length !== 1 ? 's' : ''}</p>
                </div>
              )}
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>P: {todaySummary.totalProtein.toFixed(0)}g</span>
              <span>C: {todaySummary.totalCarbs.toFixed(0)}g</span>
              <span>F: {todaySummary.totalFats.toFixed(0)}g</span>
              <span>{todaySummary.mealsCount} meal{todaySummary.mealsCount !== 1 ? 's' : ''}</span>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions — 2x2 grid */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Workout', icon: Dumbbell, color: 'text-blue-600 bg-blue-50', action: () => setWorkoutModalOpen(true) },
            { label: 'Food', icon: UtensilsCrossed, color: 'text-orange-600 bg-orange-50', action: () => setFoodModalOpen(true) },
            { label: 'Sleep', icon: Moon, color: 'text-indigo-600 bg-indigo-50', action: () => setSleepModalOpen(true) },
            { label: 'Goal', icon: Target, color: 'text-green-600 bg-green-50', action: () => { setEditingGoal(undefined); setGoalModalOpen(true); } },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                className="flex items-center gap-3 p-4 rounded-xl border bg-card hover:bg-muted/50 active:scale-[0.98] transition-all text-left"
                onClick={item.action}
              >
                <div className={`p-2 rounded-lg ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">+ {item.label}</span>
              </button>
            );
          })}
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
