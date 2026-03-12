import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MealPlanTemplate, MealType } from '@/types/mealPlan';
import { toast } from 'sonner';

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

interface ApplyMealPlanModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template: MealPlanTemplate | null;
  onApply: (id: string, date: string) => Promise<unknown>;
  applying: boolean;
}

export function ApplyMealPlanModal({ open, onOpenChange, template, onApply, applying }: ApplyMealPlanModalProps) {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);

  if (!template) return null;

  const groupedItems = MEAL_ORDER.map((meal) => ({
    meal,
    items: template.items.filter((item) => item.mealType === meal),
  })).filter((g) => g.items.length > 0);

  const totalCalories = template.items.reduce((sum, item) => sum + item.calories, 0);

  const handleApply = async () => {
    try {
      await onApply(template.id, date);
      toast.success(`"${template.name}" applied to ${date}`);
      onOpenChange(false);
    } catch {
      toast.error('Failed to apply meal plan');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply Meal Plan</DialogTitle>
          <DialogDescription>
            Apply &quot;{template.name}&quot; to create food entries for the selected day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="apply-date">Date</Label>
            <Input
              id="apply-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Preview ({totalCalories} cal total)</h4>
            {groupedItems.map(({ meal, items }) => (
              <div key={meal}>
                <p className="text-sm font-semibold mb-1">{meal}</p>
                <div className="space-y-1 pl-3">
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="truncate mr-2">
                        {item.name}
                        {item.portionAmount ? ` (${item.portionAmount}${item.portionUnit || 'g'})` : ''}
                      </span>
                      <span className="text-muted-foreground tabular-nums shrink-0">{item.calories} cal</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <Button className="w-full" onClick={handleApply} disabled={applying || !date}>
            {applying ? 'Applying...' : 'Apply Meal Plan'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
