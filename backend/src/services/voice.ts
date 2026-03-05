/**
 * Voice service — Gemini parsing and action mapping.
 */
import { z } from 'zod';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { config } from '../config/index.js';
import { isDbConfigured, getPool } from '../db/index.js';
import { WORKOUT_TYPES, GOAL_TYPES, GOAL_PERIODS } from '../config/constants.js';
import { normTime } from '../utils/validation.js';
import { VOICE_TOOLS } from '../../voice/tools.js';
import { getNutritionForFoodName, unitToGrams, cacheFood } from '../models/foodSearch.js';
import { lookupAndCreateFood } from './foodLookupGemini.js';
import * as openFoodFacts from './openFoodFacts.js';
import { logError } from './appLog.js';
import { logger } from '../lib/logger.js';
import { executeActions } from './voiceExecutor.js';

/** Lenient Zod schemas for Gemini function args; invalid args are rejected and that call is skipped. */
const VOICE_ARG_SCHEMAS: Record<string, z.ZodType> = {
};

export const VOICE_PROMPT = `You are a voice assistant for a life management app. The user speaks in Hebrew or English.
Parse their message and call the appropriate function(s) for each action they want to take.

Food and drink rules:
- When the user says a food or drink name (e.g. "Diet Coke", "coffee") or "ate X" / "had X", call add_food with the food name in English.
- When the user says they ate or had a meal WITH a time range (e.g. "ate from 6 to 8", "had dinner 18:00-20:00"), call add_food with the food name and startTime/endTime in HH:MM 24h.
- When they say they ate something without a time range (e.g. "I ate today XYZ"), call ONLY add_food.
Examples: "Diet Coke" or "had a Diet Coke" → add_food only. "I ate from 6 to 8, had pasta" → add_food (pasta, startTime 18:00, endTime 20:00).
Sleep: When the user talks about sleep or waking up, use log_sleep (hours). E.g. "slept 7 hours" → log_sleep(sleepHours: 7). "slept from 6 to 8" → log_sleep(sleepHours: 2). Do NOT use add_food for sleep-related phrases.
Workouts: When the user says they worked out and gives exercises with sets/reps/weight, call add_workout with type "strength". Use title "Workout" when they do not give a workout name; when they say a program name (e.g. SS, Starting Strength) use that as title. When the user says they did a SAVED or NAMED workout without listing exercises (e.g. "I did Yoni's workout", "did my Monday routine") call add_workout with title = that workout name and exercises = [] (empty array) so the app can copy from the user's saved workout. If they add overrides (e.g. "I did Yoni's workout with 150kg squat") pass title and only the override in exercises (e.g. one exercise: Squat, weight 150). Do not use an exercise name as the workout title. Each exercise in the exercises array must use the exact exercise name the user said (e.g. Squat, Deadlift). Sets and reps: use sets × reps (e.g. 3 reps 5 sets = 5 sets of 3 reps; 3x3 = 3 sets, 3 reps). durationMinutes is optional (default 30).
Goals: Types are calories, workouts, or sleep. Periods are weekly, monthly, or yearly.
Call all relevant functions; the user may combine multiple actions in one message.`;

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
function parseDate(d: unknown, todayStr: string) {
  return (typeof d === 'string' && dateRegex.test(d)) ? d : todayStr;
}

/** Build object from args using a spec: { [outputKey]: (value) => transformedValue }. Skips when value is undefined/null or transform returns undefined. */
function mapArgs(args: Record<string, unknown>, spec: Record<string, (v: unknown) => unknown>) {
  const entries: [string, unknown][] = [];
  for (const [key, transform] of Object.entries(spec)) {
    const v = args[key];
    if (v === undefined || v === null) continue;
    const val = transform(v);
    if (val === undefined) continue;
    entries.push([key, val]);
  }
  return Object.fromEntries(entries);
}

const trim = (v: unknown) => (v != null ? String(v).trim() : undefined);
const trimOrUndefined = (v: unknown) => (v != null && String(v).trim() !== '' ? String(v).trim() : undefined);
const num = (v: unknown) => (v != null && Number.isFinite(Number(v)) ? Number(v) : undefined);
const passThrough = (v: unknown) => v;
function normExercises(v: unknown) {
  if (!Array.isArray(v)) return undefined;
  return v
    .filter((e: Record<string, unknown>) => e && typeof e.name === 'string' && (e.name as string).trim())
    .map((e: Record<string, unknown>) => ({
      name: String(e.name).trim(),
      sets: Math.max(0, Number(e.sets) || 0),
      reps: Math.max(0, Number(e.reps) || 0),
      weight: Number(e.weight) > 0 ? Number(e.weight) : undefined,
      notes: e.notes ? String(e.notes).trim() : undefined,
    }));
}

