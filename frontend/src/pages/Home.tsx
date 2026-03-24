import { useMemo, useState } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import { DashboardProgressCards } from '@/components/home/DashboardProgressCards';
import { MacroCircles } from '@/components/home/MacroCircles';
import { MacroGoalModal } from '@/components/home/MacroGoalModal';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { GoalModal } from '@/components/goals/GoalModal';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceMicHero } from '@/components/voice/VoiceMicHero';
import { WaterTracker } from '@/components/home/WaterTracker';
import { WeightProgress } from '@/components/home/WeightProgress';
import { CycleTracker } from '@/components/home/CycleTracker';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { isOnboardingCompleted } from '@/lib/onboarding';
import { useProfile } from '@/hooks/useProfile';
import { Goal } from '@/types/goals';
import { FoodEntry } from '@/types/energy';
import { Workout } from '@/types/workout';
import { StreakCard } from '@/components/home/StreakCard';
import { Dumbbell, UtensilsCrossed } from 'lucide-react';
import { isSameDay, format } from 'date-fns';
import { toast } from 'sonner';

export function Home() {
  const { workouts, workoutsLoading, addWorkout } = useWorkouts();
  const { checkIns, foodEntries, addCheckIn, updateCheckIn, addFoodEntry, getCheckInByDate, energyLoading } = useEnergy();
  const { addGoal, updateGoal, goalsLoading } = useGoals();
  const { macroGoals, setMacroGoals, calorieGoal } = useMacroGoals();
  const { profile, profileLoading } = useProfile();

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [macroGoalModalOpen, setMacroGoalModalOpen] = useState(false);
  const [showTour] = useState(() => !isOnboardingCompleted());

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

  const todaySummary = useMemo(() => {
    const now = new Date();
    const todayFoods = foodEntries.filter((f) => isSameDay(new Date(f.date), now));
    const totalCal = todayFoods.reduce((s, f) => s + f.calories, 0);
    const totalProtein = todayFoods.reduce((s, f) => s + f.protein, 0);
    const totalCarbs = todayFoods.reduce((s, f) => s + f.carbs, 0);
    const totalFats = todayFoods.reduce((s, f) => s + f.fats, 0);
    const mealsCount = todayFoods.length;
    return { totalCal, totalProtein, totalCarbs, totalFats, mealsCount };
  }, [foodEntries]);

  const calGoalTarget = calorieGoal;

  const progressMessage = useMemo(() => {
    if (todaySummary.mealsCount === 0) return 'Start tracking your progress';
    if (todaySummary.mealsCount >= 3) return 'Crushing it!';
    if (todaySummary.mealsCount >= 2) return 'Great progress!';
    return 'Keep going!';
  }, [todaySummary.mealsCount]);

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

  const calPct = calGoalTarget > 0 ? Math.min(todaySummary.totalCal / calGoalTarget, 1) : 0;

  // Onboarding flow: SetupWizard → OnboardingTour → Dashboard
  if (!profileLoading && !profile.setupCompleted) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

  return (
    <div className="max-w-lg md:max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Today</h1>

      <ContentWithLoading loading={workoutsLoading || energyLoading || goalsLoading} loadingText="Loading dashboard...">
      <div className="space-y-5">

        {/* Mobile: two stacked cards */}
        <div className="md:hidden space-y-4" data-onboarding="dashboard">
          <Card className="rounded-2xl overflow-hidden border border-border/30 shadow-sm">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-center mb-4 text-muted-foreground">{progressMessage}</p>
              <div className="flex flex-col items-center gap-1.5 mb-3">
                <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Calories</p>
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-48 h-48 -rotate-90">
                    <defs>
                      <linearGradient id="calRingGradMobile" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--sage-light))" />
                        <stop offset="100%" stopColor="hsl(var(--sage-dark))" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-mist" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#calRingGradMobile)" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - calPct)} className="transition-all duration-700 ease-out" style={{ filter: calPct >= 0.9 ? 'drop-shadow(0 0 6px hsl(var(--sage) / 0.4))' : undefined }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold tabular-nums leading-none tracking-tight animate-count-up">{Math.round(todaySummary.totalCal)}</span>
                    <span className="text-xs text-muted-foreground leading-none mt-1.5">of {calGoalTarget} kcal</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl overflow-hidden border border-border/30 shadow-sm">
            <CardContent className="p-5">
              <MacroCircles
                carbs={{ current: todaySummary.totalCarbs, goal: macroGoals.carbs }}
                fat={{ current: todaySummary.totalFats, goal: macroGoals.fat }}
                protein={{ current: todaySummary.totalProtein, goal: macroGoals.protein }}
                onEditGoals={() => setMacroGoalModalOpen(true)}
              />
            </CardContent>
          </Card>
        </div>

        {/* Desktop: all circles in one row */}
        <Card className="hidden md:block rounded-2xl overflow-hidden border border-border/30 shadow-sm">
          <CardContent className="p-5">
            <p className="text-sm font-semibold text-center mb-4 text-muted-foreground">{progressMessage}</p>
            <div className="flex items-center justify-center gap-8">
              <div className="flex flex-col items-center gap-1.5 shrink-0">
                <p className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">Calories</p>
                <div className="relative w-48 h-48">
                  <svg viewBox="0 0 100 100" className="w-48 h-48 -rotate-90">
                    <defs>
                      <linearGradient id="calRingGradDesktop" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="hsl(var(--sage-light))" />
                        <stop offset="100%" stopColor="hsl(var(--sage-dark))" />
                      </linearGradient>
                    </defs>
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-mist" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="url(#calRingGradDesktop)" strokeWidth="6" strokeLinecap="round" strokeDasharray={2 * Math.PI * 42} strokeDashoffset={2 * Math.PI * 42 * (1 - calPct)} className="transition-all duration-700 ease-out" style={{ filter: calPct >= 0.9 ? 'drop-shadow(0 0 6px hsl(var(--sage) / 0.4))' : undefined }} />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold tabular-nums leading-none tracking-tight animate-count-up">{Math.round(todaySummary.totalCal)}</span>
                    <span className="text-xs text-muted-foreground leading-none mt-1.5">of {calGoalTarget} kcal</span>
                  </div>
                </div>
              </div>
              <div className="flex-1">
                <MacroCircles
                  carbs={{ current: todaySummary.totalCarbs, goal: macroGoals.carbs }}
                  fat={{ current: todaySummary.totalFats, goal: macroGoals.fat }}
                  protein={{ current: todaySummary.totalProtein, goal: macroGoals.protein }}
                  onEditGoals={() => setMacroGoalModalOpen(true)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Input */}
        <div data-onboarding="voice">
          <VoiceMicHero />
        </div>

        {/* Goals Progress */}
        <Card className="rounded-2xl overflow-hidden border border-border/30 shadow-sm" data-onboarding="goals">
          <CardContent className="p-5">
            <SectionHeader title="Goals" subtitle="Your progress" />
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

        {/* Streaks */}
        <StreakCard />
        {/* Health Trackers */}
        <div className="grid grid-cols-2 gap-4" data-onboarding="trackers">
          <WaterTracker />
          <WeightProgress />
        </div>

        {/* Cycle Tracker (if enabled) */}
        {profile.cycleTrackingEnabled && <CycleTracker />}

        {/* Recent Activity */}
        {recentActivity.length > 0 && (
          <Card className="rounded-2xl overflow-hidden border border-border/30 shadow-sm">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-muted-foreground mb-3">Recent Activity</h3>
              <div className="space-y-1">
                {recentActivity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className={`p-1.5 rounded-lg ${item.type === 'food' ? 'bg-terracotta/10 text-terracotta' : 'bg-info/10 text-info'}`}>
                      {item.type === 'food'
                        ? <UtensilsCrossed className="w-3.5 h-3.5" />
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

      <MacroGoalModal
        open={macroGoalModalOpen}
        onOpenChange={setMacroGoalModalOpen}
        goals={macroGoals}
        onSave={setMacroGoals}
      />

      {/* Onboarding tour for first-time users */}
      {showTour && <OnboardingTour />}
    </div>
  );
}
