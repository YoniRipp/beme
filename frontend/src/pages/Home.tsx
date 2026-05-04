import { useMemo, useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import { useProfile } from '@/hooks/useProfile';
import { useWater } from '@/hooks/useWater';
import { useWeight } from '@/hooks/useWeight';
import { useApp } from '@/context/AppContext';
import { MacroGoalModal } from '@/components/home/MacroGoalModal';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { GoalModal } from '@/components/goals/GoalModal';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { VoiceMicHero } from '@/components/voice/VoiceMicHero';
import { WaterTracker } from '@/components/home/WaterTracker';
import { WeightProgress } from '@/components/home/WeightProgress';
import { WeightLogModal } from '@/components/home/WeightLogModal';
import { CycleTracker } from '@/components/home/CycleTracker';
import { StreakCard } from '@/components/home/StreakCard';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { isOnboardingCompleted } from '@/lib/onboarding';
import { Goal } from '@/types/goals';
import { FoodEntry } from '@/types/energy';
import { Workout } from '@/types/workout';
import { Apple, ChevronRight, Droplets, Dumbbell, Minus, Moon, Pencil, Plus, Scale, UtensilsCrossed, User } from 'lucide-react';
import { isSameDay, format } from 'date-fns';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  PulseCard,
  PulseHeader,
  PulsePage,
  PulseQuickTile,
  PulseRing,
  PulseSectionHeader,
} from '@/components/pulse/PulseUI';

