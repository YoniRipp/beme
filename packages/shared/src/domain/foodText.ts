/**
 * Free-text and voice food parsing — "2 eggs and toast for breakfast" to a list of items.
 *
 * Lifted out of `frontend/src/features/energy/parseFoodText.ts`, unchanged in behaviour, for
 * the reason `CLAUDE.md` gives: code both clients need lives here. The Expo client is the one
 * running on the device with the best microphone in the product and it had no food-parsing
 * path at all, while `agent-os/standards/global/domain-conventions.md` calls voice "the
 * primary path for food logging". Everything after "get me a transcript" is this file.
 *
 * **One thing did change: the meal vocabulary.** The web parsed to `'Breakfast' | 'Lunch' |
 * 'Dinner' | 'Snack'` under the type name `MealType`, while the canonical `MealType`
 * (`types/api.ts`, and `food_entries.meal_type` in the database) is lowercase. The web
 * bridged the two with a bare `.toLowerCase()` at three separate call sites, one of which was
 * a `MEALS.find(...)` matching back the other way. Two vocabularies sharing one type name,
 * converted by string manipulation, is a bug waiting for its first mismatch, so this parses
 * to the canonical type and offers `mealLabel()` for display.
 */
import type { MealType } from '../types/api';
import { inferMealTypeFromHour } from './meals';

export interface ParsedFoodItem {
  /** The segment this item came from, so a review UI can show what was heard. */
  rawText: string;
  name: string;
  amount: number | null;
  unit: string | null;
  meal: MealType;
}

/** The start time each meal's entries get, matching the web's `MEAL_TIMES`. */
const MEAL_TIMES: Record<MealType, string> = {
  breakfast: '08:00',
  lunch: '12:30',
  snack: '15:00',
  dinner: '18:00',
};

const MEALS: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

/** Title case for display — the vocabulary the UI shows, never what the API receives. */
export function mealLabel(meal: MealType): string {
  return meal.charAt(0).toUpperCase() + meal.slice(1);
}

/** The first meal keyword named anywhere in the text, or null. */
export function matchMeal(text: string): MealType | null {
  const lower = text.toLowerCase();
  for (const meal of MEALS) {
    if (lower.includes(meal)) return meal;
  }
  return null;
}

/** Whether the text names a meal explicitly, as opposed to needing time-of-day inference. */
export function textContainsMealKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return MEALS.some((meal) => lower.includes(meal));
}

export function getMealStartTime(meal: MealType): string {
  return MEAL_TIMES[meal];
}

/**
 * The meal the current time falls in.
 *
 * Delegates to `inferMealTypeFromHour` rather than repeating its cut-offs. The web's copy had
 * the same 11/14/17 boundaries — verified before this was collapsed, not assumed — but two
 * implementations of one rule only stay equal until someone edits one of them, and that
 * module's docstring is explicit that historical entries were bucketed by these exact
 * cut-offs and must not drift.
 */
export function inferMealFromTime(now: Date = new Date()): MealType {
  return inferMealTypeFromHour(now.getHours());
}

function extractAmountAndUnit(text: string): { name: string; amount: number | null; unit: string | null } {
  const trimmed = text.trim();
  if (!trimmed) return { name: '', amount: null, unit: null };

  // "250g chicken" / "250 g chicken" — amount and unit leading.
  const prefixMatch = trimmed.match(/^(\d+\.?\d*)\s*(g|kg|ml|oz|cups?|tbsp|tsp|l)\s+(.+)$/i);
  if (prefixMatch) {
    return { name: prefixMatch[3].trim(), amount: parseFloat(prefixMatch[1]), unit: prefixMatch[2].toLowerCase() };
  }

  // "chicken breast 200g" — amount and unit trailing.
  const suffixMatch = trimmed.match(/^(.+?)\s+(\d+\.?\d*)\s*(g|kg|ml|oz|cups?|tbsp|tsp|l)$/i);
  if (suffixMatch) {
    return { name: suffixMatch[1].trim(), amount: parseFloat(suffixMatch[2]), unit: suffixMatch[3].toLowerCase() };
  }

  // "2 eggs" / "3 slices of bread" — a count, then the item.
  const countMatch = trimmed.match(/^(\d+\.?\d*)\s+(.+)$/);
  if (countMatch) {
    const count = parseFloat(countMatch[1]);
    const name = countMatch[2].trim();
    // "slices of bread" -> "bread", unit "slice".
    const ofMatch = name.match(/^(slices?|pieces?|servings?|cups?|bowls?)\s+of\s+(.+)$/i);
    if (ofMatch) {
      return { name: ofMatch[2].trim(), amount: count, unit: ofMatch[1].toLowerCase().replace(/s$/, '') };
    }
    return { name, amount: count, unit: null };
  }

  return { name: trimmed, amount: null, unit: null };
}

/**
 * Split one segment into items on commas, "and" and "with".
 *
 * This does split "mac and cheese" into two items. The web's comment says the opposite ("but
 * keep 'and' inside food names"), and the code has never done it — the intent is recorded
 * here as a known limitation rather than a claim, and the review step is what catches it.
 */
function splitItems(text: string): string[] {
  return text
    .split(/,|\band\b|\bwith\b/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

/** Parse a meal keyword captured by one of the regexes below. Always one of the four. */
const capturedMeal = (captured: string): MealType => captured.toLowerCase() as MealType;

function pushItems(into: ParsedFoodItem[], segments: string[], meal: MealType): void {
  for (const segment of segments) {
    const { name, amount, unit } = extractAmountAndUnit(segment);
    if (name) into.push({ rawText: segment, name, amount, unit, meal });
  }
}

/**
 * Parse free text into food items, one line at a time.
 *
 * Three shapes are recognised, in order: `"Breakfast: 2 eggs, toast"`, `"2 eggs for
 * breakfast"`, and comma-separated segments where a `"... for <meal>"` sets the meal for that
 * segment **and every segment after it**. That carry-forward is deliberate and is why
 * `"chicken for lunch, rice"` puts both in lunch while `"rice, chicken for lunch"` leaves
 * rice in the `snack` default — behaviour preserved exactly from the web.
 */
export function parseFoodItems(text: string): ParsedFoodItem[] {
  const items: ParsedFoodItem[] = [];
  const lines = text.split(/\n/).map((line) => line.trim()).filter(Boolean);

  for (const line of lines) {
    // "Breakfast: 2 eggs, toast"
    const colonMatch = line.match(/^(breakfast|lunch|dinner|snack)\s*:\s*(.+)$/i);
    if (colonMatch) {
      pushItems(items, splitItems(colonMatch[2]), capturedMeal(colonMatch[1]));
      continue;
    }

    // "2 eggs and toast for breakfast"
    const forMatch = line.match(/^(.+?)\s+for\s+(breakfast|lunch|dinner|snack)$/i);
    if (forMatch) {
      pushItems(items, splitItems(forMatch[1]), capturedMeal(forMatch[2]));
      continue;
    }

    // "2 eggs for breakfast, chicken for lunch" — per-segment, carrying forward.
    let currentMeal: MealType = 'snack';
    for (const segment of line.split(/,/).map((s) => s.trim()).filter(Boolean)) {
      const segmentForMatch = segment.match(/^(.+?)\s+for\s+(breakfast|lunch|dinner|snack)$/i);
      if (segmentForMatch) {
        currentMeal = capturedMeal(segmentForMatch[2]);
        pushItems(items, splitItems(segmentForMatch[1]), currentMeal);
      } else {
        pushItems(items, splitItems(segment), currentMeal);
      }
    }
  }

  return items;
}
