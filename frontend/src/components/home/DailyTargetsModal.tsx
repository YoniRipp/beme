import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { caloriesFromMacros, SUGGESTED_MACRO_TARGETS, type DailyTargets } from '@trackvibe/shared/domain';
import type { DailyTargetsInput } from '@/hooks/useDailyTargets';

/**
 * Edits every daily target on one sheet: the calorie goal and the three macro grams.
 *
 * Was `MacroGoalModal`, which edited grams only and printed a *derived* "Calorie goal:
 * N cal" line. That worked while the web computed its ring from macros. The goals table
 * owns the calorie target now, so a derived line would be a number the user watches
 * change and then does not see on Home — the exact failure this modal exists to avoid.
 * Calories is therefore a real field that writes the goals row, the derivation survives
 * only as a hint with a button that fills the field, and every input here takes effect.
 */

interface DailyTargetsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: DailyTargets;
  onSave: (targets: DailyTargetsInput) => void | Promise<void>;
}

/** Backend bounds (backend/src/schemas/routeSchemas.ts) — surfaced here so Save can't 400. */
const MACRO_MAX = { carbs: 1500, fat: 500, protein: 500 } as const;
const CALORIE_MAX = 999999;

const clampMacro = (value: number, key: keyof typeof MACRO_MAX) =>
  Math.min(Math.max(1, Math.round(value || 0)), MACRO_MAX[key]);

export function DailyTargetsModal({ open, onOpenChange, targets, onSave }: DailyTargetsModalProps) {
  // Calories is a string so "no target" (blank) stays distinct from 0.
  const [calories, setCalories] = useState('');
  const [carbs, setCarbs] = useState<number>(SUGGESTED_MACRO_TARGETS.carbs);
  const [fat, setFat] = useState<number>(SUGGESTED_MACRO_TARGETS.fat);
  const [protein, setProtein] = useState<number>(SUGGESTED_MACRO_TARGETS.protein);

  // Only reset local state when the modal transitions to open, not every
  // time `targets` reference changes (which happens on each profile render).
  useEffect(() => {
    if (open) {
      setCalories(targets.calories != null ? String(targets.calories) : '');
      setCarbs(targets.carbs ?? SUGGESTED_MACRO_TARGETS.carbs);
      setFat(targets.fat ?? SUGGESTED_MACRO_TARGETS.fat);
      setProtein(targets.protein ?? SUGGESTED_MACRO_TARGETS.protein);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const macrosAreSuggestions =
    targets.carbs == null && targets.fat == null && targets.protein == null;

  const nextMacros = {
    carbs: clampMacro(carbs, 'carbs'),
    fat: clampMacro(fat, 'fat'),
    protein: clampMacro(protein, 'protein'),
  };
  const macroCalories = caloriesFromMacros(nextMacros);
  const trimmedCalories = calories.trim();
  const parsedCalories = trimmedCalories === '' ? null : Math.round(Number(trimmedCalories));
  const caloriesInvalid =
    parsedCalories != null &&
    (!Number.isFinite(parsedCalories) || parsedCalories <= 0 || parsedCalories > CALORIE_MAX);
  const macrosDisagree =
    macroCalories != null && parsedCalories != null && macroCalories !== parsedCalories;

  const handleSave = () => {
    if (caloriesInvalid) return;
    onSave({ calories: parsedCalories, ...nextMacros });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Daily targets</DialogTitle>
          <DialogDescription>Set your daily calorie goal and macro targets.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="target-calories">Calories (kcal)</Label>
            <Input
              id="target-calories"
              type="number" inputMode="numeric"
              min={1}
              max={CALORIE_MAX}
              placeholder="No target"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              aria-invalid={caloriesInvalid || undefined}
              aria-describedby="target-calories-help"
            />
            <p id="target-calories-help" className="mt-1.5 text-xs text-muted-foreground">
              {caloriesInvalid
                ? 'Enter a calorie target above 0.'
                : 'This is your daily calorie goal — the same one on the Goals page. Leave blank for no target.'}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 border-t pt-4">
            <div>
              <Label htmlFor="macro-protein">Protein (g)</Label>
              <Input
                id="macro-protein"
                type="number" inputMode="numeric"
                min={1}
                max={MACRO_MAX.protein}
                value={protein}
                onChange={(e) => setProtein(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="macro-carbs">Carbs (g)</Label>
              <Input
                id="macro-carbs"
                type="number" inputMode="numeric"
                min={1}
                max={MACRO_MAX.carbs}
                value={carbs}
                onChange={(e) => setCarbs(parseInt(e.target.value, 10) || 0)}
              />
            </div>
            <div>
              <Label htmlFor="macro-fat">Fat (g)</Label>
              <Input
                id="macro-fat"
                type="number" inputMode="numeric"
                min={1}
                max={MACRO_MAX.fat}
                value={fat}
                onChange={(e) => setFat(parseInt(e.target.value, 10) || 0)}
              />
            </div>
          </div>

          {macrosAreSuggestions && (
            <p className="text-xs text-muted-foreground">
              Suggested starting points. Saving sets them as your macro targets.
            </p>
          )}

          {macroCalories != null && (
            <div className="flex items-center justify-between gap-3 border-t pt-3">
              <p className="text-sm text-muted-foreground">
                These macros add up to{' '}
                <span className="font-semibold text-foreground tabular-nums">{macroCalories} kcal</span>
              </p>
              {macrosDisagree || parsedCalories == null ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCalories(String(macroCalories))}
                >
                  Use as target
                </Button>
              ) : null}
            </div>
          )}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={caloriesInvalid}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
