import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import type { FoodEntry } from '@/types/energy';

function formatMealTime(entry: FoodEntry): string | null {
  const start = entry.startTime;
  const end = entry.endTime;
  if (!start && !end) return null;
  if (start && end) {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const durMin = (eh * 60 + em) - (sh * 60 + sm);
    const durStr = durMin >= 60 ? `${Math.floor(durMin / 60)}h` : `${durMin} min`;
    return `${start}–${end} (${durStr})`;
  }
  return start ?? end ?? null;
}

interface FoodCardProps {
  entry: FoodEntry;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
}

export const FoodCard = memo(function FoodCard({ entry, onEdit, onDelete }: FoodCardProps) {
  const mealTime = formatMealTime(entry);

  return (
    <div
      className="flex items-center gap-3 p-3 bg-muted rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
      role="button"
      tabIndex={0}
      aria-label={`Food entry: ${entry.name}, ${entry.calories} calories`}
      onClick={() => onEdit(entry)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit(entry);
        }
      }}
    >
      <ImagePlaceholder type="food" size="md" />

      <div className="flex-1 min-w-0">
        <p className="text-base font-semibold truncate">{entry.name}</p>
        {(entry.portionAmount != null || mealTime) && (
          <p className="text-sm text-muted-foreground truncate">
            {entry.portionAmount != null && (
              <>{entry.portionAmount}{entry.portionUnit ? ` ${entry.portionUnit}` : ''}</>
            )}
            {entry.portionAmount != null && mealTime && ' • '}
            {mealTime}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          P: {entry.protein}g  C: {entry.carbs}g  F: {entry.fats}g
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 shrink-0">
        <div className="text-right">
          <p className="text-base font-bold text-orange-600">{entry.calories}</p>
          <p className="text-xs text-muted-foreground">cal</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(entry.id);
          }}
          aria-label={`Delete food entry: ${entry.name}`}
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
});