/** If name has no "uncooked"/"raw" or "cooked", append ", cooked" (default). Use "uncooked" consistently (not "raw"). Used only for fallback names (not from DB). */
function withRawOrCooked(name: unknown) {
  let s = String(name).trim();
  if (!s) return 'Unknown';
  if (/\b(raw)\b/i.test(s)) s = s.replace(/\braw\b/gi, 'uncooked');
  if (/\b(uncooked|cooked)\b/i.test(s)) return s;
  return `${s}, cooked`;
}

const EDIT_WORKOUT_SPEC = {
  workoutTitle: trimOrUndefined,
  workoutId: trimOrUndefined,
  date: passThrough,
  title: trimOrUndefined,
  type: passThrough,
  durationMinutes: num,
  notes: passThrough,
  exercises: normExercises,
};
const DELETE_WORKOUT_SPEC = {
  workoutTitle: trimOrUndefined,
  workoutId: trimOrUndefined,
  date: passThrough,
};
const EDIT_FOOD_ENTRY_SPEC = {
  foodName: trimOrUndefined,
  entryId: trimOrUndefined,
  date: passThrough,
  name: trimOrUndefined,
  calories: num,
  protein: num,
  carbs: num,
  fats: num,
};
const DELETE_FOOD_ENTRY_SPEC = {
  foodName: trimOrUndefined,
  entryId: trimOrUndefined,
  date: passThrough,
};
const EDIT_CHECK_IN_SPEC = {
  date: passThrough,
  sleepHours: num,
};
const DELETE_CHECK_IN_SPEC = { date: passThrough };
const EDIT_GOAL_SPEC = {
  goalType: passThrough,
  goalId: passThrough,
  target: num,
  period: passThrough,
};
const DELETE_GOAL_SPEC = {
  goalType: passThrough,
  goalId: passThrough,
};

function buildAddWorkout(args: Record<string, unknown>, ctx: { todayStr: string; timezone?: string }) {
  const exercises = Array.isArray(args.exercises)
    ? args.exercises
        .filter((e: Record<string, unknown>) => e && typeof e.name === 'string' && (e.name as string).trim())
        .map((e: Record<string, unknown>) => ({
          name: String(e.name).trim(),
          sets: Math.max(0, Number(e.sets) || 0),
          reps: Math.max(0, Number(e.reps) || 0),
          weight: Number(e.weight) > 0 ? Number(e.weight) : undefined,
          notes: e.notes ? String(e.notes).trim() : undefined,
        }))
    : [];
  return {
    date: parseDate(args.date, ctx.todayStr),
    title: args.title ? trim(args.title) : 'Workout',
    type: (typeof args.type === 'string' && WORKOUT_TYPES.includes(args.type)) ? args.type : 'cardio',
    durationMinutes: Number.isFinite(Number(args.durationMinutes)) && Number(args.durationMinutes) > 0 ? Number(args.durationMinutes) : 30,
    exercises,
    notes: args.notes ? trim(args.notes) : undefined,
  };
}

function buildEditWorkout(args: Record<string, unknown>) {
  return mapArgs(args, EDIT_WORKOUT_SPEC);
}
function buildDeleteWorkout(args: Record<string, unknown>) {
  return mapArgs(args, DELETE_WORKOUT_SPEC);
}

