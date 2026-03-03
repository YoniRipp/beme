import { useMemo, useState } from 'react';
import { useSettings } from '@/hooks/useSettings';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useSchedule } from '@/hooks/useSchedule';
import { useGoals } from '@/hooks/useGoals';
import { DashboardHero } from '@/components/home/DashboardHero';
import { DailySummary } from '@/components/home/DailySummary';
import { VoiceMicHero } from '@/components/voice/VoiceMicHero';
import { ScheduleItem } from '@/components/home/ScheduleItem';
import { ScheduleModal } from '@/components/home/ScheduleModal';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalModal } from '@/components/goals/GoalModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Plus } from 'lucide-react';
import { isWithinInterval, format } from 'date-fns';
import { isScheduleItemPastUtc, utcScheduleToLocalDateStr } from '@/lib/utils';
import { getPeriodRange } from '@/lib/dateRanges';
import { ScheduleItem as ScheduleItemType } from '@/types/schedule';
import { Goal } from '@/types/goals';
import { toast } from 'sonner';

export function Home() {
  const { settings } = useSettings();
  const { workouts } = useWorkouts();
  const { checkIns } = useEnergy();
  const { scheduleItems, scheduleLoading, scheduleError, addScheduleItem, updateScheduleItem, deleteScheduleItem } = useSchedule();
  const { goals, goalsLoading, goalsError, addGoal, updateGoal } = useGoals();

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleItemType | undefined>(undefined);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [deleteScheduleConfirmId, setDeleteScheduleConfirmId] = useState<string | null>(null);

  // Memoize date values to prevent unnecessary re-renders
  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const todayLabel = useMemo(() => format(new Date(), 'MMMM d'), []);

  // Workouts this week (Sunday-Saturday)
  const { start: weekStart, end: weekEnd } = useMemo(() => getPeriodRange('weekly', new Date()), []);
  const workoutsThisWeek = useMemo(
    () => workouts.filter((w) => isWithinInterval(new Date(w.date), { start: weekStart, end: weekEnd })).length,
    [workouts, weekStart, weekEnd]
  );

  // Last sleep: most recent check-in by date
  const lastSleepHours = useMemo(() => {
    const sorted = [...checkIns].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latest = sorted[0];
    return latest?.sleepHours;
  }, [checkIns]);

  const activeSchedule = useMemo(
    () =>
      scheduleItems
        .filter((item) => item.isActive && utcScheduleToLocalDateStr(item.date, item.startTime ?? '00:00') === todayStr)
        .sort((a, b) => {
          const aStart = a.startTime || '00:00';
          const bStart = b.startTime || '00:00';
          if (aStart !== bStart) return aStart.localeCompare(bStart);
          return (a.endTime || '00:00').localeCompare(b.endTime || '00:00');
        }),
    [scheduleItems, todayStr]
  );

  // New user detection for welcome banner
  const isNewUser = !scheduleLoading && !goalsLoading && activeSchedule.length === 0 && goals.length === 0;

  const handleScheduleSave = async (item: Omit<ScheduleItemType, 'id'>) => {
    try {
      if (editingSchedule) {
        await updateScheduleItem(editingSchedule.id, item);
        toast.success('Schedule item updated');
      } else {
        await addScheduleItem({ ...item, order: scheduleItems.length });
        toast.success('Schedule item added');
      }
      setEditingSchedule(undefined);
      setScheduleModalOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save schedule item. Please try again.');
    }
  };

  const handleScheduleEdit = (item: ScheduleItemType) => {
    setEditingSchedule(item);
    setScheduleModalOpen(true);
  };

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

  const handleGoalEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <DashboardHero
        workoutsThisWeek={workoutsThisWeek}
        lastSleepHours={lastSleepHours}
        energyScore={undefined}
      />

      <DailySummary />

      <VoiceMicHero />

      {isNewUser && (
        <Card className="p-5 border-primary/30 bg-primary/5">
          <h3 className="font-semibold mb-2">Welcome to BeMe!</h3>
          <p className="text-sm text-muted-foreground">
            Get started by adding your daily routine to the schedule, setting a fitness or nutrition goal, or tracking your first expense in the Money tab.
          </p>
        </Card>
      )}

      {/* Goals first (MyFitnessPal style), then Today's Schedule */}
      <div className="space-y-4 sm:space-y-6">
        <Card>
          <CardContent className="p-5">
            <SectionHeader title="Goals" subtitle="Track what matters" />
            <ContentWithLoading loading={goalsLoading} loadingText="Loading goals..." error={goalsError}>
              <div className="space-y-3">
                {goals.length === 0 ? (
                  <Card
                    className="p-8 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors text-center"
                    onClick={() => {
                      setEditingGoal(undefined);
                      setGoalModalOpen(true);
                    }}
                  >
                    <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-lg font-medium mb-1">Add your first goal</p>
                    <p className="text-sm text-muted-foreground">Tap to track your progress</p>
                  </Card>
                ) : (
                  <>
                    {goals.map((goal) => (
                      <GoalCard key={goal.id} goal={goal} onEdit={handleGoalEdit} />
                    ))}
                    <Card
                      className="p-6 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors text-center bg-muted"
                      onClick={() => {
                        setEditingGoal(undefined);
                        setGoalModalOpen(true);
                      }}
                    >
                      <Plus className="w-8 h-8 mx-auto text-primary" />
                      <p className="text-sm font-medium mt-2 text-muted-foreground">Add another goal</p>
                    </Card>
                  </>
                )}
              </div>
            </ContentWithLoading>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <SectionHeader
              title="Today's Schedule"
              subtitle={todayLabel}
            />
            <ContentWithLoading loading={scheduleLoading} loadingText="Loading schedule..." error={scheduleError}>
              <div className="space-y-2">
                {activeSchedule.length === 0 ? (
                  <Card
                    className="p-8 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors text-center"
                    onClick={() => {
                      setEditingSchedule(undefined);
                      setScheduleModalOpen(true);
                    }}
                  >
                    <Plus className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
                    <p className="text-lg font-medium mb-1">Add your first schedule item</p>
                    <p className="text-sm text-muted-foreground">Tap to create a daily routine</p>
                  </Card>
                ) : (
                  <>
                    {activeSchedule.map((item) => (
                      <ScheduleItem
                        key={item.id}
                        item={item}
                        isPast={isScheduleItemPastUtc(item.date, item.endTime ?? '00:00')}
                        onEdit={handleScheduleEdit}
                        onDelete={setDeleteScheduleConfirmId}
                        categoryColors={settings.scheduleCategoryColors}
                      />
                    ))}
                    <Card
                      className="p-6 border-2 border-dashed border-border cursor-pointer hover:border-primary transition-colors text-center bg-muted"
                      onClick={() => {
                        setEditingSchedule(undefined);
                        setScheduleModalOpen(true);
                      }}
                    >
                      <Plus className="w-8 h-8 mx-auto text-primary" />
                      <p className="text-sm font-medium mt-2 text-muted-foreground">Add another schedule item</p>
                    </Card>
                  </>
                )}
              </div>
            </ContentWithLoading>
          </CardContent>
        </Card>
      </div>

      <ScheduleModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        onSave={handleScheduleSave}
        item={editingSchedule}
        initialDate={todayStr}
      />

      <GoalModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        onSave={handleGoalSave}
        goal={editingGoal}
      />

      <ConfirmationDialog
        open={!!deleteScheduleConfirmId}
        onOpenChange={(open) => { if (!open) setDeleteScheduleConfirmId(null); }}
        title="Delete schedule item"
        message="Are you sure you want to delete this schedule item? This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteScheduleConfirmId) {
            deleteScheduleItem(deleteScheduleConfirmId);
            toast.success('Schedule item deleted');
          }
          setDeleteScheduleConfirmId(null);
        }}
      />
    </div>
  );
}
