import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Trash2, Pencil, CalendarPlus } from 'lucide-react';
import type { MealPlanTemplate, MealType } from '@/types/mealPlan';

const MEAL_ORDER: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

interface MealPlanCardProps {
  template: MealPlanTemplate;
  onApply: (template: MealPlanTemplate) => void;
  onEdit: (template: MealPlanTemplate) => void;
  onDelete: (id: string) => void;
}

export function MealPlanCard({ template, onApply, onEdit, onDelete }: MealPlanCardProps) {
  const totalCalories = template.items.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = template.items.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = template.items.reduce((sum, item) => sum + item.carbs, 0);
  const totalFats = template.items.reduce((sum, item) => sum + item.fats, 0);

  const mealCounts = MEAL_ORDER
    .map((meal) => {
      const count = template.items.filter((item) => item.mealType === meal).length;
      return count > 0 ? `${count} ${meal}` : null;
    })
    .filter(Boolean);

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-base truncate">{template.name}</h3>
            {template.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{template.description}</p>
            )}
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(template)}>
              <Pencil className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(template.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {mealCounts.map((label) => (
            <span key={label} className="text-xs bg-muted px-2 py-0.5 rounded-full">{label}</span>
          ))}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="font-semibold tabular-nums">{totalCalories} cal</span>
          <span className="text-muted-foreground tabular-nums">P {Math.round(totalProtein)}g</span>
          <span className="text-muted-foreground tabular-nums">C {Math.round(totalCarbs)}g</span>
          <span className="text-muted-foreground tabular-nums">F {Math.round(totalFats)}g</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onApply(template)}
        >
          <CalendarPlus className="w-4 h-4 mr-2" />
          Apply to Day
        </Button>
      </CardContent>
    </Card>
  );
}