async function buildAddFood(args: Record<string, unknown>, ctx: { todayStr: string; timezone?: string }) {
  const food = args.food ? trim(args.food) : '';
  const amount = Number(args.amount);
  const numAmount = Number.isFinite(amount) && amount > 0 ? amount : 100;
  const unit = args.unit ? String(args.unit).trim().toLowerCase() : 'g';
  const action: Record<string, unknown> = {
    food,
    amount: numAmount,
    unit,
    date: parseDate(args.date, ctx.todayStr),
    startTime: normTime(args.startTime as string | undefined | null) ?? undefined,
    endTime: normTime(args.endTime as string | undefined | null) ?? undefined,
    portionAmount: numAmount,
    portionUnit: unit,
  };
  if (isDbConfigured()) {
    try {
      const pool = getPool();
      const preferUncooked = /\b(uncooked|raw)\b/i.test(food || '');
      let nutrition = await getNutritionForFoodName(pool, food || 'unknown', numAmount, unit, preferUncooked);
      let source = nutrition ? 'db' : null;
      // Tier 2: Open Food Facts API
      if (!nutrition) {
        try {
          const offResults = await openFoodFacts.searchByName(food || 'unknown', 1);
          if (offResults.length > 0) {
            const offFood = offResults[0];
            await cacheFood(pool, offFood);
            const grams = unitToGrams(numAmount, unit);
            const scale = grams / 100;
            nutrition = {
              name: offFood.name,
              calories: Math.round(offFood.calories * scale),
              protein: Math.round(offFood.protein * scale * 10) / 10,
              carbs: Math.round(offFood.carbs * scale * 10) / 10,
              fat: Math.round(offFood.fat * scale * 10) / 10,
              isLiquid: offFood.is_liquid,
            };
            source = 'off';
          }
        } catch (e) {
          logger.warn({ err: e, food }, 'add_food OFF lookup failed');
        }
      }
      // Tier 3: Gemini AI
      if (!nutrition && config.geminiApiKey) {
        const geminiRow = await lookupAndCreateFood(pool, food || 'unknown');
        if (geminiRow) {
          const ref = 100;
          const grams = unitToGrams(numAmount, unit);
          const scale = grams / ref;
          const displayName = (geminiRow.name || '').replace(/\braw\b/gi, 'uncooked');
          nutrition = {
            name: displayName,
            calories: Math.round(geminiRow.calories * scale),
            protein: Math.round(geminiRow.protein * scale * 10) / 10,
            carbs: Math.round(geminiRow.carbs * scale * 10) / 10,
            fat: Math.round(geminiRow.fat * scale * 10) / 10,
            isLiquid: Boolean(geminiRow.is_liquid),
          };
          source = 'gemini';
        }
      }
      if (nutrition) {
        action.name = nutrition.name;
        action.calories = nutrition.calories;
        action.protein = nutrition.protein;
        action.carbs = nutrition.carbs;
        action.fats = nutrition.fat;
      } else {
        action.name = withRawOrCooked(food || 'Unknown');
        action.calories = action.protein = action.carbs = action.fats = 0;
      }
    } catch (e) {
      logger.error({ err: e }, 'add_food DB lookup');
      action.name = withRawOrCooked(food || 'Unknown');
      action.calories = action.protein = action.carbs = action.fats = 0;
    }
  } else if (food) {
    action.name = withRawOrCooked(food || 'Unknown');
    action.calories = action.protein = action.carbs = action.fats = 0;
  }
  return action;
}

function buildEditFoodEntry(args: Record<string, unknown>) {
  return mapArgs(args, EDIT_FOOD_ENTRY_SPEC);
}
function buildDeleteFoodEntry(args: Record<string, unknown>) {
  return mapArgs(args, DELETE_FOOD_ENTRY_SPEC);
}

function buildLogSleep(args: Record<string, unknown>, ctx: { todayStr: string; timezone?: string }) {
  const sh = Number(args.sleepHours);
  return {
    sleepHours: Number.isFinite(sh) && sh >= 0 ? sh : 0,
    date: parseDate(args.date, ctx.todayStr),
  };
}

function buildEditCheckIn(args: Record<string, unknown>) {
  return mapArgs(args, EDIT_CHECK_IN_SPEC);
}
function buildDeleteCheckIn(args: Record<string, unknown>) {
  return mapArgs(args, DELETE_CHECK_IN_SPEC);
}

function buildAddGoal(args: Record<string, unknown>) {
  return {
    type: (typeof args.type === 'string' && GOAL_TYPES.includes(args.type)) ? args.type : 'workouts',
    target: Number.isFinite(Number(args.target)) ? Number(args.target) : 0,
    period: (typeof args.period === 'string' && GOAL_PERIODS.includes(args.period)) ? args.period : 'weekly',
  };
}

