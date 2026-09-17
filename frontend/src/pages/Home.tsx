import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { useDailyTargets } from '@/hooks/useDailyTargets';
import { useProfile } from '@/hooks/useProfile';
import { useWeight } from '@/hooks/useWeight';
import { useApp } from '@/context/AppContext';
import { DailyTargetsModal } from '@/components/home/DailyTargetsModal';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { GoalModal } from '@/components/goals/GoalModal';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { Skeleton } from '@/components/shared/Skeleton';
import { WaterTracker } from '@/components/home/WaterTracker';
import { WeightProgress } from '@/components/home/WeightProgress';
import { WeightLogModal } from '@/components/home/WeightLogModal';
import { CycleTracker } from '@/components/home/CycleTracker';
import { StreakCard } from '@/components/home/StreakCard';
import { SetupWizard } from '@/components/onboarding/SetupWizard';
import { Goal } from '@/types/goals';
import { FoodEntry } from '@/types/energy';
import { Workout } from '@/types/workout';
import { Apple, ChevronRight, Dumbbell, Moon, Pencil, Scale, UtensilsCrossed, User } from 'lucide-react';
import { buildRecentActivity, firstNameOf, homeProgressMessage, isOnLocalDay, targetFraction } from '@trackvibe/shared/domain';
import { isSameDay, format } from 'date-fns';
import { toast } from '@/components/shared/ToastProvider';
import { cn } from '@/lib/utils';
import { Page, PageHeader, SectionHeader } from '@/components/ui/page';
import { ProgressRing } from '@/components/ui/progress-ring';
import { QuickTile } from '@/components/ui/quick-tile';
import { Card } from '@/components/ui/card';

