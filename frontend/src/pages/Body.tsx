import { useState, useMemo } from 'react';
import { useWorkouts } from '@/hooks/useWorkouts';
import { Workout } from '@/types/workout';
import { WorkoutCard } from '@/components/body/WorkoutCard';
import { WorkoutModal } from '@/components/body/WorkoutModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SearchBar } from '@/components/shared/SearchBar';
import { Card } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, isToday, isYesterday, parseISO, isWithinInterval } from 'date-fns';
import { getPeriodRange } from '@/lib/dateRanges';

function groupWorkoutsByDate(workouts: Workout[]): { date: string; label: string; workouts: Workout[] }[] {
  const byDate = new Map<string, Workout[]>();
  for (const w of workouts) {
    const d = format(new Date(w.date), 'yyyy-MM-dd');
    if (!byDate.has(d)) byDate.set(d, []);
    byDate.get(d)!.push(w);
  }
  const sortedDates = Array.from(byDate.keys()).sort((a, b) => b.localeCompare(a));
  return sortedDates.map((dateStr) => {
    const d = parseISO(dateStr);
    let label: string;
    if (isToday(d)) label = 'Today';
    else if (isYesterday(d)) label = 'Yesterday';
    else label = format(d, 'EEEE, MMM d');
    return { date: dateStr, label, workouts: byDate.get(dateStr)! };
  });
}

export function Body() {
  const { workouts, workoutsLoading, addWorkout, updateWorkout, deleteWorkout } = useWorkouts();
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
  const workoutsOlder = useMemo(
    () => filteredWorkouts.filter((w) => new Date(w.date) < weekStart),
    [filteredWorkouts, weekStart]
  );
  const groupedOlder = useMemo(() => groupWorkoutsByDate(workoutsOlder), [workoutsOlder]);

  const weekSummary = useMemo(() => {
    const byDay = new Map<number, number>();
    workoutsThisWeek.forEach((w) => {
      const day = new Date(w.date).getDay();
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    });
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames.map((name, i) => (byDay.get(i) ? `${name} ${byDay.get(i)}` : null)).filter(Boolean) as string[];
  }, [workoutsThisWeek]);

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
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-xl font-semibold flex-1">Workouts</h2>
          <div className="w-full max-w-64">
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
              <Card 
                className="p-8 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center"
                onClick={handleAddNew}
              >
                <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-lg font-medium mb-1">Add your first workout</p>
                <p className="text-sm text-muted-foreground">Tap to start tracking your fitness</p>
              </Card>
            ) : (
              <>
                {workoutsThisWeek.length > 0 && (
                  <section>
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-sm font-medium text-muted-foreground">This week</h3>
                      {weekSummary.length > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {weekSummary.join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3 space-y-2">
                      {workoutsThisWeek.map((workout) => (
                        <WorkoutCard
                          key={workout.id}
                          workout={workout}
                          onEdit={handleEdit}
                          onDelete={setDeleteConfirmId}
                        />
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
                            />
                          ))}
                        </div>
                      </section>
                    ))}
                  </>
                )}
                <Card 
                  className="p-6 border-2 border-dashed cursor-pointer hover:border-primary transition-colors text-center bg-muted/50"
                  onClick={handleAddNew}
                >
                  <Plus className="w-8 h-8 mx-auto text-primary" />
                  <p className="text-sm font-medium mt-2 text-muted-foreground">Add another workout</p>
                </Card>
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
