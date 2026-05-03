import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, Tooltip,
} from 'recharts';
import { format, subDays, isSameDay, startOfDay } from 'date-fns';
import { toast } from 'sonner';
import {
  ArrowLeft, Droplets, Dumbbell, Flame, Moon, Plus,
  Target, UtensilsCrossed, Pencil, Trash2,
} from 'lucide-react';
import { PulseCard, PulsePage } from '@/components/pulse/PulseUI';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { FoodEntryModal } from '@/components/energy/FoodEntryModal';
import { DailyCheckInModal } from '@/components/energy/DailyCheckInModal';
import { GoalModal } from '@/components/goals/GoalModal';
import { cn } from '@/lib/utils';
import type { Workout, WorkoutType, Exercise } from '@/types/workout';
import type { FoodEntry, DailyCheckIn } from '@/types/energy';
import type { Goal, GoalType, GoalPeriod } from '@/types/goals';
import {
  useTrainerClients,
  useTrainerClientWorkouts,
  useTrainerClientFoodEntries,
  useTrainerClientCheckIns,
  useTrainerClientGoals,
  useTrainerClientWater,
  useAddClientWorkout, useUpdateClientWorkout, useRemoveClientWorkout,
  useAddClientFoodEntry, useUpdateClientFoodEntry, useRemoveClientFoodEntry,
  useAddClientCheckIn, useUpdateClientCheckIn,
  useAddClientGoal, useUpdateClientGoal, useRemoveClientGoal,
} from '@/hooks/useTrainer';

// ─── Types ──────────────────────────────────────────────────

type Tab = 'food' | 'workouts' | 'water' | 'checkins' | 'goals';

type DeleteTarget =
  | { kind: 'workout'; id: string; label: string }
  | { kind: 'food'; id: string; label: string }
  | { kind: 'goal'; id: string; label: string };

// ─── Helpers ────────────────────────────────────────────────

function last14Days() {
  return Array.from({ length: 14 }, (_, i) => startOfDay(subDays(new Date(), 13 - i)));
}
function last7Days() {
  return Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
}

function fmtDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return isSameDay(d, new Date()) ? 'Today' : format(d, 'MMM d');
  } catch { return dateStr; }
}

function mapToWorkout(item: Record<string, unknown>): Workout {
  return {
    id: item.id as string,
    date: new Date(item.date as string),
    title: (item.title as string) || '',
    type: (item.type as WorkoutType) || 'strength',
    durationMinutes: Number(item.durationMinutes) || 30,
    exercises: (item.exercises as Exercise[]) || [],
    notes: item.notes as string | undefined,
    completed: Boolean(item.completed),
  };
}

function mapToFoodEntry(item: Record<string, unknown>): FoodEntry {
  return {
    id: item.id as string,
    date: new Date(item.date as string),
    name: (item.name as string) || '',
    calories: Number(item.calories) || 0,
    protein: Number(item.protein) || 0,
    carbs: Number(item.carbs) || 0,
    fats: Number(item.fats) || 0,
    portionAmount: item.portionAmount != null ? Number(item.portionAmount) : undefined,
    portionUnit: item.portionUnit as string | undefined,
    startTime: (item.startTime as string) || '00:00',
    endTime: (item.endTime as string) || '00:00',
    mealType: item.mealType as FoodEntry['mealType'],
  };
}

function mapToCheckIn(item: Record<string, unknown>): DailyCheckIn {
  return {
    id: item.id as string,
    date: new Date(item.date as string),
    sleepHours: item.sleepHours != null ? Number(item.sleepHours) : undefined,
  };
}

function mapToGoal(item: Record<string, unknown>): Goal {
  return {
    id: item.id as string,
    type: (item.type as GoalType) || 'calories',
    target: Number(item.target) || 0,
    period: (item.period as GoalPeriod) || 'weekly',
    createdAt: new Date(item.createdAt as string),
  };
}

// ─── Chart components ────────────────────────────────────────

interface MiniChartProps {
  title: string;
  value: string;
  sub?: string;
  data: Record<string, unknown>[];
  dataKey: string;
  color: string;
  type?: 'area' | 'bar';
  unit?: string;
}

