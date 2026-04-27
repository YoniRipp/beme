import { useState, useMemo } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { Workout } from '@/types/workout';
import { WorkoutCard } from '@/components/body/WorkoutCard';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SearchBar } from '@/components/shared/SearchBar';
import { EmptyStateCard } from '@/components/shared/EmptyStateCard';
import { AddAnotherCard } from '@/components/shared/AddAnotherCard';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Check, Dumbbell } from 'lucide-react';
import { format, isToday, isYesterday, parseISO, isWithinInterval, eachDayOfInterval, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import { getPeriodRange } from '@/lib/dateRanges';

const WEEKLY_GOAL = 3;
const TYPE_FILTERS = ['All', 'Strength', 'Cardio', 'Flexibility'] as const;

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const filteredWorkouts = useMemo(() => {
    let filtered = workouts;
    if (typeFilter !== 'All') {
      filtered = filtered.filter(w => w.type.toLowerCase() === typeFilter.toLowerCase());
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(w =>
        w.title.toLowerCase().includes(query) ||
        w.type.toLowerCase().includes(query) ||
        w.notes?.toLowerCase().includes(query) ||
        w.exercises.some(e => e.name.toLowerCase().includes(query))
      );
    }
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, searchQuery, typeFilter]);

  const { start: weekStart, end: weekEnd } = useMemo(() => getPeriodRange('weekly', new Date()), []);
  const workoutsThisWeek = useMemo(
    () =>
      filteredWorkouts.filter((w) => isWithinInterval(new Date(w.date), { start: weekStart, end: weekEnd })),
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

  const weekDays = useMemo(() => {
    const today = new Date();
    const wStart = startOfWeek(today, { weekStartsOn: 1 });
    const wEnd = endOfWeek(today, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: wStart, end: wEnd }).map(d => ({
      label: format(d, 'EEEEE'),
      isToday: isSameDay(d, today),
      hasWorkout: workouts.some(w => isSameDay(new Date(w.date), d)),
    }));
  }, [workouts]);

  const thisWeekCount = weekDays.filter(d => d.hasWorkout).length;
  const weekPct = WEEKLY_GOAL > 0 ? Math.min(thisWeekCount / WEEKLY_GOAL, 1) : 0;

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

  const renderSection = (label: string, groups: ReturnType<typeof groupWorkoutsByDate>) => (
    <section>
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-3">{label}</h3>
      <div className="space-y-4">
        {groups.map(({ date: dateStr, label: dayLabel, workouts: dayWorkouts }) => (
          <div key={dateStr}>
            <h4 className="text-xs font-semibold text-foreground/80 mb-2 pl-1">{dayLabel}</h4>
            <div className="rounded-2xl border border-border bg-card shadow-card p-2 space-y-1">
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
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Card className="p-4 mb-5">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">Goal · {WEEKLY_GOAL}/week</p>
              <p className="font-display text-3xl font-medium mt-1">
                <span className="text-primary">{thisWeekCount}</span>
                <span className="text-muted-foreground">/{WEEKLY_GOAL}</span>
              </p>
            </div>
            <div className="relative w-[72px] h-[72px]">
              <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90">
                <circle cx="36" cy="36" r="30" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" />
                <circle cx="36" cy="36" r="30" fill="none" stroke="hsl(var(--primary))" strokeWidth="5"
                        strokeLinecap="round"
                        strokeDasharray={2 * Math.PI * 30}
                        strokeDashoffset={2 * Math.PI * 30 * (1 - weekPct)}
                        className="transition-all duration-700" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-primary" />
              </div>
            </div>
          </div>
          <div className="flex justify-between gap-1">
            {weekDays.map((day, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className="text-[10px] font-bold text-muted-foreground">{day.label}</span>
                <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center
                  ${day.hasWorkout ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}
                  ${day.isToday ? 'ring-2 ring-foreground ring-offset-1 ring-offset-background' : ''}`}>
                  {day.hasWorkout && <Check className="w-4 h-4" strokeWidth={2.6} />}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="w-full sm:max-w-64">
            <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="Search workouts..." />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar mb-5">
          {TYPE_FILTERS.map(f => (
            <button
              key={f}
              type="button"
              onClick={() => setTypeFilter(f)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap press shrink-0
                border transition-colors
                ${typeFilter === f
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary/40'}`}
            >
              {f}
            </button>
          ))}
        </div>

        <ContentWithLoading loading={workoutsLoading} loadingText="Loading workouts...">
          <div className="space-y-8">
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