export function Home() {
  // Hooks
  const navigate = useNavigate();
  const { openVoiceAgent } = useOutletContext<{ openVoiceAgent?: () => void }>() ?? {};
  const { workouts, workoutsLoading, addWorkout } = useWorkouts();
  const { checkIns, foodEntries, addCheckIn, updateCheckIn, addFoodEntry, getCheckInByDate, energyLoading } = useEnergy();
  const { addGoal, updateGoal, goalsLoading } = useGoals();
  const { macroGoals, setMacroGoals, calorieGoal } = useMacroGoals();
  const { profile, profileLoading } = useProfile();
  const { glasses, mlTotal, addGlass, removeGlass, waterLoading } = useWater();
  const { weightEntries } = useWeight();
  const { user } = useApp();
  const firstName = user?.name?.split(' ')[0] ?? 'there';

  // State
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [macroGoalModalOpen, setMacroGoalModalOpen] = useState(false);
  const [showTour] = useState(() => !isOnboardingCompleted());

  // Derived data
  const todayCheckIn = useMemo(
    () => getCheckInByDate(new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [getCheckInByDate, checkIns]
  );

  const todaySummary = useMemo(() => {
    const now = new Date();
    const todayFoods = foodEntries.filter((f) => isSameDay(new Date(f.date), now));
    return {
      totalCal: todayFoods.reduce((s, f) => s + f.calories, 0),
      totalProtein: todayFoods.reduce((s, f) => s + f.protein, 0),
      totalCarbs: todayFoods.reduce((s, f) => s + f.carbs, 0),
      totalFats: todayFoods.reduce((s, f) => s + f.fats, 0),
      mealsCount: todayFoods.length,
    };
  }, [foodEntries]);

  const macroRows = [
    { label: 'Protein', current: Math.round(todaySummary.totalProtein), goal: macroGoals.protein, color: 'bg-info' },
    { label: 'Carbs',   current: Math.round(todaySummary.totalCarbs),   goal: macroGoals.carbs,   color: 'bg-gold' },
    { label: 'Fat',     current: Math.round(todaySummary.totalFats),    goal: macroGoals.fat,     color: 'bg-terracotta' },
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

  const calPct = calorieGoal > 0 ? Math.min(todaySummary.totalCal / calorieGoal, 1) : 0;
  const sleepHours = Number(todayCheckIn?.sleepHours ?? 0);
  const weightKg = profile?.currentWeight ? Number(profile.currentWeight).toFixed(1) : '--';
  const todayDate = format(new Date(), 'EEE · MMM d');
  const todaysWeight = useMemo(
    () => weightEntries.find((entry) => isSameDay(new Date(entry.date), new Date())),
    [weightEntries]
  );

  // Handlers
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

  const handleAddWater = async () => {
    try {
      await addGlass();
    } catch {
      toast.error('Could not log water');
    }
  };

  const handleRemoveWater = async () => {
    if (glasses <= 0) return;
    try {
      await removeGlass();
    } catch {
      toast.error('Could not update water');
    }
  };

  if (!profileLoading && !profile.setupCompleted) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

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

          {/* Today's fuel */}
          <PulseCard className="pulse-hero-glow relative overflow-hidden p-5" data-onboarding="dashboard">
            <div className="relative z-10 mb-4 flex items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="text-primary">Today's fuel</span>
              <div className="flex items-center gap-2">
                <span>{Math.round(todaySummary.totalCal)} / {calorieGoal} kcal</span>
                <button
                  type="button"
                  onClick={() => setMacroGoalModalOpen(true)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                  aria-label="Edit macro goals"
                  title="Edit macros"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-5">
              <PulseRing pct={calPct}>
                <span className="text-[34px] font-extrabold tabular-nums leading-none tracking-tight">
                  {Math.round(todaySummary.totalCal)}
                </span>
                <span className="mt-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  kcal in
                </span>
              </PulseRing>
              <div className="flex-1 space-y-3">
                {macroRows.map((row) => {
                  const pct = row.goal > 0 ? Math.min(row.current / row.goal, 1) : 0;
                  return (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => setMacroGoalModalOpen(true)}
                      className="block w-full rounded-xl p-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                      aria-label={`Edit ${row.label} goal`}
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground tabular-nums">{row.current}/{row.goal}g</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', row.color)} style={{ width: `${pct * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </PulseCard>

          {/* Voice */}
          <div data-onboarding="voice">
            <VoiceMicHero onOpenAgent={() => openVoiceAgent?.()} />
          </div>

          <StreakCard />

          {/* Quick log */}
          <PulseSectionHeader title="Quick log" eyebrow="Today" />
          <div className="grid grid-cols-2 gap-2.5">
            <PulseQuickTile icon={Apple} label="Log food" onClick={() => setFoodModalOpen(true)} />
            <PulseQuickTile icon={Dumbbell} label="Log workout" onClick={() => setWorkoutModalOpen(true)} />
            <WaterQuickTile
              glasses={glasses}
              mlTotal={mlTotal}
              goal={profile.waterGoalGlasses || 8}
              loading={waterLoading}
              onAdd={handleAddWater}
              onRemove={handleRemoveWater}
              onOpen={() => navigate('/water')}
            />
            {sleepHours > 0 ? (
              !todaysWeight && <PulseQuickTile icon={Scale} label="Log weight" pill={weightKg === '--' ? undefined : `${weightKg}kg`} onClick={() => setWeightModalOpen(true)} />
            ) : (
              <PulseQuickTile icon={Moon} label="Log sleep" onClick={() => setSleepModalOpen(true)} />
            )}
          </div>

          {/* Health trackers */}
          <div className="grid grid-cols-2 gap-4" data-onboarding="trackers">
            <WaterTracker />
            <WeightProgress />
          </div>

          {profile.cycleTrackingEnabled && <CycleTracker />}

          {/* Recent activity */}
          {recentActivity.length > 0 && (
            <PulseCard className="overflow-hidden p-5">
              <h3 className="mb-4 text-base font-bold tracking-tight">Recent activity</h3>
              <div className="space-y-1">
                {recentActivity.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-2.5">
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

      {/* Modals */}
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
      <WeightLogModal open={weightModalOpen} onOpenChange={setWeightModalOpen} />

      {showTour && <OnboardingTour />}
    </PulsePage>
  );
}

function WaterQuickTile({
  glasses,
  mlTotal,
  goal,
  loading,
  onAdd,
  onRemove,
  onOpen,
}: {
  glasses: number;
  mlTotal: number;
  goal: number;
  loading: boolean;
  onAdd: () => void;
  onRemove: () => void;
  onOpen: () => void;
}) {
  const pct = Math.min(glasses / goal, 1);

  return (
    <PulseCard className="flex h-[108px] flex-col justify-between p-3.5">
      <div className="flex items-center justify-between gap-2">
        <button type="button" onClick={onOpen} className="flex min-w-0 items-center gap-2 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/15 text-info">
            <Droplets className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold leading-none">Water</span>
            <span className="mt-1 block truncate text-[11px] font-medium text-muted-foreground">{mlTotal} ml</span>
          </span>
        </button>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onRemove}
            disabled={glasses <= 0 || loading}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground disabled:opacity-40"
            aria-label="Remove a glass"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={loading}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-info text-white disabled:opacity-60"
            aria-label="Add a glass"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-1 text-xs text-muted-foreground">
          <span className="text-xl font-extrabold leading-none text-foreground">{glasses}</span>
          <span>/ {goal} glasses</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-info transition-all" style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </PulseCard>
  );
}
