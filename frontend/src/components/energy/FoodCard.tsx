import { memo } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { getFoodImageUrl } from '@/hooks/useFoodImages';
import type { FoodEntry } from '@/types/energy';

interface FoodCardProps {
  entry: FoodEntry;
  onEdit: (entry: FoodEntry) => void;
  onDelete: (id: string) => void;
}

export const FoodCard = memo(function FoodCard({ entry, onEdit, onDelete }: FoodCardProps) {
  const portionText = entry.portionAmount != null
    ? `${entry.portionAmount}${entry.portionUnit ? ` ${entry.portionUnit}` : ''}`
    : null;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl bg-white border border-border/50 cursor-pointer hover:shadow-sm transition-all"
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
      <div className="shrink-0">
        <ImagePlaceholder type="food" size="md" imageUrl={getFoodImageUrl(entry.name)} className="rounded-full" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate">{entry.name}</p>
        {portionText && (
          <p className="text-xs text-muted-foreground truncate">{portionText}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-bold tabular-nums">{entry.calories} cal</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
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
