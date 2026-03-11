import { memo } from 'react';
import { Workout } from '@/types/workout';
import { formatDate, getWeightUnit } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { Badge } from '@/components/ui/badge';
import { Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { useExerciseImages } from '@/hooks/useExerciseImages';

interface WorkoutCardProps {
  workout: Workout;
  onEdit?: (workout: Workout) => void;
  onDelete?: (id: string) => void;
}

export const WorkoutCard = memo(function WorkoutCard({ workout, onEdit, onDelete }: WorkoutCardProps) {
  const { settings } = useSettings();
  const unit = getWeightUnit(settings.units);
  const { getImageUrl } = useExerciseImages();
  const cardImageUrl = workout.exercises.map(ex => getImageUrl(ex.name)).find(Boolean);
  return (
    <div
      className="flex items-start gap-3 p-3 bg-white border border-border/50 rounded-xl cursor-pointer hover:shadow-sm transition-all"
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
          <p className="text-sm font-medium truncate">{workout.title}</p>
          <Badge variant="secondary">{workout.type}</Badge>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-1">
          <span>{formatDate(workout.date)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {workout.durationMinutes} min
          </span>
        </div>
        {workout.exercises.length > 0 && (
          <div className="mt-1.5 space-y-0.5">
            {workout.exercises.slice(0, 3).map((ex, i) => (
              <p key={i} className="text-xs text-muted-foreground truncate">
                {ex.name}{' '}
                <span className="text-muted-foreground">
                  {ex.sets} × {ex.reps}{ex.weight ? ` ${ex.weight} ${unit}` : ''}
                </span>
              </p>
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
          className="shrink-0"
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
