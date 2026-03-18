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
import { toast } from 'sonner';
import { format, isToday, isYesterday, parseISO, isWithinInterval } from 'date-fns';
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
  const [modalOpen, setModalOpen] = useState(false);
  const [editingWorkout, setEditingWorkout] = useState<Workout | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

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
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [workouts, searchQuery]);

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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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
                {groupedUpcoming.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">Upcoming</h3>
                    </div>
                    <div className="space-y-4">
                      {groupedUpcoming.map(({ date: dateStr, label, workouts: dayWorkouts }) => (
                        <div key={dateStr} className="rounded-2xl border border-border/30 bg-card shadow-sm p-3">
                          <h4 className="text-xs font-medium text-muted-foreground mb-2 pl-0.5">
                            {label}
                          </h4>
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
                )}
                {groupedThisWeek.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-sm font-medium text-muted-foreground">This week</h3>
                    </div>
                    <div className="space-y-4">
                      {groupedThisWeek.map(({ date: dateStr, label, workouts: dayWorkouts }) => (
                        <div key={dateStr} className="rounded-2xl border border-border/30 bg-card shadow-sm p-3">
                          <h4 className="text-xs font-medium text-muted-foreground mb-2 pl-0.5">
                            {label}
                          </h4>
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
                )}
                {groupedOlder.length > 0 && (
                  <>
                    <h3 className="text-sm font-medium text-muted-foreground sticky top-0 bg-background/95 py-1">
                      Older
                    </h3>
                    {groupedOlder.map(({ date: dateStr, label, workouts: dayWorkouts }) => (
                      <section key={dateStr}>
                        <h4 className="text-xs font-medium text-muted-foreground mb-1.5 pl-0.5">
                          {label}
                        </h4>
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
                      </section>
                    ))}
                  </>
                )}
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
