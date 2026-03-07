import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkouts } from '@/hooks/useWorkouts';
import { useEnergy } from '@/hooks/useEnergy';
import { useGoals } from '@/hooks/useGoals';
import { DashboardProgressCards } from '@/components/home/DashboardProgressCards';
import { SleepEditModal } from '@/components/energy/SleepEditModal';
import { GoalModal } from '@/components/goals/GoalModal';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { SectionHeader } from '@/components/shared/SectionHeader';
import { Card, CardContent } from '@/components/ui/card';
import { VoiceMicHero } from '@/components/voice/VoiceMicHero';
import { getGreeting } from '@/lib/utils';
import { Goal } from '@/types/goals';
import { toast } from 'sonner';

export function Home() {
  const navigate = useNavigate();
  const { workoutsLoading } = useWorkouts();
  const { checkIns, addCheckIn, updateCheckIn, getCheckInByDate, energyLoading } = useEnergy();
  const { addGoal, updateGoal, goalsLoading } = useGoals();

  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);
  const [sleepModalOpen, setSleepModalOpen] = useState(false);


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

  const greeting = getGreeting();

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Hero: greeting */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{greeting}</h1>
      </div>

      {/* Voice hero — primary input */}
      <VoiceMicHero />

      <ContentWithLoading loading={workoutsLoading || energyLoading || goalsLoading} loadingText="Loading dashboard...">
      <div className="space-y-6 sm:space-y-8">
        {/* Progress cards (goals) */}
        <Card className="rounded-2xl overflow-hidden bg-gradient-to-br from-card to-muted/30">
          <CardContent className="p-5 sm:p-6">
            <SectionHeader title="Goals" subtitle="Today's progress" />
            <DashboardProgressCards
              onAddGoal={() => {
                setEditingGoal(undefined);
                setGoalModalOpen(true);
              }}
              onAddWorkout={() => navigate('/body')}
              onAddFood={() => navigate('/energy')}
              onAddSleep={() => setSleepModalOpen(true)}
            />
          </CardContent>
        </Card>
      </div>
      </ContentWithLoading>

      <GoalModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        onSave={handleGoalSave}
        goal={editingGoal}
      />

      <SleepEditModal
        open={sleepModalOpen}
        onOpenChange={setSleepModalOpen}
        onSave={handleSleepSave}
        currentHours={todayCheckIn?.sleepHours}
      />
    </div>
  );
}