function MiniChart({ title, value, sub, data, dataKey, color, type = 'area', unit = '' }: MiniChartProps) {
  const hasData = data.some(d => (d[dataKey] as number) > 0);

  return (
    <PulseCard className="p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <p className="mt-1 text-xl font-extrabold tabular-nums leading-none">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
      <div className="mt-3 h-14">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <Bar dataKey={dataKey} fill={color} radius={[3, 3, 0, 0]} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                  formatter={(v: unknown) => [`${v}${unit}`, title]}
                  labelFormatter={() => ''}
                />
              </BarChart>
            ) : (
              <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="10%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#grad-${dataKey})`}
                  dot={false}
                  connectNulls
                />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 10, fontSize: 11 }}
                  formatter={(v: unknown) => [`${v}${unit}`, title]}
                  labelFormatter={() => ''}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center">
            <p className="text-[11px] text-muted-foreground">No data yet</p>
          </div>
        )}
      </div>
    </PulseCard>
  );
}

// ─── Tab bar ─────────────────────────────────────────────────

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: 'food',     label: 'Food',      icon: UtensilsCrossed },
  { id: 'workouts', label: 'Workouts',  icon: Dumbbell },
  { id: 'water',    label: 'Water',     icon: Droplets },
  { id: 'checkins', label: 'Check-ins', icon: Moon },
  { id: 'goals',    label: 'Goals',     icon: Target },
];

// ─── Section header with add button ──────────────────────────

