import { useState, useEffect, useRef } from 'react';
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
import { Plus, Trash2, Copy, Save, X } from 'lucide-react';
import { STORAGE_KEYS, storage } from '@/lib/storage';
import { toLocalDateString, parseLocalDateString } from '@/lib/dateRanges';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { getWeightUnit } from '@/lib/utils';
import { useExercises, type CatalogExercise } from '@/hooks/useExercises';
import { ImagePlaceholder } from '@/components/shared/ImagePlaceholder';
import { ImageLightbox } from '@/components/shared/ImageLightbox';

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
  weightPerSet: [undefined, undefined, undefined],
  weight: undefined,
};

const defaultValues: WorkoutFormValues = {
  title: 'Workout',
  type: 'strength',
  date: toLocalDateString(new Date()),
  durationMinutes: '',
  notes: '',
  exercises: [defaultExercise],
};

function ExerciseNameInput({
  value,
  onChange,
  onBlur,
  exercises,
  placeholder,
  ariaInvalid,
  ariaDescribedBy,
}: {
  value: string;
  onChange: (val: string) => void;
  onBlur: () => void;
  exercises: CatalogExercise[];
  placeholder?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const query = value.toLowerCase().trim();
  const suggestions = query.length >= 1
    ? exercises.filter(ex => ex.name.toLowerCase().includes(query)).slice(0, 8)
    : [];

  useEffect(() => {
    setHighlightIdx(-1);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectSuggestion = (name: string) => {
    onChange(name);
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Input
        placeholder={placeholder}
        className="w-full"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => {
          // Delay to allow click on suggestion
          setTimeout(() => onBlur(), 150);
        }}
        onKeyDown={(e) => {
          if (!showSuggestions || suggestions.length === 0) return;
          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightIdx(prev => Math.min(prev + 1, suggestions.length - 1));
          } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightIdx(prev => Math.max(prev - 1, 0));
          } else if (e.key === 'Enter' && highlightIdx >= 0) {
            e.preventDefault();
            selectSuggestion(suggestions[highlightIdx].name);
          } else if (e.key === 'Escape') {
            setShowSuggestions(false);
          }
        }}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        autoComplete="off"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map((ex, i) => (
            <button
              key={ex.id}
              type="button"
              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors ${
                i === highlightIdx ? 'bg-muted' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                selectSuggestion(ex.name);
              }}
            >
              <ImagePlaceholder type="exercise" size="sm" imageUrl={ex.imageUrl} />
              <div className="min-w-0">
                <p className="font-medium truncate">{ex.name}</p>
                {ex.muscleGroup && (
                  <p className="text-xs text-muted-foreground capitalize">{ex.muscleGroup}{ex.category ? ` · ${ex.category}` : ''}</p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkoutModal({ open, onOpenChange, onSave, workout }: WorkoutModalProps) {
  const { settings } = useSettings();
  const unit = getWeightUnit(settings.units);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const { exercises: catalogExercises, getImageUrl } = useExercises();
  const [lightboxImage, setLightboxImage] = useState<{ src: string; alt: string } | null>(null);

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

  // Keep per-set arrays in sync with each exercise's set count.
  useEffect(() => {
    const exercises = watchedExercises ?? [];
    exercises.forEach((ex, idx) => {
      if (!ex) return;
      const sets = Math.min(20, Math.max(1, Number(ex.sets) || 1));
      const currentReps = ex.repsPerSet ?? [];
      if (currentReps.length !== sets) {
        let next: number[];
        if (currentReps.length < sets) {
          const fill = ex.reps ?? 0;
          next = [
            ...currentReps,
            ...Array.from({ length: sets - currentReps.length }, () => (currentReps.length ? currentReps[currentReps.length - 1] : fill)),
          ];
        } else {
          next = currentReps.slice(0, sets);
        }
        setValue(`exercises.${idx}.repsPerSet`, next, { shouldValidate: true });
      }

      const currentWeight = ex.weightPerSet ?? [];
      if (currentWeight.length !== sets) {
        let next: Array<number | undefined>;
        if (currentWeight.length < sets) {
          const fill = currentWeight.length ? currentWeight[currentWeight.length - 1] : ex.weight;
          next = [...currentWeight, ...Array.from({ length: sets - currentWeight.length }, () => fill)];
        } else {
          next = currentWeight.slice(0, sets);
        }
        setValue(`exercises.${idx}.weightPerSet`, next, { shouldValidate: true });
      }
    });
  }, [watchedExercises, setValue]);

  const addSet = (exerciseIdx: number) => {
    const exercise = watchedExercises?.[exerciseIdx];
    if (!exercise) return;
    const sets = Math.min(20, Math.max(1, Number(exercise.sets) || 1));
    if (sets >= 20) return;
    const repsPerSet = exercise.repsPerSet ?? Array.from({ length: sets }, () => exercise.reps ?? 0);
    const weightPerSet = exercise.weightPerSet ?? Array.from({ length: sets }, () => exercise.weight);
    const nextReps = [...repsPerSet, repsPerSet[repsPerSet.length - 1] ?? exercise.reps ?? 0];
    const nextWeight = [...weightPerSet, weightPerSet[weightPerSet.length - 1] ?? exercise.weight];

    setValue(`exercises.${exerciseIdx}.sets`, sets + 1, { shouldValidate: true, shouldDirty: true });
    setValue(`exercises.${exerciseIdx}.repsPerSet`, nextReps, { shouldValidate: true, shouldDirty: true });
    setValue(`exercises.${exerciseIdx}.weightPerSet`, nextWeight, { shouldValidate: true, shouldDirty: true });
  };

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    const exercise = watchedExercises?.[exerciseIdx];
    if (!exercise) return;
    const sets = Math.min(20, Math.max(1, Number(exercise.sets) || 1));
    if (sets <= 1) return;
    const repsPerSet = exercise.repsPerSet ?? Array.from({ length: sets }, () => exercise.reps ?? 0);
    const weightPerSet = exercise.weightPerSet ?? Array.from({ length: sets }, () => exercise.weight);
    const nextReps = repsPerSet.filter((_, idx) => idx !== setIdx);
    const nextWeight = weightPerSet.filter((_, idx) => idx !== setIdx);

    setValue(`exercises.${exerciseIdx}.sets`, sets - 1, { shouldValidate: true, shouldDirty: true });
    setValue(`exercises.${exerciseIdx}.repsPerSet`, nextReps, { shouldValidate: true, shouldDirty: true });
    setValue(`exercises.${exerciseIdx}.weightPerSet`, nextWeight, { shouldValidate: true, shouldDirty: true });
    setValue(`exercises.${exerciseIdx}.reps`, nextReps[0] ?? 0, { shouldValidate: true, shouldDirty: true });
    setValue(`exercises.${exerciseIdx}.weight`, nextWeight.find((value) => value !== undefined), { shouldValidate: true, shouldDirty: true });
  };

  const updateSetWeight = (exerciseIdx: number, setIdx: number, value: number | undefined) => {
    const exercise = watchedExercises?.[exerciseIdx];
    if (!exercise) return;
    const sets = Math.min(20, Math.max(1, Number(exercise.sets) || 1));
    const weightPerSet = exercise.weightPerSet ?? Array.from({ length: sets }, () => exercise.weight);
    const next = [...weightPerSet];
    next[setIdx] = value;
    setValue(`exercises.${exerciseIdx}.weightPerSet`, next, { shouldValidate: true, shouldDirty: true });
    setValue(`exercises.${exerciseIdx}.weight`, next.find((item) => item !== undefined), { shouldValidate: true, shouldDirty: true });
  };

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
        date: toLocalDateString(new Date(workout.date)),
        durationMinutes: workout.durationMinutes.toString(),
        notes: workout.notes ?? '',
        exercises: workout.exercises.length
          ? workout.exercises.map((e) => {
              const repsPerSet =
                e.repsPerSet && e.repsPerSet.length === e.sets
                  ? e.repsPerSet
                  : Array.from({ length: e.sets }, () => e.reps);
              const weightPerSet =
                e.weightPerSet && e.weightPerSet.length === e.sets
                  ? e.weightPerSet
                  : Array.from({ length: e.sets }, () => e.weight);
              return { name: e.name, sets: e.sets, reps: e.reps, repsPerSet, weightPerSet, weight: e.weight };
            })
          : [defaultExercise],
      });
    } else {
      reset({ ...defaultValues, title: 'Workout', date: toLocalDateString(new Date()) });
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
      date: toLocalDateString(new Date()),
      durationMinutes: template.durationMinutes.toString(),
      notes: template.notes ?? '',
      exercises: template.exercises.length
        ? template.exercises.map((e) => {
            const repsPerSet =
              e.repsPerSet && e.repsPerSet.length === e.sets
                ? e.repsPerSet
                : Array.from({ length: e.sets }, () => e.reps);
            const weightPerSet =
              e.weightPerSet && e.weightPerSet.length === e.sets
                ? e.weightPerSet
                : Array.from({ length: e.sets }, () => e.weight);
            return { name: e.name, sets: e.sets, reps: e.reps, repsPerSet, weightPerSet, weight: e.weight };
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
      completed: false,
      exercises: exercises.map((e) => ({
        name: e.name,
        sets: e.sets,
        reps: e.reps,
        ...(e.repsPerSet && e.repsPerSet.length === e.sets ? { repsPerSet: e.repsPerSet } : undefined),
        ...(e.weightPerSet && e.weightPerSet.length === e.sets ? { weightPerSet: e.weightPerSet } : undefined),
        weight: e.weightPerSet?.find((value) => value !== undefined) ?? e.weight,
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
          ...(ex.weightPerSet && ex.weightPerSet.length === ex.sets ? { weightPerSet: ex.weightPerSet } : undefined),
          weight: ex.weightPerSet?.find((value) => value !== undefined) ?? ex.weight,
        };
      });
    onSave({
      title: data.title,
      type: data.type,
      date: parseLocalDateString(data.date),
      durationMinutes: parseInt(data.durationMinutes, 10),
      notes: data.notes,
      exercises,
      completed: workout?.completed ?? false,
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
              <div className="space-y-3">
                {fields.map((field, idx) => {
                  const setsCount = Math.min(20, Math.max(1, Number(watchedExercises?.[idx]?.sets) || 1));
                  const repsPerSet = watchedExercises?.[idx]?.repsPerSet ?? Array.from({ length: setsCount }, () => watchedExercises?.[idx]?.reps ?? 0);
                  const weightPerSet = watchedExercises?.[idx]?.weightPerSet ?? Array.from({ length: setsCount }, () => watchedExercises?.[idx]?.weight);
                  const repsError = errors.exercises?.[idx]?.repsPerSet;
                  const weightError = errors.exercises?.[idx]?.weightPerSet;
                  return (
                    <div key={field.id} className="rounded-2xl border border-border bg-card p-3 shadow-card">
                      <div className="mb-3 space-y-2">
                        <div className="relative">
                          {watchedExercises?.[idx]?.name ? (
                            <button
                              type="button"
                              onClick={() => {
                                const imgUrl = getImageUrl(watchedExercises[idx].name);
                                if (imgUrl) {
                                  setLightboxImage({ src: imgUrl, alt: watchedExercises[idx].name });
                                }
                              }}
                              className="block h-28 w-full overflow-hidden rounded-xl bg-muted transition-all hover:ring-2 hover:ring-primary/50"
                            >
                              <img
                                src={getImageUrl(watchedExercises[idx].name) ?? ''}
                                alt={watchedExercises[idx].name}
                                className="w-full h-full object-cover"
                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            </button>
                          ) : (
                            <div className="h-28 w-full rounded-xl bg-muted" />
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-2 top-2 h-8 w-8 rounded-full bg-background/80 text-muted-foreground backdrop-blur hover:text-destructive"
                            onClick={() => remove(idx)}
                            aria-label="Remove exercise"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="min-w-0 px-1">
                          <p className="text-sm font-semibold text-foreground">Exercise {idx + 1}</p>
                          <p className="text-xs text-muted-foreground">Sets, reps, and load</p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <Label className="mb-1.5 block text-xs text-muted-foreground">Exercise name</Label>
                          <Controller
                            name={`exercises.${idx}.name`}
                            control={control}
                            render={({ field: nameField }) => (
                              <ExerciseNameInput
                                value={nameField.value}
                                onChange={nameField.onChange}
                                onBlur={nameField.onBlur}
                                exercises={catalogExercises}
                                placeholder="e.g. Squat, Deadlift"
                                ariaInvalid={!!errors.exercises?.[idx]?.name}
                                ariaDescribedBy={errors.exercises?.[idx]?.name ? `exercise-${idx}-name-error` : undefined}
                              />
                            )}
                          />
                          {errors.exercises?.[idx]?.name && (
                            <p id={`exercise-${idx}-name-error`} className="text-xs text-destructive mt-1">
                              {errors.exercises[idx]?.name?.message}
                            </p>
                          )}
                        </div>

                      </div>

                      <div className="mt-3 space-y-2 rounded-xl bg-muted/50 p-2">
                        <div className="flex items-center justify-between px-1">
                          <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Sets</p>
                            <p className="text-xs text-muted-foreground">{setsCount} total</p>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-full px-3 text-xs"
                            onClick={() => addSet(idx)}
                            disabled={setsCount >= 20}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            Add set
                          </Button>
                        </div>
                        {Array.from({ length: setsCount }, (_, i) => (
                          <div key={i} className="rounded-lg bg-background/50 px-3 py-2">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-muted-foreground">Set {i + 1}</span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive"
                                onClick={() => removeSet(idx, i)}
                                disabled={setsCount <= 1}
                                aria-label={`Remove set ${i + 1}`}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <Label className="mb-1 block text-[11px] text-muted-foreground">Reps</Label>
                                <Input
                                  type="number"
                                  placeholder={`${i + 1}`}
                                  min={0}
                                  className="h-9 text-center"
                                  value={repsPerSet[i] ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                                    const next = [...(repsPerSet ?? [])];
                                    next[i] = v === undefined || Number.isNaN(v) ? 0 : v;
                                    setValue(`exercises.${idx}.repsPerSet`, next, { shouldValidate: true, shouldDirty: true });
                                    if (i === 0) {
                                      setValue(`exercises.${idx}.reps`, next[i] ?? 0, { shouldValidate: true, shouldDirty: true });
                                    }
                                  }}
                                  aria-label={`Set ${i + 1} reps`}
                                />
                              </div>
                              <div>
                                <Label className="mb-1 block text-[11px] text-muted-foreground">{`Weight (${unit})`}</Label>
                                <Input
                                  type="number"
                                  placeholder={unit}
                                  min={0}
                                  className="h-9 text-center"
                                  value={weightPerSet[i] ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value === '' ? undefined : parseFloat(e.target.value);
                                    updateSetWeight(idx, i, v === undefined || Number.isNaN(v) ? undefined : v);
                                  }}
                                  aria-label={`Set ${i + 1} weight`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {repsError && (
                        <p className="mt-2 text-xs text-destructive" aria-live="polite">
                          {repsError.message}
                        </p>
                      )}
                      {weightError && (
                        <p className="mt-2 text-xs text-destructive" aria-live="polite">
                          {weightError.message}
                        </p>
                      )}
                      {errors.exercises?.[idx]?.sets && (
                        <p className="mt-2 text-xs text-destructive" aria-live="polite">
                          {errors.exercises[idx]?.sets?.message}
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
      {lightboxImage && (
        <ImageLightbox
          open={!!lightboxImage}
          onOpenChange={(open) => { if (!open) setLightboxImage(null); }}
          src={lightboxImage.src}
          alt={lightboxImage.alt}
        />
      )}
    </Dialog>
  );
}
