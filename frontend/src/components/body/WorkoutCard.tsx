import { memo } from 'react';
import { Workout } from '@/types/workout';
import { formatDate, getWeightUnit } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { Badge } from '@/components/ui/badge';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { useExercises } from '@/hooks/useExercises';

interface WorkoutCardProps {
  workout: Workout;
  onEdit?: (workout: Workout) => void;
  onDelete?: (id: string) => void;
}

export const WorkoutCard = memo(function WorkoutCard({ workout, onEdit, onDelete }: WorkoutCardProps) {
  const { settings } = useSettings();
  const unit = getWeightUnit(settings.units);
  const { getImageUrl } = useExercises();
  const cardImageUrl = workout.exercises.map(ex => getImageUrl(ex.name)).find(Boolean);
  return (
    <div
      className="group flex items-start gap-3 p-4 bg-card border-l-[3px] border-l-info/50 border border-border/30 rounded-xl cursor-pointer hover:bg-sage-50/50 transition-colors tap-target"
      onClick={() => onEdit && onEdit(workout)}
      role="button"
      tabIndex={0}
      aria-label={`Workout: ${workout.title}, ${workout.type}, ${workout.durationMinutes} minutes`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onEdit && onEdit(workout);
        }
      }}
    >
      <ImagePlaceholder type="exercise" size="md" imageUrl={cardImageUrl} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[15px] font-semibold truncate">{workout.title}</p>
          <Badge variant="secondary" className="bg-info/10 text-info border-0 text-[10px]">{workout.type}</Badge>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mb-1.5">
          <span>{formatDate(workout.date)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {workout.durationMinutes} min
          </span>
        </div>
        {workout.exercises.length > 0 && (
          <div className="mt-1.5 space-y-1">
            {workout.exercises.slice(0, 3).map((ex, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                {getImageUrl(ex.name) ? (
                  <img
                    src={getImageUrl(ex.name)}
                    alt={ex.name}
                    className="w-5 h-5 rounded object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-5 h-5 rounded bg-muted shrink-0" />
                )}
                <span className="text-foreground/70 font-medium truncate">{ex.name}</span>
                <span className="tabular-nums shrink-0">
                  {ex.sets} × {ex.reps}{ex.weight ? ` · ${ex.weight} ${unit}` : ''}
                </span>
              </div>
            ))}
            {workout.exercises.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{workout.exercises.length - 3} more
              </p>
            )}
          </div>
        )}
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(workout.id);
          }}
          aria-label={`Delete workout: ${workout.title}`}
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
});