function buildEditGoal(args: Record<string, unknown>) {
  return mapArgs(args, EDIT_GOAL_SPEC);
}
function buildDeleteGoal(args: Record<string, unknown>) {
  return mapArgs(args, DELETE_GOAL_SPEC);
}

/** Handlers return { merge } or { items }. All invoked via Promise.resolve for uniform async/sync. Exported for Live API tool execution. */
export const HANDLERS: Record<string, (args: Record<string, unknown>, ctx: { todayStr: string; timezone?: string }) => Promise<{ merge?: Record<string, unknown>; items?: unknown[] }>> = {
  add_workout: (args, ctx) => Promise.resolve({ merge: buildAddWorkout(args, ctx) }),
  edit_workout: (args, _ctx) => Promise.resolve({ merge: buildEditWorkout(args) }),
  delete_workout: (args, _ctx) => Promise.resolve({ merge: buildDeleteWorkout(args) }),
  add_food: (args, ctx) => buildAddFood(args, ctx).then((merge) => ({ merge })),
  edit_food_entry: (args, _ctx) => Promise.resolve({ merge: buildEditFoodEntry(args) }),
  delete_food_entry: (args, _ctx) => Promise.resolve({ merge: buildDeleteFoodEntry(args) }),
  log_sleep: (args, ctx) => Promise.resolve({ merge: buildLogSleep(args, ctx) }),
  edit_check_in: (args, _ctx) => Promise.resolve({ merge: buildEditCheckIn(args) }),
  delete_check_in: (args, _ctx) => Promise.resolve({ merge: buildDeleteCheckIn(args) }),
  add_goal: (args, _ctx) => Promise.resolve({ merge: buildAddGoal(args) }),
  edit_goal: (args, _ctx) => Promise.resolve({ merge: buildEditGoal(args) }),
  delete_goal: (args, _ctx) => Promise.resolve({ merge: buildDeleteGoal(args) }),
};

/** True if transcript looks like a short food/drink phrase (no clear sleep/schedule/time patterns). */
function transcriptLooksLikeFood(text: string) {
  const t = (text || '').trim();
  if (t.length > 80) return false;
  const lower = t.toLowerCase();
  const hasTimePattern = /\d{1,2}:\d{2}|\d+\s*hours?|woke|slept|sleep|עד|מ-|שעות|השכמתי|ישנתי|שינה/i.test(t) || /\d+\s*to\s*\d|\d+\s*-\s*\d/.test(lower);
  if (hasTimePattern) return false;
  return true;
}

/** When Gemini blocks (safety/empty), treat transcript as add_food only if it looks like food; else return unknown and log error. */
function fallbackAddFoodFromTranscript(transcript: string, todayStr: string) {
  const name = (transcript || '').trim() || 'Unknown';
  return {
    actions: [
      {
        intent: 'add_food',
        food: name,
        amount: 100,
        unit: 'g',
        date: todayStr,
        name: withRawOrCooked(name),
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      },
    ],
  };
}

async function fallbackOrUnknown(transcript: string, todayStr: string, reason: string, userId: string | null) {
  if (transcriptLooksLikeFood(transcript)) {
    return fallbackAddFoodFromTranscript(transcript, todayStr);
  }
  await logError('Voice: no action from Gemini', { transcript: transcript?.trim?.() ?? transcript, reason }, userId);
  return { actions: [{ intent: 'unknown' }] };
}

/** Shared Gemini model initialization with safety settings. */
function getGeminiModel() {
  const genAI = new GoogleGenerativeAI(config.geminiApiKey!);
  const safetySettings = [
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  ];
  return genAI.getGenerativeModel({ model: config.geminiModel, safetySettings });
}

