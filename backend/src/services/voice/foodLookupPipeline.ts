/**
 * Food lookup pipeline -- 2-tier lookup: DB -> Gemini.
 * Used by voice service to resolve food names to nutrition data.
 */
import { config } from '../../config/index.js';
import { isDbConfigured, getPool } from '../../db/index.js';
import { getNutritionForFoodName, unitToGrams } from '../../models/foodSearch.js';
import { lookupAndCreateFood } from '../foodLookupGemini.js';
import { logger } from '../../lib/logger.js';

export interface NutritionResult {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  source: 'db' | 'gemini' | 'fallback';
}

/** Default for foods that return "uncooked" or "raw" */
function normalizeRawCooked(name: string): string {
  let s = name.trim();
  if (!s) return 'Unknown';
  if (/\b(raw)\b/i.test(s)) s = s.replace(/\braw\b/gi, 'uncooked');
  if (/\b(uncooked|cooked)\b/i.test(s)) return s;
  return `${s}, cooked`;
}

/**
 * Resolve food name to nutrition data using 2-tier lookup:
 * 1. Local curated database
 * 2. Gemini AI (creates and caches the food)
 */
export async function lookupNutrition(foodName: string, amount: number, unit: string): Promise<NutritionResult> {
  const name = foodName?.trim() || 'Unknown';

  if (!isDbConfigured()) {
    return { name: normalizeRawCooked(name), calories: 0, protein: 0, carbs: 0, fats: 0, source: 'fallback' };
  }

  try {
    const pool = getPool();
    const preferUncooked = /\b(uncooked|raw)\b/i.test(name);

    // Tier 1: Local database
    const dbResult = await getNutritionForFoodName(pool, name, amount, unit, preferUncooked);
    if (dbResult) {
      return {
        name: dbResult.name,
        calories: dbResult.calories,
        protein: dbResult.protein,
        carbs: dbResult.carbs,
        fats: dbResult.fat,
        source: 'db',
      };
    }

    // Tier 2: Gemini AI
    if (config.geminiApiKey) {
      const geminiRow = await lookupAndCreateFood(pool, name);
      if (geminiRow) {
        const grams = unitToGrams(amount, unit);
        const scale = grams / 100;
        const displayName = (geminiRow.name || '').replace(/\braw\b/gi, 'uncooked');
        return {
          name: displayName,
          calories: Math.round(geminiRow.calories * scale),
          protein: Math.round(geminiRow.protein * scale * 10) / 10,
          carbs: Math.round(geminiRow.carbs * scale * 10) / 10,
          fats: Math.round(geminiRow.fat * scale * 10) / 10,
          source: 'gemini',
        };
      }
    }

    // Fallback: no nutrition data found
    return { name: normalizeRawCooked(name), calories: 0, protein: 0, carbs: 0, fats: 0, source: 'fallback' };
  } catch (e) {
    logger.error({ err: e }, 'Food lookup pipeline error');
    return { name: normalizeRawCooked(name), calories: 0, protein: 0, carbs: 0, fats: 0, source: 'fallback' };
  }
}
