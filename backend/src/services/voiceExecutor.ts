/**
 * Voice action executor — runs parsed voice actions against backend services.
 * Used when VOICE_EXECUTE_ON_SERVER is true (default). Server executes, returns results.
 *
 * Intent handlers are split into domain-specific modules under ./voice/.
 */
import { isDbConfigured } from '../db/index.js';
import { getPool } from '../db/pool.js';
import { voiceContext } from '../lib/voiceContext.js';
import { handleAddWorkout, handleEditWorkout, handleDeleteWorkout, handleAddClientWorkout, handleEditClientWorkout, handleDeleteClientWorkout } from './voice/workoutHandlers.js';
import { handleAddFood, handleEditFood, handleDeleteFood, handleAddClientFood, handleEditClientFood, handleDeleteClientFood } from './voice/foodHandlers.js';
import { handleLogSleep, handleEditCheckIn, handleDeleteCheckIn, handleLogWeight, handleEditWeight, handleDeleteWeight, handleAddWater, handleRemoveWater, handleLogCycle, handleEditCycle, handleDeleteCycle, handleUpdateProfile } from './voice/healthHandlers.js';
import { handleAddGoal, handleEditGoal, handleDeleteGoal } from './voice/goalHandlers.js';
import type { ExecuteResult, VoiceAction } from './voice/types.js';

export type { ExecuteResult } from './voice/types.js';

// ─── Intent → handler dispatch map ──────────────────────────────────────────

type IntentHandler = (userId: string, action: VoiceAction) => Promise<ExecuteResult>;

const intentHandlers: Record<string, IntentHandler> = {
  add_workout: handleAddWorkout,
  edit_workout: handleEditWorkout,
  delete_workout: handleDeleteWorkout,
  add_food: handleAddFood,
  edit_food_entry: handleEditFood,
  delete_food_entry: handleDeleteFood,
  log_sleep: handleLogSleep,
  edit_check_in: handleEditCheckIn,
  delete_check_in: handleDeleteCheckIn,
  add_goal: handleAddGoal,
  edit_goal: handleEditGoal,
  delete_goal: handleDeleteGoal,
  log_weight: handleLogWeight,
  edit_weight: handleEditWeight,
  delete_weight: handleDeleteWeight,
  add_water: handleAddWater,
  remove_water: handleRemoveWater,
  log_cycle: handleLogCycle,
  edit_cycle: handleEditCycle,
  delete_cycle: handleDeleteCycle,
  update_profile: handleUpdateProfile,
  add_client_workout: handleAddClientWorkout,
  edit_client_workout: handleEditClientWorkout,
  delete_client_workout: handleDeleteClientWorkout,
  add_client_food: handleAddClientFood,
  edit_client_food: handleEditClientFood,
  delete_client_food: handleDeleteClientFood,
};

// ─── Query user data (read-only tool for agent) ─────────────────────────────

async function queryUserData(userId: string, dataType: string, dateFrom?: string, dateTo?: string): Promise<string> {
  const pool = getPool();
  const to = dateTo && /^\d{4}-\d{2}-\d{2}$/.test(dateTo) ? dateTo : new Date().toISOString().slice(0, 10);
  const from = dateFrom && /^\d{4}-\d{2}-\d{2}$/.test(dateFrom)
    ? dateFrom
    : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  switch (dataType) {
    case 'workouts': {
      const r = await pool.query(
        `SELECT date, title, type, duration_minutes, exercises
         FROM workouts WHERE user_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date DESC LIMIT 50`,
        [userId, from, to]
      );
      if (r.rows.length === 0) return `No workouts found between ${from} and ${to}.`;
      return r.rows.map((w: Record<string, unknown>) => {
        const exercises = w.exercises as Array<{ name: string; sets?: number; reps?: number; weight?: number }> | null;
        const exList = exercises
          ? exercises.map(e => `  - ${e.name}${e.sets ? ` ${e.sets}x${e.reps ?? '?'}` : ''}${e.weight ? ` @ ${e.weight}kg` : ''}`).join('\n')
          : '';
        return `${(w.date as Date).toISOString?.().slice(0, 10) ?? w.date}: ${w.title} (${w.type}, ${w.duration_minutes}min)${exList ? '\n' + exList : ''}`;
      }).join('\n');
    }
    case 'food': {
      const r = await pool.query(
        `SELECT date, name, calories, protein, carbs, fats, portion_amount, portion_unit
         FROM food_entries WHERE user_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date DESC, created_at DESC LIMIT 100`,
        [userId, from, to]
      );
      if (r.rows.length === 0) return `No food entries found between ${from} and ${to}.`;
      return r.rows.map((f: Record<string, unknown>) => {
        const portion = f.portion_amount ? ` (${f.portion_amount}${f.portion_unit || 'g'})` : '';
        return `${(f.date as Date).toISOString?.().slice(0, 10) ?? f.date}: ${f.name}${portion} — ${f.calories} kcal, ${f.protein}g P, ${f.carbs}g C, ${f.fats}g F`;
      }).join('\n');
    }
    case 'sleep': {
      const r = await pool.query(
        `SELECT date, sleep_hours FROM daily_check_ins
         WHERE user_id = $1 AND date >= $2 AND date <= $3 AND sleep_hours IS NOT NULL
         ORDER BY date DESC LIMIT 60`,
        [userId, from, to]
      );
      if (r.rows.length === 0) return `No sleep data found between ${from} and ${to}.`;
      return r.rows.map((s: Record<string, unknown>) =>
        `${(s.date as Date).toISOString?.().slice(0, 10) ?? s.date}: ${s.sleep_hours} hours`
      ).join('\n');
    }
    case 'goals': {
      const r = await pool.query(
        `SELECT type, target, period FROM goals WHERE user_id = $1`,
        [userId]
      );
      if (r.rows.length === 0) return 'No goals set.';
      return r.rows.map((g: Record<string, unknown>) => `${g.type}: ${g.target} ${g.period}`).join('\n');
    }
    case 'weight': {
      const r = await pool.query(
        `SELECT date, weight FROM weight_entries
         WHERE user_id = $1 AND date >= $2 AND date <= $3
         ORDER BY date DESC LIMIT 60`,
        [userId, from, to]
      );
      if (r.rows.length === 0) return `No weight entries found between ${from} and ${to}.`;
      return r.rows.map((w: Record<string, unknown>) =>
        `${(w.date as Date).toISOString?.().slice(0, 10) ?? w.date}: ${w.weight}kg`
      ).join('\n');
    }
    default:
      return `Unknown data type: ${dataType}. Supported: workouts, food, sleep, goals, weight.`;
  }
}

/**
 * Execute parsed voice actions. Returns results; does not throw.
 */
export async function executeActions(actions: VoiceAction[], userId: string): Promise<ExecuteResult[]> {
  if (!isDbConfigured()) {
    return actions.map((a) => ({ intent: a.intent, success: false, message: 'Database not configured' }));
  }

  return voiceContext.run(async () => {
  const results: ExecuteResult[] = [];

  for (const action of actions) {
    if (action.intent === 'unknown') {
      results.push({ intent: 'unknown', success: false, message: (action.message as string) ?? 'Could not understand' });
      continue;
    }

    try {
      const handler = intentHandlers[action.intent];
      if (handler) {
        results.push(await handler(userId, action));
      } else {
        results.push({ intent: action.intent, success: false, message: 'Unsupported action' });
      }
    } catch (err) {
      results.push({
        intent: action.intent,
        success: false,
        message: (err as Error)?.message ?? 'An error occurred',
      });
    }
  }

  return results;
  }); // end voiceContext.run
}
