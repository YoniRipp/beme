import { useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalModal } from '@/components/goals/GoalModal';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyStateCard } from '@/components/shared/EmptyStateCard';
import { AddAnotherCard } from '@/components/shared/AddAnotherCard';
import type { Goal } from '@/types/goals';

export function Goals() {
  const { goals, goalsLoading, goalsError, addGoal, updateGoal } = useGoals();
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | undefined>(undefined);

  const handleGoalSave = (data: Omit<Goal, 'id' | 'createdAt'>) => {
    if (editingGoal) {
      updateGoal(editingGoal.id, data);
    } else {
      addGoal(data);
    }
    setEditingGoal(undefined);
    setGoalModalOpen(false);
  };

  const handleGoalEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setGoalModalOpen(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Goals</CardTitle>
        </CardHeader>
        <CardContent>
          <ContentWithLoading loading={goalsLoading} loadingText="Loading goals..." error={goalsError}>
            <div className="space-y-3">
              {goals.length === 0 ? (
                <EmptyStateCard
                  onClick={() => {
                    setEditingGoal(undefined);
                    setGoalModalOpen(true);
                  }}
                  title="Add your first goal"
                  description="Tap to track your progress"
                />
              ) : (
                <>
                  {goals.map((goal) => (
                    <GoalCard key={goal.id} goal={goal} onEdit={handleGoalEdit} />
                  ))}
                  <AddAnotherCard
                    onClick={() => {
                      setEditingGoal(undefined);
                      setGoalModalOpen(true);
                    }}
                    label="Add another goal"
                  />
                </>
              )}
            </div>
          </ContentWithLoading>
        </CardContent>
      </Card>

      <GoalModal
        open={goalModalOpen}
        onOpenChange={setGoalModalOpen}
        onSave={handleGoalSave}
        goal={editingGoal}
      />
    </div>
  );
}