/** Shared logic for processing Gemini response into actions. */
async function processGeminiResponse(response: { functionCalls?: () => Array<{ name: string; args?: Record<string, unknown> }> }, ctx: { todayStr: string; timezone?: string }) {
  const functionCalls = response.functionCalls?.() ?? [];
  const actions: Record<string, unknown>[] = [];

  for (const fc of functionCalls) {
    const name = fc.name;
    const args = fc.args || {};
    const handler = HANDLERS[name];

    if (!handler) {
      logger.warn({ name }, 'Voice: unknown function');
      actions.push({ intent: 'unknown', message: `Action "${name}" is not supported` });
      continue;
    }

    const schema = VOICE_ARG_SCHEMAS[name];
    let validatedArgs = args;
    if (schema) {
      const parsed = schema.safeParse(args);
      if (!parsed.success) {
        logger.warn({ name, errors: parsed.error.flatten() }, 'Voice: invalid args');
        continue;
      }
      validatedArgs = parsed.data;
    }

    const action: Record<string, unknown> = { intent: name };
    const result_ = await handler(validatedArgs, ctx);

    if (result_.merge) Object.assign(action, result_.merge);
    if (result_.items?.length) (action as { items?: unknown[] }).items = result_.items;

    const isEmptyItems = result_.items && result_.items.length === 0;
    if (!isEmptyItems) actions.push(action);
  }

  if (actions.length === 0) {
    actions.push({ intent: 'unknown' });
  }

  return { actions };
}

/**
 * @param {string} text
 * @param {string} [lang]
 * @param {string} [userId] - For error logging
 * @param {{ today?: string, timezone?: string }} [options] - User's local today (YYYY-MM-DD) and IANA timezone for UTC conversion
 * @returns {Promise<{ actions: object[] }>}
 */
export async function parseTranscript(text: string, lang = 'auto', userId: string | null = null, options: { today?: string; timezone?: string } = {}) {
  if (!config.geminiApiKey) {
    throw new Error('Voice service not configured (missing GEMINI_API_KEY)');
  }
  const todayStr = options.today && /^\d{4}-\d{2}-\d{2}$/.test(options.today) ? options.today : new Date().toISOString().slice(0, 10);
  const ctx = { todayStr, timezone: options.timezone || undefined };
  const model = getGeminiModel();

  let result;
  try {
    result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: `${VOICE_PROMPT}\n\nUser transcript (lang: ${lang}):\n${text}` }] }],
      tools: VOICE_TOOLS as never,
    });
  } catch (e) {
    logger.error({ err: e }, 'Gemini voice parse blocked or error');
    return fallbackOrUnknown(text, todayStr, (e as Error)?.message ?? String(e), userId);
  }

  const response = result.response;
  if (!response) {
    logger.error('Gemini voice parse: empty response');
    return fallbackOrUnknown(text, todayStr, 'empty response', userId);
  }

  const { actions } = await processGeminiResponse(response as Parameters<typeof processGeminiResponse>[0], ctx);

  if (config.voiceExecuteOnServer && userId) {
    const results = await executeActions(actions as { intent: string; [key: string]: unknown }[], userId);
    return { results, actions };
  }
  return { actions };
}

/**
 * Parse audio into actions. Same logic as parseTranscript but with audio input.
 * @param {string} audioBase64 - Base64-encoded audio
 * @param {string} mimeType - e.g. "audio/webm"
 * @param {string} [userId] - For error logging
 * @param {{ today?: string, timezone?: string }} [options]
 * @returns {Promise<{ actions: object[] }>}
 */
export async function parseAudio(audioBase64: string, mimeType: string, userId: string | null = null, options: { today?: string; timezone?: string } = {}) {
  if (!config.geminiApiKey) {
    throw new Error('Voice service not configured (missing GEMINI_API_KEY)');
  }
  const todayStr = options.today && /^\d{4}-\d{2}-\d{2}$/.test(options.today) ? options.today : new Date().toISOString().slice(0, 10);
  const ctx = { todayStr, timezone: options.timezone || undefined };
  const model = getGeminiModel();

  let result;
  try {
    result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: audioBase64 } },
          { text: VOICE_PROMPT },
        ],
      }],
      tools: VOICE_TOOLS as never,
    });
  } catch (e) {
    logger.error({ err: e }, 'Gemini voice parse audio blocked or error');
    await logError('Voice: audio parse failed', { reason: (e as Error)?.message ?? String(e) }, userId);
    return { actions: [{ intent: 'unknown' }] };
  }

  const response = result.response;
  if (!response) {
    logger.error('Gemini voice parse audio: empty response');
    return { actions: [{ intent: 'unknown' }] };
  }

  const { actions } = await processGeminiResponse(response as Parameters<typeof processGeminiResponse>[0], ctx);

  if (config.voiceExecuteOnServer && userId) {
    const results = await executeActions(actions as { intent: string; [key: string]: unknown }[], userId);
    return { results, actions };
  }
  return { actions };
}
