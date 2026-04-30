import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import { MacroGoalModal } from '@/components/home/MacroGoalModal';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { GoalModal } from '@/components/goals/GoalModal';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceMicHero } from '@/components/voice/VoiceMicHero';
import { WaterTracker } from '@/components/home/WaterTracker';
import { WeightProgress } from '@/components/home/WeightProgress';
import { CycleTracker } from '@/components/home/CycleTracker';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { isOnboardingCompleted } from '@/lib/onboarding';
import { useProfile } from '@/hooks/useProfile';
import { useApp } from '@/context/AppContext';
import { Goal } from '@/types/goals';
import { FoodEntry } from '@/types/energy';
import { Workout } from '@/types/workout';
import { StreakCard } from '@/components/home/StreakCard';
import { Apple, ChevronRight, Droplets, Dumbbell, Moon, Scale, UtensilsCrossed, User } from 'lucide-react';
import { isSameDay, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export function Home() {
  const navigate = useNavigate();
  const { workouts, workoutsLoading, addWorkout } = useWorkouts();
  const { checkIns, foodEntries, addCheckIn, updateCheckIn, addFoodEntry, getCheckInByDate, energyLoading } = useEnergy();
  const { addGoal, updateGoal, goalsLoading } = useGoals();
  const { macroGoals, setMacroGoals, calorieGoal } = useMacroGoals();
  const { profile, profileLoading } = useProfile();
  const { user } = useApp();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

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
  const macroRows = [
    { label: 'Protein', current: Math.round(todaySummary.totalProtein), goal: macroGoals.protein, color: 'bg-info' },
    { label: 'Carbs', current: Math.round(todaySummary.totalCarbs), goal: macroGoals.carbs, color: 'bg-gold' },
    { label: 'Fat', current: Math.round(todaySummary.totalFats), goal: macroGoals.fat, color: 'bg-terracotta' },
  ];

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
  const workoutsThisWeek = workouts.filter((w) => {
    const d = new Date(w.date);
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    start.setHours(0, 0, 0, 0);
    return d >= start && d <= now;
  }).length;
  const sleepHours = Number(todayCheckIn?.sleepHours ?? 0);
  const weightKg = profile?.currentWeight ? Number(profile.currentWeight).toFixed(1) : '--';

  // Onboarding flow: SetupWizard → OnboardingTour → Dashboard
  if (!profileLoading && !profile.setupCompleted) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

  const todayDate = format(new Date(), 'EEE · MMM d');

  return (
    <div className="max-w-lg md:max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{todayDate}</p>
          <h1 className="font-display text-[30px] md:text-[36px] font-semibold dark:font-bold tracking-tight leading-tight mt-1">
            Hi {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">{progressMessage}</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/settings')}
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-primary/10 hover:bg-primary/20 transition-colors press mt-1"
          aria-label="Profile"
        >
          <User className="w-5 h-5 text-primary" />
        </button>
      </div>

      <ContentWithLoading loading={workoutsLoading || energyLoading || goalsLoading} loadingText="Loading dashboard...">
      <div className="space-y-5">
        <Card className="overflow-hidden relative dark:bg-gradient-to-br dark:from-[#15181a] dark:to-[#1f2826]" data-onboarding="dashboard">
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground mb-4">
              <span className="text-primary">Today's fuel</span>
              <span>{Math.round(todaySummary.totalCal)} / {calGoalTarget} kcal</span>
            </div>
            <div className="flex items-center gap-5">
              <div className="relative w-[132px] h-[132px]">
                <svg viewBox="0 0 100 100" className="w-[132px] h-[132px] -rotate-90">
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="11" />
                  <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--primary))" strokeWidth="11" strokeLinecap="round" strokeDasharray={2 * Math.PI * 40} strokeDashoffset={2 * Math.PI * 40 * (1 - calPct)} className="transition-all duration-700 ease-out" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[34px] font-semibold tabular-nums leading-none">{Math.round(todaySummary.totalCal)}</span>
                  <span className="text-[10px] text-muted-foreground mt-1">kcal</span>
                </div>
              </div>
              <div className="flex-1 space-y-3">
                {macroRows.map((row) => {
                  const pct = row.goal > 0 ? Math.min(row.current / row.goal, 1) : 0;
                  return (
                    <div key={row.label}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground tabular-nums">{row.current}/{row.goal}g</span>
                      </div>
                      <div className="h-[5px] rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', row.color)} style={{ width: `${pct * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-3 gap-2.5">
          <button type="button" className="rounded-[18px] border border-border bg-card p-3 h-[100px] text-left press" onClick={() => navigate('/body')}>
            <Dumbbell className="w-4 h-4 text-primary mb-2" />
            <p className="font-display text-2xl leading-none">{workoutsThisWeek}</p>
            <p className="text-xs text-muted-foreground mt-1">this week</p>
          </button>
          <button type="button" className="rounded-[18px] border border-border bg-card p-3 h-[100px] text-left press" onClick={() => setSleepModalOpen(true)}>
            <Moon className="w-4 h-4 text-info mb-2" />
            <p className="font-display text-2xl leading-none">{sleepHours}h</p>
            <p className="text-xs text-muted-foreground mt-1">last night</p>
          </button>
          <button type="button" className="rounded-[18px] border border-border bg-card p-3 h-[100px] text-left press" onClick={() => navigate('/settings')}>
            <Scale className="w-4 h-4 text-terracotta mb-2" />
            <p className="font-display text-2xl leading-none">{weightKg}</p>
            <p className="text-xs text-muted-foreground mt-1">kg</p>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => setFoodModalOpen(true)} className="h-[78px] rounded-[18px] bg-primary text-primary-foreground px-4 flex items-center justify-between press">
            <span className="text-sm font-bold">Log food</span>
            <Apple className="w-[22px] h-[22px]" />
          </button>
          <button type="button" onClick={() => setWorkoutModalOpen(true)} className="h-[78px] rounded-[18px] border border-border bg-card px-4 flex items-center justify-between press">
            <span className="text-sm font-bold">Log workout</span>
            <Dumbbell className="w-[22px] h-[22px]" />
          </button>
          <button type="button" onClick={() => navigate('/energy')} className="h-[78px] rounded-[18px] border border-border bg-card px-4 flex items-center justify-between press">
            <span className="text-sm font-bold">Water</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted rounded-lg px-2 py-1"><Droplets className="w-3.5 h-3.5" />0/8</span>
          </button>
          <button type="button" onClick={() => setSleepModalOpen(true)} className="h-[78px] rounded-[18px] border border-border bg-card px-4 flex items-center justify-between press">
            <span className="text-sm font-bold">Sleep</span>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground bg-muted rounded-lg px-2 py-1"><Moon className="w-3.5 h-3.5" />{sleepHours}h</span>
          </button>
        </div>

        {/* Voice Input */}
        <div data-onboarding="voice">
          <VoiceMicHero />
        </div>

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
          <Card className="overflow-hidden">
            <CardContent className="p-6">
              <h3 className="font-display text-lg font-medium tracking-tight mb-4">Recent activity</h3>
              <div className="space-y-1">
                {recentActivity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'food' ? 'bg-terracotta/10 text-terracotta' : 'bg-info/10 text-info'}`}>
                      {item.type === 'food'
                        ? <UtensilsCrossed className="w-4 h-4" />
                        : <Dumbbell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.detail}</p>
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0 inline-flex items-center gap-1">
                      {isSameDay(item.date, new Date()) ? 'Today' : format(item.date, 'EEE, MMM d')}
                      <ChevronRight className="w-3 h-3" />
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