export function Home() {
  // Hooks
  const navigate = useNavigate();
  const { workouts, workoutsLoading, addWorkout } = useWorkouts();
  const { checkIns, foodEntries, addCheckIn, updateCheckIn, addFoodEntry, getCheckInByDate, energyLoading } = useEnergy();
  const { addGoal, updateGoal } = useGoals();
  const { targets, saveDailyTargets } = useDailyTargets();
  const { profile, profileLoading } = useProfile();
  const { weightEntries } = useWeight();
  const { user } = useApp();
  // Shared with the Expo Home so the two clients greet the same account the same way.
  const firstName = firstNameOf(user?.name);

  // State
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [foodModalOpen, setFoodModalOpen] = useState(false);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [targetsModalOpen, setTargetsModalOpen] = useState(false);

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
    { label: 'Protein', current: Math.round(todaySummary.totalProtein), goal: targets.protein, color: 'bg-info' },
    { label: 'Carbs',   current: Math.round(todaySummary.totalCarbs),   goal: targets.carbs,   color: 'bg-gold' },
    { label: 'Fat',     current: Math.round(todaySummary.totalFats),    goal: targets.fat,     color: 'bg-terracotta' },
  ];

  const progressMessage = homeProgressMessage(todaySummary.mealsCount);

  // The merge lives in @trackvibe/shared/domain now, shared with the Expo Home. It also
  // drops the `slice(0, 10)` prefix each source used to take: that assumed the array was
  // still in the API's newest-first order, which stops being true the moment a client
  // writes its own cache — see the module's docblock.
  const recentActivity = useMemo(
    () => buildRecentActivity(foodEntries, workouts),
    [foodEntries, workouts]
  );

  // `null` target is not a 0% ring: one says "nothing logged yet against your goal", the
  // other says "there is no goal". The card renders them differently.
  const calorieTarget = targets.calories;
  const calPct = targetFraction(todaySummary.totalCal, calorieTarget) ?? 0;
  const hasAnyTarget =
    calorieTarget != null || targets.protein != null || targets.carbs != null || targets.fat != null;
  const sleepHours = Number(todayCheckIn?.sleepHours ?? 0);
  const todayDate = format(new Date(), 'EEE · MMM d');
  const todaysWeight = useMemo(
    // Same UTC-midnight trap as `WeightLogModal`: this drives the "logged today" state on
    // the weight tile, which was wrong for every user west of UTC.
    () => weightEntries.find((entry) => isOnLocalDay(entry.date, new Date())),
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

  if (!profileLoading && !profile.id && !profile.setupCompleted) {
    return <SetupWizard onComplete={() => window.location.reload()} />;
  }

  return (
    <Page>
      <PageHeader
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

        <div className="space-y-5">

          {/* Today's fuel. Gated on food entries alone — it is the reason people open the
              app, so it must not wait on the workouts query behind it. */}
          <ContentWithLoading
            loading={energyLoading}
            skeleton={
              <Card className="p-5">
                <Skeleton variant="text" width="55%" height="0.75rem" />
                <div className="mt-4 flex items-center gap-5">
                  <Skeleton variant="circular" width={132} height={132} />
                  <div className="flex-1 space-y-3">
                    <Skeleton variant="text" lines={3} height="h-6" />
                  </div>
                </div>
              </Card>
            }
          >
          <Card className="relative overflow-hidden p-5" data-onboarding="dashboard">
            <div className="relative z-10 mb-4 flex items-center justify-between text-eyebrow font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <span className="text-primary">Today's fuel</span>
              <div className="flex items-center gap-2">
                <span className="tabular-nums">
                  {Math.round(todaySummary.totalCal)}{calorieTarget != null ? ` / ${calorieTarget}` : ''} kcal
                </span>
                {/* One control, two presentations: a pencil once targets exist, an
                    invitation while they don't. An unset target is shown as unset — never
                    filled in with a plausible number the user never chose. */}
                <button
                  type="button"
                  onClick={() => setTargetsModalOpen(true)}
                  className={cn(
                    'flex h-11 items-center justify-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
                    hasAnyTarget ? 'w-11' : 'px-3'
                  )}
                  aria-label="Edit daily targets"
                  title="Edit daily targets"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {!hasAnyTarget && <span className="text-eyebrow font-bold">Set targets</span>}
                </button>
              </div>
            </div>
            <div className="relative z-10 flex items-center gap-5">
              <ProgressRing
                pct={calPct}
                label="Calories today"
                valueText={
                  calorieTarget != null
                    ? `${Math.round(todaySummary.totalCal)} of ${calorieTarget} kcal`
                    : `${Math.round(todaySummary.totalCal)} kcal, no daily calorie target set`
                }
              >
                <span className="text-[34px] font-extrabold tabular-nums leading-none tracking-tight">
                  {Math.round(todaySummary.totalCal)}
                </span>
                <span className="mt-1 text-caption font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  kcal in
                </span>
              </ProgressRing>
              <div className="flex-1 space-y-3">
                {macroRows.map((row) => {
                  const pct = targetFraction(row.current, row.goal) ?? 0;
                  return (
                    <button
                      key={row.label}
                      type="button"
                      onClick={() => setTargetsModalOpen(true)}
                      className="block w-full rounded-xl p-1.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                      aria-label={row.goal != null ? `Edit ${row.label} target` : `Set ${row.label} target`}
                    >
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">{row.label}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {row.goal != null ? `${row.current}/${row.goal}g` : `${row.current}g`}
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn('h-full rounded-full', row.color)} style={{ width: `${pct * 100}%` }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </Card>
          </ContentWithLoading>

          <StreakCard />

          {/* Quick log */}
          <SectionHeader title="Quick log" eyebrow="Today" />
          {/* 2x2 so no tile is ever orphaned on a half row, and every action stays
              reachable after it has been logged (the pill shows today's value). */}
          <div className="grid grid-cols-2 gap-2.5">
            <QuickTile icon={Apple} label="Log food" onClick={() => setFoodModalOpen(true)} />
            <QuickTile icon={Dumbbell} label="Log workout" onClick={() => setWorkoutModalOpen(true)} />
            <QuickTile
              icon={Moon}
              label="Log sleep"
              pill={sleepHours > 0 ? `${sleepHours}h` : undefined}
              onClick={() => setSleepModalOpen(true)}
            />
            <QuickTile
              icon={Scale}
              label="Log weight"
              pill={todaysWeight ? `${todaysWeight.weight}kg` : undefined}
              onClick={() => setWeightModalOpen(true)}
            />
          </div>

          {/* Health trackers */}
          <div className="grid grid-cols-2 gap-4">
            <WaterTracker />
            <WeightProgress />
          </div>

          {profile.cycleTrackingEnabled && <CycleTracker />}

          {/* Recent activity — the one section that genuinely needs both queries. */}
          {(workoutsLoading || energyLoading) ? (
            <Card className="p-5 space-y-3">
              <Skeleton variant="text" width="35%" height="1rem" />
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} height="2.5rem" className="rounded-xl" />
              ))}
            </Card>
          ) : recentActivity.length > 0 && (
            <Card className="overflow-hidden p-5">
              <h3 className="mb-4 text-base font-bold tracking-tight">Recent activity</h3>
              <div className="space-y-1">
                {recentActivity.map((item) => (
                  <button
                    key={`${item.type}-${item.id}`}
                    type="button"
                    onClick={() => navigate(item.type === 'food' ? '/energy' : '/body')}
                    className="flex w-full items-center gap-3 rounded-xl py-2.5 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70"
                    aria-label={`${item.name}, ${item.detail}. Open ${item.type === 'food' ? 'food log' : 'workouts'}`}
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
                  </button>
                ))}
              </div>
            </Card>
          )}

        </div>

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
      <DailyTargetsModal
        open={targetsModalOpen}
        onOpenChange={setTargetsModalOpen}
        targets={targets}
        onSave={saveDailyTargets}
      />
      <WeightLogModal open={weightModalOpen} onOpenChange={setWeightModalOpen} />
    </Page>
  );
}
