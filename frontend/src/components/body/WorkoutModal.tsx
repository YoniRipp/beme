import { useState, useEffect } from 'react';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Workout, Exercise, WORKOUT_TYPES } from '@/types/workout';
import { workoutFormSchema, type WorkoutFormValues } from '@/schemas/workout';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, Copy, Save } from 'lucide-react';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { getWeightUnit } from '@/lib/utils';

export type WorkoutTemplate = Omit<Workout, 'id' | 'date'>;

interface WorkoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (workout: Omit<Workout, 'id'>) => void;
  workout?: Workout;
}

const defaultExercise: WorkoutFormValues['exercises'][0] = {
  name: '',
  sets: 3,
  reps: 10,
  repsPerSet: [10, 10, 10],
  weight: undefined,
};

const defaultValues: WorkoutFormValues = {
  title: 'Workout',
  type: 'strength',
  date: new Date().toISOString().split('T')[0],
  durationMinutes: '',
  notes: '',
  exercises: [defaultExercise],
};

export function WorkoutModal({ open, onOpenChange, onSave, workout }: WorkoutModalProps) {
  const { settings } = useSettings();
  const unit = getWeightUnit(settings.units);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isValid },
  } = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutFormSchema),
    defaultValues,
    mode: 'onChange',
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'exercises' });
  const watchedTitle = watch('title');
  const watchedExercises = watch('exercises');

  // Keep repsPerSet length in sync with sets for each exercise
  useEffect(() => {
    const exercises = watchedExercises ?? [];
    exercises.forEach((ex, idx) => {
      if (!ex) return;
      const sets = Math.min(20, Math.max(1, Number(ex.sets) || 1));
      const current = ex.repsPerSet ?? [];
      if (current.length === sets) return;
      let next: number[];
      if (current.length < sets) {
        const fill = ex.reps ?? 0;
        next = [...current, ...Array.from({ length: sets - current.length }, () => (current.length ? current[current.length - 1] : fill))];
      } else {
        next = current.slice(0, sets);
      }
      setValue(`exercises.${idx}.repsPerSet`, next, { shouldValidate: true });
    });
  }, [watchedExercises, setValue]);

  useEffect(() => {
    if (open) {
      const savedTemplates = storage.get<WorkoutTemplate[]>(STORAGE_KEYS.WORKOUT_TEMPLATES) || [];
      setTemplates(savedTemplates);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (workout) {
      reset({
        title: workout.title,
        type: workout.type,
        date: new Date(workout.date).toISOString().split('T')[0],
        durationMinutes: workout.durationMinutes.toString(),
        notes: workout.notes ?? '',
        exercises: workout.exercises.length
          ? workout.exercises.map((e) => {
              const repsPerSet =
                e.repsPerSet && e.repsPerSet.length === e.sets
                  ? e.repsPerSet
                  : Array.from({ length: e.sets }, () => e.reps);
              return { name: e.name, sets: e.sets, reps: e.reps, repsPerSet, weight: e.weight };
            })
          : [defaultExercise],
      });
    } else {
      reset({ ...defaultValues, title: 'Workout', date: new Date().toISOString().split('T')[0] });
    }
  }, [open, workout, reset]);

  const addExercise = () =>
    append({
      ...defaultExercise,
      repsPerSet: Array.from({ length: defaultExercise.sets }, () => defaultExercise.reps),
    });

  const loadTemplate = (template: WorkoutTemplate) => {
    reset({
      title: template.title,
      type: template.type,
      date: new Date().toISOString().split('T')[0],
      durationMinutes: template.durationMinutes.toString(),
      notes: template.notes ?? '',
      exercises: template.exercises.length
        ? template.exercises.map((e) => {
            const repsPerSet =
              e.repsPerSet && e.repsPerSet.length === e.sets
                ? e.repsPerSet
                : Array.from({ length: e.sets }, () => e.reps);
            return { name: e.name, sets: e.sets, reps: e.reps, repsPerSet, weight: e.weight };
          })
        : [defaultExercise],
    });
  };

  const saveAsTemplate = () => {
    const title = watchedTitle?.trim();
    const exercises = (watchedExercises ?? []).filter((ex) => ex.name?.trim());
    if (!title || exercises.length === 0) {
      toast.error('Please add a title and at least one exercise before saving as template');
      return;
    }
    if (templates.some(t => t.title.toLowerCase() === title.toLowerCase())) {
      toast.error('A template with this name already exists');
      return;
    }
    const template: WorkoutTemplate = {
      title,
      type: watch('type'),
      durationMinutes: parseInt(watch('durationMinutes') || '0', 10),
      notes: watch('notes'),
      exercises: exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        ...(e.repsPerSet && e.repsPerSet.length === e.sets ? { repsPerSet: e.repsPerSet } : undefined),
        weight: e.weight,
      })),
    };
    try {
      const updatedTemplates = [...templates, template];
      storage.set(STORAGE_KEYS.WORKOUT_TEMPLATES, updatedTemplates);
      setTemplates(updatedTemplates);
      toast.success('Workout saved as template!');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save template. Please try again.');
    }
  };

  const deleteTemplate = (idx: number) => {
    const updated = templates.filter((_, i) => i !== idx);
    storage.set(STORAGE_KEYS.WORKOUT_TEMPLATES, updated);
    setTemplates(updated);
    toast.success('Template removed');
  };

  const onSubmit = (data: WorkoutFormValues) => {
    const exercises: Exercise[] = data.exercises
      .filter((ex) => ex.name.trim() !== '')
      .map((ex) => {
        const reps = ex.repsPerSet?.[0] ?? ex.reps;
        return {
          name: ex.name,
          sets: ex.sets,
          reps,
          ...(ex.repsPerSet && ex.repsPerSet.length === ex.sets ? { repsPerSet: ex.repsPerSet } : undefined),
          weight: ex.weight,
        };
      });
    onSave({
      title: data.title,
      type: data.type,
      date: new Date(data.date),
      durationMinutes: parseInt(data.durationMinutes, 10),
      notes: data.notes,
      exercises,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{workout ? 'Edit Workout' : 'Add Workout'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {templates.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <Label className="mb-2 block">Saved Workouts</Label>
                <div className="flex flex-wrap gap-2">
                  {templates.map((t, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => loadTemplate(t)}
                        className="text-xs"
                      >
                        <Copy className="w-3 h-3 mr-1" />
                        {t.title}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteTemplate(idx)}
                        aria-label={`Delete template: ${t.title}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="p-4 rounded-lg border bg-muted/30 space-y-4">
              <h3 className="text-sm font-medium">Workout</h3>
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  {...register('title')}
                  placeholder="e.g., Workout, SS"
                  aria-invalid={!!errors.title}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                />
                {errors.title && (
                  <p id="title-error" className="text-sm text-destructive mt-1">
                    {errors.title.message}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Type</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {WORKOUT_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    {...register('durationMinutes')}
                    aria-invalid={!!errors.durationMinutes}
                    aria-describedby={errors.durationMinutes ? 'duration-error' : undefined}
                  />
                  {errors.durationMinutes && (
                    <p id="duration-error" className="text-sm text-destructive mt-1">
                      {errors.durationMinutes.message}
                    </p>
                  )}
                </div>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" type="date" {...register('date')} />
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea id="notes" {...register('notes')} placeholder="How did it go?" />
              </div>
            </div>

            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Exercises</h3>
                <Button type="button" variant="outline" size="sm" onClick={addExercise}>
                  <Plus className="w-4 h-4 mr-1" />
                  Add Exercise
                </Button>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-3">
                <div className="grid gap-2 grid-cols-[1fr_5rem_minmax(0,1fr)_6rem] items-center text-xs font-medium text-muted-foreground">
                  <span>Exercise name</span>
                  <span className="text-center">Sets</span>
                  <span>Reps per set</span>
                  <span className="text-center">{`Weight (${unit})`}</span>
                </div>
                {fields.map((field, idx) => {
                  const setsCount = Math.min(20, Math.max(1, Number(watchedExercises?.[idx]?.sets) || 1));
                  const repsPerSet = watchedExercises?.[idx]?.repsPerSet ?? Array.from({ length: setsCount }, () => watchedExercises?.[idx]?.reps ?? 0);
                  const repsError = errors.exercises?.[idx]?.repsPerSet;
                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="grid gap-2 grid-cols-[1fr_5rem_minmax(0,1fr)_6rem] items-start">
                        <div>
                          <Input
                            placeholder="e.g. Squat, Deadlift"
                            className="w-full"
                            {...register(`exercises.${idx}.name`)}
                            aria-invalid={!!errors.exercises?.[idx]?.name}
                            aria-describedby={errors.exercises?.[idx]?.name ? `exercise-${idx}-name-error` : undefined}
                          />
                          {errors.exercises?.[idx]?.name && (
                            <p id={`exercise-${idx}-name-error`} className="text-xs text-destructive mt-1">
                              {errors.exercises[idx]?.name?.message}
                            </p>
                          )}
                        </div>
                        <div>
                          <Input
                            type="number"
                            placeholder="3"
                            min={1}
                            max={20}
                            {...register(`exercises.${idx}.sets`)}
                            aria-invalid={!!errors.exercises?.[idx]?.sets}
                          />
                          {errors.exercises?.[idx]?.sets && (
                            <p className="text-xs text-destructive mt-1">{errors.exercises[idx]?.sets?.message}</p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 items-center min-h-10">
                          {Array.from({ length: setsCount }, (_, i) => (
                            <Input
                              key={i}
                              type="number"
                              placeholder={`${i + 1}`}
                              min={0}
                              className="w-14 min-w-14 text-center"
                              value={repsPerSet[i] ?? ''}
                              onChange={(e) => {
                                const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                const next = [...(repsPerSet ?? [])];
                                next[i] = v === undefined || Number.isNaN(v) ? 0 : v;
                                setValue(`exercises.${idx}.repsPerSet`, next, { shouldValidate: true });
                              }}
                              aria-label={`Set ${i + 1} reps`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-1">
                        <Controller
                          name={`exercises.${idx}.weight`}
                          control={control}
                          render={({ field: weightField }) => (
                            <Input
                              type="number"
                              placeholder={unit}
                              className="w-full"
                              value={weightField.value ?? ''}
                              onChange={(e) => weightField.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                              aria-invalid={!!errors.exercises?.[idx]?.weight}
                            />
                          )}
                        />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)} aria-label="Remove exercise">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      </div>
                      {repsError && (
                        <p className="text-xs text-destructive" aria-live="polite">
                          {repsError.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
              {errors.exercises?.root && (
                <p className="text-sm text-destructive mt-1">{errors.exercises.root.message}</p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6">
            <div className="flex justify-between w-full">
                <Button
                  type="button"
                  variant="outline"
                  onClick={saveAsTemplate}
                  disabled={!watchedTitle?.trim() || (watchedExercises?.length ?? 0) === 0}
                >
                  <Save className="w-4 h-4 mr-1" />
                  Save as Template
                </Button>
              <div className="flex gap-2 ml-auto">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!isValid}>
                  {workout ? 'Update' : 'Add'} Workout
                </Button>
              </div>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
