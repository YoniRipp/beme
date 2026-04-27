import { useMemo, useState } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { useMacroGoals } from '@/hooks/useMacroGoals';
import { useWeight } from '@/hooks/useWeight';
import { useWater } from '@/hooks/useWater';
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
import { Goal } from '@/types/goals';
import { FoodEntry } from '@/types/energy';
import { Workout } from '@/types/workout';
import { StreakCard } from '@/components/home/StreakCard';
import { DashboardProgressCards } from '@/components/home/DashboardProgressCards';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Dumbbell, Moon, Scale, Apple, ChevronRight, Droplets } from 'lucide-react';
import { isSameDay, format, isWithinInterval } from 'date-fns';
import { getPeriodRange } from '@/lib/dateRanges';
import { toast } from 'sonner';

/* ── Circular progress ring ───────────────────────────────── */
function Ring({
  pct,
  size = 120,
  stroke = 10,
  color = 'hsl(var(--primary))',
  track = 'hsl(var(--muted))',
  children,
}: {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={track} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.2,.8,.2,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

/* ── Mini stat card ───────────────────────────────────────── */
function StatCard({
  icon,
  label,
  value,
  sub,
  tint,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  tint: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex-1 flex flex-col gap-1.5 p-3 rounded-2xl bg-card border border-border/50 text-left active:scale-95 transition-transform tap-target"
    >
      <div className="flex items-center justify-between">
        <span style={{ color: tint }}>{icon}</span>
        <ChevronRight className="w-3 h-3 text-muted-foreground/50" />
      </div>
      <div className="text-xl font-bold tabular-nums leading-tight">{value}</div>
      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider leading-tight">{sub}</div>
    </button>
  );
}

/* ── Quick log button ─────────────────────────────────────── */
function QuickButton({
  label,
  icon: Icon,
  primary,
  pill,
  onClick,
}: {
  label: string;
  icon: typeof Apple;
  primary?: boolean;
  pill?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col justify-between p-3.5 rounded-2xl tap-target active:scale-95 transition-transform ${
        primary
          ? 'bg-primary text-primary-foreground shadow-md'
          : 'bg-card border border-border/50 text-foreground'
      }`}
      style={{ height: 80 }}
    >
      <div className="flex items-center justify-between w-full">
        <Icon
          className="w-5 h-5"
          style={{ opacity: primary ? 1 : 0.8 }}
          strokeWidth={2}
        />
        {pill && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg ${
              primary ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}
          >
            {pill}
          </span>
        )}
      </div>
      <div className="text-sm font-bold">{label}</div>
    </button>
  );
}

export function Home() {
  const { workouts, workoutsLoading, addWorkout } = useWorkouts();
  const { checkIns, foodEntries, addCheckIn, updateCheckIn, addFoodEntry, getCheckInByDate, energyLoading } = useEnergy();
  const { addGoal, updateGoal, goalsLoading } = useGoals();
  const { macroGoals, setMacroGoals, calorieGoal } = useMacroGoals();
  const { profile, profileLoading } = useProfile();
  const { latestWeight } = useWeight();
  const { glasses } = useWater();

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
    return {
      totalCal: todayFoods.reduce((s, f) => s + f.calories, 0),
      totalProtein: todayFoods.reduce((s, f) => s + f.protein, 0),
      totalCarbs: todayFoods.reduce((s, f) => s + f.carbs, 0),
      totalFats: todayFoods.reduce((s, f) => s + f.fats, 0),
    };
  }, [foodEntries]);

  const workoutsThisWeek = useMemo(() => {
    const { start, end } = getPeriodRange('weekly', new Date());
    return workouts.filter((w) => isWithinInterval(new Date(w.date), { start, end })).length;
  }, [workouts]);

  const calPct = calorieGoal > 0 ? Math.min(todaySummary.totalCal / calorieGoal, 1) : 0;
  const sleepHours = todayCheckIn?.sleepHours;
  const weightKg = latestWeight?.weight;

  const today = new Date();
  const dateLabel = format(today, 'EEE · MMM d');
  const userName = profile?.setupCompleted ? (profile as { name?: string }).name ?? 'there' : 'there';

  if (!profileLoading && !profile.setupCompleted) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

  const todayDate = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <div className="max-w-lg mx-auto">
      <ContentWithLoading loading={workoutsLoading || energyLoading || goalsLoading} loadingText="Loading dashboard...">
        <div className="space-y-4 pb-6">

          {/* Header */}
          <div className="px-1 pt-1">
            <p className="text-[11px] font-bold tracking-[0.18em] text-muted-foreground uppercase">{dateLabel}</p>
            <h1 className="text-[28px] font-extrabold tracking-tight leading-tight mt-0.5">
              Hey {userName} 👋
            </h1>
          </div>

          {/* ── Hero Fuel Card ──────────────────────────────── */}
          <div data-onboarding="dashboard">
            <Card className="rounded-[28px] border border-border/40 shadow-sm overflow-hidden">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold tracking-[0.18em] text-primary uppercase">Today's fuel</p>
                  <button
                    onClick={() => setMacroGoalModalOpen(true)}
                    className="text-[11px] font-bold text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    {todaySummary.totalCal} / {calorieGoal} kcal
                  </button>
                </div>

                <div className="flex items-center gap-5">
                  {/* Calorie ring */}
                  <Ring pct={calPct} size={132} stroke={11}>
                    <span className="text-[38px] font-extrabold tabular-nums leading-none tracking-tight">
                      {todaySummary.totalCal}
                    </span>
                    <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase mt-1">
                      kcal in
                    </span>
                  </Ring>

                  {/* Macro progress bars */}
                  <div className="flex-1 flex flex-col gap-3">
                    {[
                      { label: 'Protein', cur: todaySummary.totalProtein, goal: macroGoals.protein, color: 'hsl(var(--primary))' },
                      { label: 'Carbs', cur: todaySummary.totalCarbs, goal: macroGoals.carbs, color: 'hsl(var(--info))' },
                      { label: 'Fat', cur: todaySummary.totalFats, goal: macroGoals.fat, color: 'hsl(var(--gold))' },
                    ].map((m) => (
                      <div key={m.label}>
                        <div className="flex justify-between text-[11px] font-bold mb-1">
                          <span className="text-muted-foreground">{m.label}</span>
                          <span className="tabular-nums">
                            {m.cur}<span className="text-muted-foreground/60">/{m.goal}g</span>
                          </span>
                        </div>
                        <div className="h-[5px] rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${Math.min((m.cur / (m.goal || 1)) * 100, 100)}%`,
                              background: m.color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Stat mini-cards ─────────────────────────────── */}
          <div className="flex gap-2.5">
            <StatCard
              icon={<Dumbbell className="w-4 h-4" />}
              label="Workouts"
              value={String(workoutsThisWeek)}
              sub="this week"
              tint="hsl(var(--primary))"
              onClick={() => setWorkoutModalOpen(true)}
            />
            <StatCard
              icon={<Moon className="w-4 h-4" />}
              label="Sleep"
              value={sleepHours ? `${sleepHours.toFixed(1)}h` : '—'}
              sub="last night"
              tint="hsl(var(--info))"
              onClick={() => setSleepModalOpen(true)}
            />
            <StatCard
              icon={<Scale className="w-4 h-4" />}
              label="Weight"
              value={weightKg ? `${weightKg.toFixed(1)}` : '—'}
              sub="kg"
              tint="hsl(var(--terracotta))"
            />
          </div>

          {/* ── Quick log grid ──────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2 px-0.5">
              <h2 className="text-base font-bold">Quick log</h2>
              <span className="text-[11px] text-muted-foreground font-semibold">Tap to add</span>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <QuickButton label="Log food" icon={Apple} primary onClick={() => setFoodModalOpen(true)} />
              <QuickButton label="Log workout" icon={Dumbbell} onClick={() => setWorkoutModalOpen(true)} />
              <QuickButton
                label="Water"
                icon={Droplets}
                pill={`${glasses}/8`}
                onClick={() => {}}
              />
              <QuickButton
                label="Sleep"
                icon={Moon}
                pill={sleepHours ? `${sleepHours.toFixed(1)}h` : undefined}
                onClick={() => setSleepModalOpen(true)}
              />
            </div>
          </div>

          {/* ── Voice Input ─────────────────────────────────── */}
          <div data-onboarding="voice">
            <VoiceMicHero />
          </div>

          {/* ── Streak ──────────────────────────────────────── */}
          <StreakCard />

          {/* ── Goals progress ──────────────────────────────── */}
          <Card className="rounded-2xl border border-border/40 shadow-sm" data-onboarding="goals">
            <CardContent className="p-5">
              <SectionHeader title="Goals" subtitle="Your progress" />
              <DashboardProgressCards
                onAddGoal={() => { setEditingGoal(undefined); setGoalModalOpen(true); }}
                onAddWorkout={() => setWorkoutModalOpen(true)}
                onAddFood={() => setFoodModalOpen(true)}
                onAddSleep={() => setSleepModalOpen(true)}
              />
            </CardContent>
          </Card>

          {/* ── Health trackers ─────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4" data-onboarding="trackers">
            <WaterTracker />
            <WeightProgress />
          </div>

          {/* Cycle Tracker (if enabled) */}
          {profile.cycleTrackingEnabled && <CycleTracker />}
        </div>
      </ContentWithLoading>

      {/* ── Modals ──────────────────────────────────────────── */}
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

      {showTour && <OnboardingTour />}
    </div>
  );
}
