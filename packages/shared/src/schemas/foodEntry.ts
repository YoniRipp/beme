import { z } from 'zod';
import { LIMITS } from '../constants';

export const foodEntryFormSchema = z.object({
  name: z.string().min(1, 'Food name is required').max(100, 'Food name cannot exceed 100 characters'),
  calories: z.string().min(1, 'Calories is required').refine(
    (v) => {
      const n = parseFloat(v);
      return !Number.isNaN(n) && n >= LIMITS.MIN_CALORIES && n <= LIMITS.MAX_CALORIES;
    },
    { message: `Calories must be between ${LIMITS.MIN_CALORIES} and ${LIMITS.MAX_CALORIES}` }
  ),
  protein: z.string().min(1, 'Protein is required').refine(
    (v) => {
      const n = parseFloat(v);
      return !Number.isNaN(n) && n >= 0 && n <= LIMITS.MAX_PROTEIN;
    },
    { message: `Protein must be between 0 and ${LIMITS.MAX_PROTEIN}g` }
  ),
  carbs: z.string().min(1, 'Carbs is required').refine(
    (v) => {
      const n = parseFloat(v);
      return !Number.isNaN(n) && n >= 0 && n <= LIMITS.MAX_CARBS;
    },
    { message: `Carbs must be between 0 and ${LIMITS.MAX_CARBS}g` }
  ),
  fats: z.string().min(1, 'Fats is required').refine(
    (v) => {
      const n = parseFloat(v);
      return !Number.isNaN(n) && n >= 0 && n <= LIMITS.MAX_FATS;
    },
    { message: `Fats must be between 0 and ${LIMITS.MAX_FATS}g` }
  ),
});

export type FoodEntryFormValues = z.infer<typeof foodEntryFormSchema>;