function SectionHeader({ label, onAdd, addLabel }: { label: string; onAdd?: () => void; addLabel?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      {onAdd && (
        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={onAdd}>
          <Plus className="h-3.5 w-3.5" />
          {addLabel ?? 'Add'}
        </Button>
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────

export default function TrainerClientView() {
  const { clientId = '' } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('food');

  // Modals state
  const [workoutModal, setWorkoutModal] = useState<{ open: boolean; item?: Workout }>({ open: false });
  const [foodModal, setFoodModal] = useState<{ open: boolean; item?: FoodEntry }>({ open: false });
  const [checkInModal, setCheckInModal] = useState<{ open: boolean; item?: DailyCheckIn }>({ open: false });
  const [goalModal, setGoalModal] = useState<{ open: boolean; item?: Goal }>({ open: false });
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Data
  const { data: clients = [] } = useTrainerClients();
  const client = clients.find((c) => c.clientId === clientId);
  const { data: workoutsData, isLoading: loadingWorkouts } = useTrainerClientWorkouts(clientId);
  const { data: foodData,     isLoading: loadingFood }     = useTrainerClientFoodEntries(clientId);
  const { data: checkInsData, isLoading: loadingCheckIns } = useTrainerClientCheckIns(clientId);
  const { data: goalsData,    isLoading: loadingGoals }    = useTrainerClientGoals(clientId);
  const { data: waterData,    isLoading: loadingWater }    = useTrainerClientWater(clientId);

  const workouts    = workoutsData?.data  ?? [];
  const foodEntries = foodData?.data      ?? [];
  const checkIns    = checkInsData?.data  ?? [];
  const goals       = goalsData?.data     ?? [];
  const waterEntries = waterData          ?? [];
  const isLoading   = loadingWorkouts || loadingFood || loadingCheckIns || loadingGoals || loadingWater;

  // Mutations
  const addWorkout      = useAddClientWorkout(clientId);
  const updateWorkout   = useUpdateClientWorkout(clientId);
  const removeWorkout   = useRemoveClientWorkout(clientId);
  const addFood         = useAddClientFoodEntry(clientId);
  const updateFood      = useUpdateClientFoodEntry(clientId);
  const removeFood      = useRemoveClientFoodEntry(clientId);
  const addCheckIn      = useAddClientCheckIn(clientId);
  const updateCheckIn   = useUpdateClientCheckIn(clientId);
  const addGoal         = useAddClientGoal(clientId);
  const updateGoal      = useUpdateClientGoal(clientId);
  const removeGoal      = useRemoveClientGoal(clientId);

  // ── Chart data ──────────────────────────────────────────────
  const calChartData = useMemo(() => last14Days().map(d => ({
    day: format(d, 'MM/dd'),
    cal: foodEntries
      .filter((f: Record<string,unknown>) => isSameDay(new Date(f.date as string), d))
      .reduce((sum: number, f: Record<string,unknown>) => sum + (Number(f.calories) || 0), 0),
  })), [foodEntries]);

  const waterChartData = useMemo(() => last7Days().map(d => ({
    day: format(d, 'EEE'),
    glasses: waterEntries.find(w => isSameDay(new Date(w.date), d))?.glasses ?? 0,
  })), [waterEntries]);

  const sleepChartData = useMemo(() => last14Days().map(d => ({
    day: format(d, 'MM/dd'),
    sleep: (() => {
      const ci = checkIns.find((c: Record<string,unknown>) => isSameDay(new Date(c.date as string), d));
      return ci && ci.sleepHours != null ? Number(ci.sleepHours) : null;
    })(),
  })), [checkIns]);

  const workoutChartData = useMemo(() => last14Days().map(d => ({
    day: format(d, 'MM/dd'),
    count: workouts.filter((w: Record<string,unknown>) => isSameDay(new Date(w.date as string), d)).length,
  })), [workouts]);

  // ── Summary stats ───────────────────────────────────────────
  const stats = useMemo(() => {
    const today = new Date();
    const avgCal = (() => {
      const days = new Set(foodEntries.map((f: Record<string,unknown>) => format(new Date(f.date as string), 'yyyy-MM-dd')));
      if (days.size === 0) return null;
      const total = foodEntries.reduce((s: number, f: Record<string,unknown>) => s + (Number(f.calories) || 0), 0);
      return Math.round(total / days.size);
    })();
    const avgSleep = (() => {
      const valid = checkIns.filter((c: Record<string,unknown>) => c.sleepHours != null);
      if (valid.length === 0) return null;
      return (valid.reduce((s: number, c: Record<string,unknown>) => s + (Number(c.sleepHours) || 0), 0) / valid.length).toFixed(1);
    })();
    const todayWater = waterEntries.find(w => isSameDay(new Date(w.date), today));
    return { avgCal, avgSleep, waterToday: todayWater?.glasses ?? 0 };
  }, [foodEntries, checkIns, waterEntries]);

  // ── Save handlers ────────────────────────────────────────────

  const handleSaveWorkout = (data: Omit<Workout, 'id'>) => {
    const body = {
      date: format(data.date, 'yyyy-MM-dd'),
      title: data.title,
      type: data.type,
      durationMinutes: data.durationMinutes,
      exercises: data.exercises,
      notes: data.notes ?? null,
      completed: data.completed,
    };
    const editing = workoutModal.item;
    if (editing) {
      updateWorkout.mutate({ id: editing.id, body }, {
        onSuccess: () => { toast.success('Workout updated'); setWorkoutModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update'),
      });
    } else {
      addWorkout.mutate(body, {
        onSuccess: () => { toast.success('Workout added'); setWorkoutModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add'),
      });
    }
  };

  const handleSaveFood = (data: Omit<FoodEntry, 'id'>) => {
    const body = {
      date: format(data.date, 'yyyy-MM-dd'),
      name: data.name,
      calories: data.calories,
      protein: data.protein,
      carbs: data.carbs,
      fats: data.fats,
      portionAmount: data.portionAmount ?? null,
      portionUnit: data.portionUnit ?? null,
      startTime: data.startTime || '00:00',
      endTime: data.endTime || '00:00',
      mealType: data.mealType ?? null,
    };
    const editing = foodModal.item;
    if (editing) {
      updateFood.mutate({ id: editing.id, body }, {
        onSuccess: () => { toast.success('Food entry updated'); setFoodModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update'),
      });
    } else {
      addFood.mutate(body, {
        onSuccess: () => { toast.success('Food entry added'); setFoodModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add'),
      });
    }
  };

  const handleSaveCheckIn = (data: Omit<DailyCheckIn, 'id'>) => {
    const body = {
      date: format(data.date, 'yyyy-MM-dd'),
      sleepHours: data.sleepHours ?? null,
    };
    const editing = checkInModal.item;
    if (editing) {
      updateCheckIn.mutate({ id: editing.id, body }, {
        onSuccess: () => { toast.success('Check-in updated'); setCheckInModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update'),
      });
    } else {
      addCheckIn.mutate(body, {
        onSuccess: () => { toast.success('Check-in added'); setCheckInModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add'),
      });
    }
  };

  const handleSaveGoal = (data: Omit<Goal, 'id' | 'createdAt'>) => {
    const body = { type: data.type, target: data.target, period: data.period };
    const editing = goalModal.item;
    if (editing) {
      updateGoal.mutate({ id: editing.id, body }, {
        onSuccess: () => { toast.success('Goal updated'); setGoalModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to update'),
      });
    } else {
      addGoal.mutate(body, {
        onSuccess: () => { toast.success('Goal added'); setGoalModal({ open: false }); },
        onError: (e) => toast.error(e instanceof Error ? e.message : 'Failed to add'),
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const onSuccess = () => {
      toast.success('Deleted');
      setDeleteTarget(null);
    };
    const onError = (e: Error) => toast.error(e.message || 'Failed to delete');
    if (deleteTarget.kind === 'workout') removeWorkout.mutate(deleteTarget.id, { onSuccess, onError });
    if (deleteTarget.kind === 'food')    removeFood.mutate(deleteTarget.id, { onSuccess, onError });
    if (deleteTarget.kind === 'goal')    removeGoal.mutate(deleteTarget.id, { onSuccess, onError });
  };

  // ── Tab counts ───────────────────────────────────────────────
  const tabCounts: Record<Tab, number> = {
    food: foodEntries.length,
    workouts: workouts.length,
    water: waterEntries.length,
    checkins: checkIns.length,
    goals: goals.length,
  };

  const joinedDate = client?.createdAt ? format(new Date(client.createdAt), 'MMM d, yyyy') : null;
  const initials = (client?.clientName ?? '?').trim().charAt(0).toUpperCase();

  return (
    <PulsePage>
      {/* Back */}
      <button
        type="button"
        onClick={() => navigate('/trainer')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors press mb-4 -ml-1"
      >
        <ArrowLeft className="h-4 w-4" />
        My clients
      </button>

      {/* Client hero card */}
      <PulseCard className="p-5 mb-4">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary/10 text-2xl font-extrabold text-primary">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-extrabold tracking-tight truncate">{client?.clientName ?? 'Client'}</p>
              <Badge variant="default" className="capitalize shrink-0">Active</Badge>
            </div>
            <p className="text-sm text-muted-foreground truncate">{client?.clientEmail}</p>
            {joinedDate && <p className="text-xs text-muted-foreground mt-0.5">Client since {joinedDate}</p>}
          </div>
        </div>

        {/* Inline stats */}
        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-border">
          {[
            { label: 'Workouts', value: workouts.length },
            { label: 'Avg cal', value: stats.avgCal != null ? stats.avgCal.toLocaleString() : '—' },
            { label: 'Avg sleep', value: stats.avgSleep != null ? `${stats.avgSleep}h` : '—' },
            { label: 'Water today', value: `${stats.waterToday}gl` },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-base font-extrabold tabular-nums leading-none">{s.value}</p>
              <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground leading-none">{s.label}</p>
            </div>
          ))}
        </div>
      </PulseCard>

      {/* Charts grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <MiniChart
          title="Calories / day"
          value={stats.avgCal != null ? `${stats.avgCal.toLocaleString()} avg` : '—'}
          sub="14-day trend"
          data={calChartData}
          dataKey="cal"
          color="hsl(var(--primary))"
          unit=" cal"
        />
        <MiniChart
          title="Water intake"
          value={`${stats.waterToday} gl`}
          sub="Past 7 days"
          data={waterChartData}
          dataKey="glasses"
          color="hsl(var(--info, 210 100% 56%))"
          type="bar"
          unit=" gl"
        />
        <MiniChart
          title="Sleep"
          value={stats.avgSleep != null ? `${stats.avgSleep}h avg` : '—'}
          sub="14-day trend"
          data={sleepChartData}
          dataKey="sleep"
          color="hsl(var(--gold, 45 90% 55%))"
          unit="h"
        />
        <MiniChart
          title="Workouts"
          value={`${workouts.length} total`}
          sub="14-day frequency"
          data={workoutChartData}
          dataKey="count"
          color="hsl(var(--success, 142 70% 45%))"
          type="bar"
        />
      </div>

      <ContentWithLoading loading={isLoading} loadingText="Loading client data...">
        {/* Tab bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-4 scrollbar-none">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const count = tabCounts[tab.id];
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors press',
                  active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
                {count > 0 && (
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums',
                    active ? 'bg-primary-foreground/20' : 'bg-muted-foreground/20')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Food tab ────────────────────────────────────────── */}
        {activeTab === 'food' && (
          <>
            <SectionHeader label="Food entries" onAdd={() => setFoodModal({ open: true })} addLabel="Add food" />
            {foodEntries.length === 0 ? (
              <EmptyState message="No food entries yet." onAdd={() => setFoodModal({ open: true })} />
            ) : (
              <PulseCard className="overflow-hidden p-0">
                <div className="divide-y divide-border">
                  {foodEntries.map((item: Record<string,unknown>, i: number) => (
                    <div key={(item.id as string) ?? i} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <Flame className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{String(item.name || 'Food')}</p>
                        <p className="text-xs text-muted-foreground">
                          {fmtDate(item.date as string)}
                          {item.mealType ? ` · ${item.mealType}` : ''}
                        </p>
                      </div>
                      <div className="text-right shrink-0 mr-2">
                        {item.calories != null && (
                          <p className="text-sm font-bold text-primary">{Number(item.calories).toLocaleString()} cal</p>
                        )}
                        {(item.protein != null || item.carbs != null || item.fats != null) && (
                          <p className="text-[11px] text-muted-foreground">
                            P{Number(item.protein)||0}·C{Number(item.carbs)||0}·F{Number(item.fats)||0}g
                          </p>
                        )}
                      </div>
                      <RowActions
                        onEdit={() => setFoodModal({ open: true, item: mapToFoodEntry(item) })}
                        onDelete={() => setDeleteTarget({ kind: 'food', id: item.id as string, label: String(item.name || 'Food entry') })}
                      />
                    </div>
                  ))}
                </div>
              </PulseCard>
            )}
          </>
        )}

        {/* ── Workouts tab ─────────────────────────────────────── */}
        {activeTab === 'workouts' && (
          <>
            <SectionHeader label="Workouts" onAdd={() => setWorkoutModal({ open: true })} addLabel="Add workout" />
            {workouts.length === 0 ? (
              <EmptyState message="No workouts yet." onAdd={() => setWorkoutModal({ open: true })} />
            ) : (
              <div className="space-y-2.5">
                {workouts.map((item: Record<string,unknown>, i: number) => {
                  const exCount = Array.isArray(item.exercises) ? item.exercises.length : 0;
                  return (
                    <PulseCard key={(item.id as string) ?? i} className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                          <Dumbbell className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold truncate">{String(item.title || 'Workout')}</p>
                            <RowActions
                              onEdit={() => setWorkoutModal({ open: true, item: mapToWorkout(item) })}
                              onDelete={() => setDeleteTarget({ kind: 'workout', id: item.id as string, label: String(item.title || 'Workout') })}
                            />
                          </div>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Chip>{fmtDate(item.date as string)}</Chip>
                            {item.type && <Chip className="capitalize">{String(item.type)}</Chip>}
                            {item.durationMinutes && <Chip>{Number(item.durationMinutes)} min</Chip>}
                            {exCount > 0 && <Chip>{exCount} exercise{exCount !== 1 ? 's' : ''}</Chip>}
                          </div>
                          {Array.isArray(item.exercises) && item.exercises.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {(item.exercises as Record<string,unknown>[]).slice(0, 4).map((ex, ei) => (
                                <p key={ei} className="text-xs text-muted-foreground">
                                  {String(ex.name)} · {String(ex.sets)}×{String(ex.reps)}
                                  {ex.weight ? ` @ ${ex.weight}kg` : ''}
                                </p>
                              ))}
                              {item.exercises.length > 4 && (
                                <p className="text-xs text-muted-foreground">+{item.exercises.length - 4} more</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </PulseCard>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Water tab (read-only) ────────────────────────────── */}
        {activeTab === 'water' && (
          <>
            <SectionHeader label="Water intake" />
            {waterEntries.length === 0 ? (
              <EmptyState message="No water entries yet." />
            ) : (
              <PulseCard className="overflow-hidden p-0">
                <div className="divide-y divide-border">
                  {waterEntries.map((entry, i) => (
                    <div key={entry.id ?? i} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-info/10">
                        <Droplets className="h-4 w-4 text-info" />
                      </div>
                      <p className="flex-1 font-medium">{fmtDate(entry.date)}</p>
                      <div className="text-right">
                        <p className="text-sm font-bold text-info">{entry.glasses} glasses</p>
                        {entry.mlTotal > 0 && <p className="text-xs text-muted-foreground">{entry.mlTotal} ml</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </PulseCard>
            )}
          </>
        )}

        {/* ── Check-ins tab ────────────────────────────────────── */}
        {activeTab === 'checkins' && (
          <>
            <SectionHeader label="Daily check-ins" onAdd={() => setCheckInModal({ open: true })} addLabel="Add check-in" />
            {checkIns.length === 0 ? (
              <EmptyState message="No check-ins yet." onAdd={() => setCheckInModal({ open: true })} />
            ) : (
              <PulseCard className="overflow-hidden p-0">
                <div className="divide-y divide-border">
                  {checkIns.map((item: Record<string,unknown>, i: number) => (
                    <div key={(item.id as string) ?? i} className="flex items-center gap-3 px-5 py-3.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold/10">
                        <Moon className="h-4 w-4 text-gold" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold">{fmtDate(item.date as string)}</p>
                        {item.sleepHours != null && (
                          <p className="text-xs text-muted-foreground">{Number(item.sleepHours)}h sleep</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setCheckInModal({ open: true, item: mapToCheckIn(item) })}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors press"
                        aria-label="Edit check-in"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </PulseCard>
            )}
          </>
        )}

        {/* ── Goals tab ────────────────────────────────────────── */}
        {activeTab === 'goals' && (
          <>
            <SectionHeader label="Goals" onAdd={() => setGoalModal({ open: true })} addLabel="Add goal" />
            {goals.length === 0 ? (
              <EmptyState message="No goals set yet." onAdd={() => setGoalModal({ open: true })} />
            ) : (
              <div className="space-y-2.5">
                {goals.map((item: Record<string,unknown>, i: number) => {
                  const Icon = item.type === 'calories' ? Flame : item.type === 'workouts' ? Dumbbell : Moon;
                  const color = item.type === 'calories' ? 'text-terracotta' : item.type === 'workouts' ? 'text-info' : 'text-gold';
                  return (
                    <PulseCard key={(item.id as string) ?? i} className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                          <Icon className={cn('h-5 w-5', color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold capitalize">{String(item.type)} goal</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {String(item.period)} · target: {String(item.target)}
                          </p>
                        </div>
                        <RowActions
                          onEdit={() => setGoalModal({ open: true, item: mapToGoal(item) })}
                          onDelete={() => setDeleteTarget({ kind: 'goal', id: item.id as string, label: `${item.type} goal` })}
                        />
                      </div>
                    </PulseCard>
                  );
                })}
              </div>
            )}
          </>
        )}
      </ContentWithLoading>

      {/* Modals */}
      <WorkoutModal
        open={workoutModal.open}
        onOpenChange={(open) => setWorkoutModal(s => ({ ...s, open }))}
        onSave={handleSaveWorkout}
        workout={workoutModal.item}
      />
      <FoodEntryModal
        open={foodModal.open}
        onOpenChange={(open) => setFoodModal(s => ({ ...s, open }))}
        onSave={handleSaveFood}
        entry={foodModal.item}
      />
      <DailyCheckInModal
        open={checkInModal.open}
        onOpenChange={(open) => setCheckInModal(s => ({ ...s, open }))}
        onSave={handleSaveCheckIn}
        checkIn={checkInModal.item}
      />
      <GoalModal
        open={goalModal.open}
        onOpenChange={(open) => setGoalModal(s => ({ ...s, open }))}
        onSave={handleSaveGoal}
        goal={goalModal.item}
      />
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.kind ?? 'item'}`}
        message={`Delete "${deleteTarget?.label ?? 'this item'}"? This cannot be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={handleConfirmDelete}
      />
    </PulsePage>
  );
}

// ─── Small helper components ─────────────────────────────────

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button
        type="button"
        onClick={onEdit}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors press"
        aria-label="Edit"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors press"
        aria-label="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function Chip({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn('rounded-lg bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground', className)}>
      {children}
    </span>
  );
}

function EmptyState({ message, onAdd }: { message: string; onAdd?: () => void }) {
  return (
    <PulseCard className="py-12 flex flex-col items-center gap-3 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {onAdd && (
        <Button size="sm" variant="outline" onClick={onAdd} className="gap-1.5">
          <Plus className="h-3.5 w-3.5" />
          Add first entry
        </Button>
      )}
    </PulseCard>
  );
}
