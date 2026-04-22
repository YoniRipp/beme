import { memo } from 'react';
import { Workout } from '@/types/workout';
import { formatDate, getWeightUnit } from '@/lib/utils';
import { useSettings } from '@/hooks/useSettings';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { useExercises } from '@/hooks/useExercises';

interface WorkoutCardProps {
  workout: Workout;
  onEdit?: (workout: Workout) => void;
  onDelete?: (id: string) => void;
  onToggleCompleted?: (id: string, completed: boolean) => void;
}

export const WorkoutCard = memo(function WorkoutCard({ workout, onEdit, onDelete, onToggleCompleted }: WorkoutCardProps) {
  const { settings } = useSettings();
  const unit = getWeightUnit(settings.units);
  const { getImageUrl } = useExercises();
  const cardImageUrl = workout.exercises.map(ex => getImageUrl(ex.name)).find(Boolean);
  return (
    <div
      className={`group flex items-start gap-3.5 p-4 rounded-xl bg-card hover:bg-muted/60 transition-colors cursor-pointer tap-target ${workout.completed ? 'opacity-75' : ''}`}
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
      {onToggleCompleted && (
        <button
          type="button"
          className="shrink-0 mt-0.5 flex items-center justify-center rounded-full press"
          onClick={(e) => {
            e.stopPropagation();
            onToggleCompleted(workout.id, !workout.completed);
          }}
          aria-label={workout.completed ? 'Mark as not completed' : 'Mark as completed'}
        >
          {workout.completed
            ? <CheckCircle2 className="w-6 h-6 text-success" />
            : <Circle className="w-6 h-6 text-muted-foreground/50 hover:text-primary transition-colors" />
          }
        </button>
      )}
      <div className="shrink-0">
        <ImagePlaceholder type="exercise" size="md" imageUrl={cardImageUrl} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className={`text-[15px] font-semibold truncate leading-tight ${workout.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
            {workout.title}
          </p>
          <Badge variant="secondary" className="bg-muted text-muted-foreground border-0 text-[10px] px-1.5 py-0 h-4 font-medium uppercase tracking-wider">
            {workout.type}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <span>{formatDate(workout.date)}</span>
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {workout.durationMinutes} min
          </span>
        </div>
        {workout.exercises.length > 0 && (
          <ul className="space-y-1.5">
            {workout.exercises.slice(0, 3).map((ex, i) => (
              <li key={i} className="text-xs leading-snug">
                <span className="text-foreground/85 font-medium break-words">{ex.name}</span>
                <span className="tabular-nums text-muted-foreground whitespace-nowrap ml-1.5">
                  · {ex.sets} × {ex.reps}{ex.weight ? ` · ${ex.weight} ${unit}` : ''}
                </span>
              </li>
            ))}
            {workout.exercises.length > 3 && (
              <li className="text-xs text-muted-foreground/80">
                +{workout.exercises.length - 3} more
              </li>
            )}
          </ul>
        )}
      </div>
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
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
