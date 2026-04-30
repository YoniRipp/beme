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
import { PulseCard, PulseHeader, PulsePage, PulseQuickTile, PulseRing, PulseSectionHeader, PulseStatCard } from '@/components/pulse/PulseUI';

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
    <PulsePage>
      <PulseHeader
        kicker={todayDate}
        title={<>Hey {firstName}</>}
        subtitle={progressMessage}
        action={
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className="mt-1 flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-card hover:border-primary/50 transition-colors press"
            aria-label="Profile"
          >
            <User className="w-5 h-5" />
          </button>
        }
      />

      <ContentWithLoading loading={workoutsLoading || energyLoading || goalsLoading} loadingText="Loading dashboard...">
      <div className="space-y-5">
        <PulseCard className="pulse-hero-glow relative overflow-hidden p-5" data-onboarding="dashboard">
            <div className="relative z-10 mb-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="text-primary">Today's fuel</span>
              <span>{Math.round(todaySummary.totalCal)} / {calGoalTarget} kcal</span>
            </div>
            <div className="relative z-10 flex items-center gap-5">
              <PulseRing pct={calPct}>
                <span className="text-[34px] font-extrabold tabular-nums leading-none tracking-tight">{Math.round(todaySummary.totalCal)}</span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">kcal in</span>
              </PulseRing>
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
        </PulseCard>

        <div className="grid grid-cols-3 gap-2.5">
          <PulseStatCard icon={Dumbbell} label="Workouts" value={workoutsThisWeek} sub="this week" onClick={() => navigate('/body')} />
          <PulseStatCard icon={Moon} label="Sleep" value={`${sleepHours}h`} sub="last night" color="text-info" onClick={() => setSleepModalOpen(true)} />
          <PulseStatCard icon={Scale} label="Weight" value={weightKg} sub="kg" color="text-terracotta" onClick={() => navigate('/settings')} />
        </div>

        <PulseSectionHeader title="Quick log" eyebrow="Tap to add" />
        <div className="grid grid-cols-2 gap-2.5">
          <PulseQuickTile icon={Apple} label="Log food" primary onClick={() => setFoodModalOpen(true)} />
          <PulseQuickTile icon={Dumbbell} label="Log workout" onClick={() => setWorkoutModalOpen(true)} />
          <PulseQuickTile icon={Droplets} label="Water" pill="Open" onClick={() => navigate('/water')} />
          <PulseQuickTile icon={Moon} label="Sleep" pill={`${sleepHours}h`} onClick={() => setSleepModalOpen(true)} />
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
          <PulseCard className="overflow-hidden p-5">
              <h3 className="mb-4 text-base font-bold tracking-tight">Recent activity</h3>
              <div className="space-y-1">
                {recentActivity.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    className="flex items-center gap-3 py-2.5"
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${item.type === 'food' ? 'bg-terracotta/15 text-terracotta' : 'bg-info/15 text-info'}`}>
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
          </PulseCard>
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
    </PulsePage>
  );
}
