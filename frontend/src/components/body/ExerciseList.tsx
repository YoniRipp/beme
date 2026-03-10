import { Exercise } from '@/types/workout';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { useExerciseImages } from '@/hooks/useExerciseImages';
import { useSettings } from '@/hooks/useSettings';
import { getWeightUnit } from '@/lib/utils';

interface ExerciseListProps {
  exercises: Exercise[];
}

export function ExerciseList({ exercises }: ExerciseListProps) {
  const { settings } = useSettings();
  const unit = getWeightUnit(settings.units);
  const { getImageUrl } = useExerciseImages();
  if (exercises.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No exercises added</p>
    );
  }

  return (
    <div className="space-y-2">
      {exercises.map((exercise, idx) => (
        <div key={idx} className="flex items-center gap-3 p-2 bg-muted rounded-lg">
          <ImagePlaceholder type="exercise" size="sm" imageUrl={getImageUrl(exercise.name)} />
          <div>
            <p className="font-medium">{exercise.name}</p>
            <p className="text-sm text-muted-foreground">
              {exercise.sets} sets × {exercise.reps} reps
              {exercise.weight && ` ${exercise.weight} ${unit}`}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
