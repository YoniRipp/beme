import { useState } from 'react';
import { useMealPlans } from '@/hooks/useMealPlans';
import { MealPlanCard } from '@/components/mealplan/MealPlanCard';
import { MealPlanModal } from '@/components/mealplan/MealPlanModal';
import { ApplyMealPlanModal } from '@/components/mealplan/ApplyMealPlanModal';
import { ConfirmationDialog } from '@/components/shared/ConfirmationDialog';
import { ContentWithLoading } from '@/components/shared/ContentWithLoading';
import { EmptyStateCard } from '@/components/shared/EmptyStateCard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import type { MealPlanTemplate, MealPlanItem } from '@/types/mealPlan';
import { toast } from 'sonner';

export function MealPlans() {
  const { templates, loading, createTemplate, updateTemplate, deleteTemplate, applyToDay, applyLoading, createLoading } = useMealPlans();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<MealPlanTemplate | undefined>();
  const [applyTemplate, setApplyTemplate] = useState<MealPlanTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleSave = async (data: { name: string; description?: string; items: Omit<MealPlanItem, 'id'>[] }) => {
    if (editTemplate) {
      await updateTemplate(editTemplate.id, data);
    } else {
      await createTemplate(data);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirmId) return;
    try {
      await deleteTemplate(deleteConfirmId);
      toast.success('Meal plan deleted');
    } catch {
      toast.error('Failed to delete meal plan');
    }
    setDeleteConfirmId(null);
  };

  const handleEdit = (template: MealPlanTemplate) => {
    setEditTemplate(template);
    setCreateModalOpen(true);
  };

  return (
    <div className="max-w-lg md:max-w-2xl mx-auto space-y-5 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">Meal Plans</h2>
        <Button size="sm" onClick={() => { setEditTemplate(undefined); setCreateModalOpen(true); }}>
          <Plus className="w-4 h-4 mr-1.5" />
          New Plan
        </Button>
      </div>

      <ContentWithLoading loading={loading} loadingText="Loading meal plans...">
        {templates.length === 0 ? (
          <EmptyStateCard
            onClick={() => { setEditTemplate(undefined); setCreateModalOpen(true); }}
            title="Create your first meal plan"
            description="Upload a daily meal plan via text, form, or Excel and reuse it any day"
          />
        ) : (
          <div className="space-y-3">
            {templates.map((template) => (
              <MealPlanCard
                key={template.id}
                template={template}
                onApply={(t) => setApplyTemplate(t)}
                onEdit={handleEdit}
                onDelete={(id) => setDeleteConfirmId(id)}
              />
            ))}
          </div>
        )}
      </ContentWithLoading>

      <MealPlanModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) setEditTemplate(undefined);
        }}
        onSave={handleSave}
        editTemplate={editTemplate}
        saving={createLoading}
      />

      <ApplyMealPlanModal
        open={!!applyTemplate}
        onOpenChange={(open) => !open && setApplyTemplate(null)}
        template={applyTemplate}
        onApply={applyToDay}
        applying={applyLoading}
      />

      <ConfirmationDialog
        open={!!deleteConfirmId}
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
        title="Delete Meal Plan"
        message="Are you sure you want to delete this meal plan template? This action cannot be undone."
        onConfirm={handleDelete}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="destructive"
      />
    </div>
  );
}

export default MealPlans;
