import { useState, useMemo } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useGoals } from '@/hooks/useGoals';
import { Workout } from '@/types/workout';
import { WorkoutCard } from '@/components/body/WorkoutCard';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyStateCard } from '@/components/shared/EmptyStateCard';
import { AddAnotherCard } from '@/components/shared/AddAnotherCard';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { format, isToday, isYesterday, parseISO, isWithinInterval, startOfWeek, addDays } from 'date-fns';
import { getPeriodRange } from '@/lib/dateRanges';

function groupWorkoutsByDate(workouts: Workout[], ascending = false): { date: string; label: string; workouts: Workout[] }[] {
  const byDate = new Map<string, Workout[]>();
  for (const w of workouts) {
    const d = format(new Date(w.date), 'yyyy-MM-dd');
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(w);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) =>
    ascending ? a.localeCompare(b) : b.localeCompare(a)
  );
  const currentYear = new Date().getFullYear();
  return sortedDates.map((dateStr) => {
    const d = parseISO(dateStr);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else if (d.getFullYear() !== currentYear) label = format(d, 'EEEE, MMM d, yyyy');
    else label = format(d, 'EEEE, MMM d');
    return { date: dateStr, label, workouts: byDate.get(dateStr)! };
  });
}

export function Body() {
  const { workouts, workoutsLoading, addWorkout, updateWorkout, deleteWorkout, toggleWorkoutCompleted } = useWorkouts();
  const { goals } = useGoals();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'All' | 'Strength' | 'Cardio' | 'Flexibility'>('All');

  const filteredWorkouts = useMemo(() => {
    let filtered = workouts;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.title.toLowerCase().includes(query) ||
        w.type.toLowerCase().includes(query) ||
        w.notes?.toLowerCase().includes(query) ||
        w.exercises.some(e => e.name.toLowerCase().includes(query))
      );
    }
    if (filter !== 'All') {
      filtered = filtered.filter((w) => w.type.toLowerCase() === filter.toLowerCase());
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, searchQuery, filter]);

  const { start: weekStart, end: weekEnd } = useMemo(() => getPeriodRange('weekly', new Date()), []);
  const workoutsThisWeek = useMemo(
    () => filteredWorkouts.filter((w) => isWithinInterval(new Date(w.date), { start: weekStart, end: weekEnd })),
    [filteredWorkouts, weekStart, weekEnd]
  );
  const workoutsUpcoming = useMemo(
    () => filteredWorkouts
      .filter((w) => new Date(w.date) > weekEnd)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [filteredWorkouts, weekEnd]
  );
  const workoutsOlder = useMemo(
    () => filteredWorkouts.filter((w) => new Date(w.date) < weekStart),
    [filteredWorkouts, weekStart]
  );
  const groupedUpcoming = useMemo(() => groupWorkoutsByDate(workoutsUpcoming, true), [workoutsUpcoming]);
  const groupedThisWeek = useMemo(() => groupWorkoutsByDate(workoutsThisWeek), [workoutsThisWeek]);
  const groupedOlder = useMemo(() => groupWorkoutsByDate(workoutsOlder), [workoutsOlder]);

  // Weekly goal ring data
  const workoutsGoal = goals.find((g) => g.type === 'workouts');
  const weekGoalTarget = workoutsGoal?.target ?? 4;
  const weekDone = workoutsThisWeek.length;
  const weekPct = Math.min(weekDone / weekGoalTarget, 1);

  // Week calendar dots (Mon–Sun)
  const calWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(calWeekStart, i);
    const dateStr = format(day, 'yyyy-MM-dd');
    const hasWorkout = workouts.some((w) => format(new Date(w.date), 'yyyy-MM-dd') === dateStr);
    const isCurrentDay = isToday(day);
    return { label: format(day, 'EEEEE'), hasWorkout, isCurrentDay };
  });

  const handleSave = (workout: Omit<Workout, 'id'>) => {
    if (editingWorkout) {
      updateWorkout(editingWorkout.id, workout);
      toast.success('Workout updated');
    } else {
      addWorkout(workout);
      toast.success('Workout added');
    }
    setEditingWorkout(undefined);
  };

  const handleEdit = (workout: Workout) => {
    setEditingWorkout(workout);
    setModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingWorkout(undefined);
    setModalOpen(true);
  };

  const renderSection = (title: string, groups: { date: string; label: string; workouts: Workout[] }[]) => (
    <section>
      <h3 className="text-sm font-medium text-muted-foreground mb-3">{title}</h3>
      <div className="space-y-4">
        {groups.map(({ date: dateStr, label, workouts: dayWorkouts }) => (
          <div key={dateStr} className="rounded-2xl border border-border/30 bg-card shadow-sm p-3">
            <h4 className="text-xs font-medium text-muted-foreground mb-2 pl-0.5">{label}</h4>
            <div className="space-y-2">
              {dayWorkouts.map((workout) => (
                <WorkoutCard
                  key={workout.id}
                  workout={workout}
                  onEdit={handleEdit}
                  onDelete={setDeleteConfirmId}
                  onToggleCompleted={toggleWorkoutCompleted}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      {/* ── Weekly goal card ────────────────────────────── */}
      <Card className="rounded-[22px] border border-border/40 shadow-sm overflow-hidden">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[11px] font-bold tracking-[0.14em] text-muted-foreground uppercase mb-1">
                Goal · {weekGoalTarget} / week
              </p>
              <p className="text-[32px] font-extrabold leading-none tracking-tight">
                <span className="text-primary">{weekDone}</span>
                <span className="text-muted-foreground/50 font-semibold text-xl">/{weekGoalTarget}</span>
              </p>
            </div>
            {/* Ring */}
            <div className="relative w-[72px] h-[72px] shrink-0">
              <svg width={72} height={72} style={{ transform: 'rotate(-90deg)' }}>
                <circle cx={36} cy={36} r={30} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
                <circle
                  cx={36} cy={36} r={30} fill="none" stroke="hsl(var(--primary))" strokeWidth={6}
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 30}
                  strokeDashoffset={2 * Math.PI * 30 * (1 - weekPct)}
                  style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(.2,.8,.2,1)' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[11px] font-extrabold text-primary">
                  {Math.round(weekPct * 100)}%
                </span>
              </div>
            </div>
          </div>

          {/* Day dots */}
          <div className="flex justify-between gap-1">
            {weekDays.map((d, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">{d.label}</span>
                <div
                  className="w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors"
                  style={{
                    background: d.hasWorkout ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                    border: d.isCurrentDay ? '2px solid hsl(var(--foreground))' : 'none',
                  }}
                >
                  {d.hasWorkout ? (
                    <Check className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={3} />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold sm:flex-1">Workouts</h2>
          <div className="w-full sm:max-w-64">
            <SearchBar
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search workouts..."
            />
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-4">
          {(['All', 'Strength', 'Cardio', 'Flexibility'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap border transition-colors ${
                filter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <ContentWithLoading loading={workoutsLoading} loadingText="Loading workouts...">
          <div className="space-y-6">
            {filteredWorkouts.length === 0 ? (
              <EmptyStateCard
                onClick={handleAddNew}
                title="Add your first workout"
                description="Tap to start tracking your fitness"
              />
            ) : (
              <>
                {groupedUpcoming.length > 0 && renderSection('Upcoming', groupedUpcoming)}
                {groupedThisWeek.length > 0 && renderSection('This week', groupedThisWeek)}
                {groupedOlder.length > 0 && renderSection('Older', groupedOlder)}
                <AddAnotherCard onClick={handleAddNew} label="Add another workout" />
              </>
            )}
          </div>
        </ContentWithLoading>
      </div>

      <WorkoutModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSave={handleSave}
        workout={editingWorkout}
      />

      <ConfirmationDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteConfirmId(null); }}
        title="Delete workout"
        message="Are you sure you want to delete this workout? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteConfirmId) {
            deleteWorkout(deleteConfirmId);
            toast.success('Workout deleted');
          }
          setDeleteConfirmId(null);
        }}
      />
    </div>
  );
}
