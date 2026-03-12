/**
 * AI Chat service — fitness guru agent powered by Gemini.
 * Builds comprehensive user context from all available data, maintains
 * conversation history, and can take actions (log food, workouts, goals, etc.)
 * via Gemini function calling — making this a true AI agent, not just a chatbot.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { getPool } from '../db/pool.js';
import { logger } from '../lib/logger.js';
import { fetchUserContext } from './insights.js';
import { VOICE_TOOLS } from '../../voice/tools.js';
import { executeActions, type ExecuteResult } from './voiceExecutor.js';

// ─── DB operations ─────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export async function getChatHistory(userId: string, limit = 30): Promise<ChatMessage[]> {
  const pool = getPool();
  const result = await pool.query(
    `SELECT id, role, content, created_at
     FROM chat_messages
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit]
  );
  return result.rows.reverse(); // oldest first
}

export async function saveChatMessage(userId: string, role: 'user' | 'assistant', content: string): Promise<ChatMessage> {
  const pool = getPool();
  const result = await pool.query(
    `INSERT INTO chat_messages (user_id, role, content)
     VALUES ($1, $2, $3)
     RETURNING id, role, content, created_at`,
    [userId, role, content]
  );
  return result.rows[0];
}

export async function clearChatHistory(userId: string): Promise<void> {
  const pool = getPool();
  await pool.query(`DELETE FROM chat_messages WHERE user_id = $1`, [userId]);
}

// ─── Context builder ───────────────────────────────────────────────────────────

async function buildDetailedWorkouts(userId: string): Promise<string> {
  const pool = getPool();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const result = await pool.query(
    `SELECT date, title, type, duration_minutes, exercises
     FROM workouts WHERE user_id = $1 AND date >= $2
     ORDER BY date DESC LIMIT 10`,
    [userId, since.toISOString().slice(0, 10)]
  );
  if (result.rows.length === 0) return 'Recent workouts (last 7 days): None logged.';

  const lines = result.rows.map((w: Record<string, unknown>) => {
    const exercises = w.exercises as Array<{ name: string; sets?: number; reps?: number; weight?: number }> | null;
    const exerciseList = exercises
      ? exercises.map(e => `  - ${e.name}${e.sets ? ` ${e.sets}x${e.reps ?? '?'}` : ''}${e.weight ? ` @ ${e.weight}kg` : ''}`).join('\n')
      : '  (no exercise details)';
    return `${(w.date as Date).toISOString?.().slice(0, 10) ?? w.date}: ${w.title} (${w.type}, ${w.duration_minutes}min)\n${exerciseList}`;
  });
  return `Recent workouts (last 7 days):\n${lines.join('\n')}`;
}

async function buildDetailedFood(userId: string): Promise<string> {
  const pool = getPool();
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const result = await pool.query(
    `SELECT date, SUM(calories) AS cal, SUM(protein) AS protein, SUM(carbs) AS carbs, SUM(fats) AS fats
     FROM food_entries WHERE user_id = $1 AND date >= $2
     GROUP BY date ORDER BY date DESC`,
    [userId, since.toISOString().slice(0, 10)]
  );
  if (result.rows.length === 0) return 'Recent nutrition (last 7 days): No food logged.';

  const lines = result.rows.map((d: Record<string, unknown>) =>
    `${(d.date as Date).toISOString?.().slice(0, 10) ?? d.date}: ${d.cal} kcal, ${d.protein}g protein, ${d.carbs}g carbs, ${d.fats}g fat`
  );
  return `Recent daily nutrition (last 7 days):\n${lines.join('\n')}`;
}

export async function buildChatSystemPrompt(userId: string): Promise<string> {
  const ctx = await fetchUserContext(userId, 30);
  const [detailedWorkouts, detailedFood] = await Promise.all([
    buildDetailedWorkouts(userId),
    buildDetailedFood(userId),
  ]);

  // Profile block
  const p = ctx.profile;
  const profileLines: string[] = [];
  if (p.sex) profileLines.push(`Sex: ${p.sex}`);
  if (p.date_of_birth) {
    const age = Math.floor((Date.now() - new Date(p.date_of_birth as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    profileLines.push(`Age: ${age}`);
  }
  if (p.height_cm) profileLines.push(`Height: ${p.height_cm}cm`);
  if (p.current_weight) profileLines.push(`Current weight: ${p.current_weight}kg`);
  if (p.target_weight) profileLines.push(`Target weight: ${p.target_weight}kg`);
  if (p.activity_level) profileLines.push(`Activity level: ${p.activity_level}`);
  if (p.cycle_tracking_enabled) profileLines.push(`Cycle tracking: enabled (avg ${p.average_cycle_length ?? 28} days)`);

  // Goals
  const goalLines = ctx.goals.map((g: Record<string, unknown>) => {
    const target = Number(g.target);
    switch (g.type) {
      case 'calories': return `${target} kcal ${g.period}`;
      case 'workouts': return `${target} workouts ${g.period}`;
      case 'sleep': return `${target} hours sleep ${g.period}`;
      default: return `${g.type}: ${target} ${g.period}`;
    }
  });

  // Weight goal direction
  let weightGoal = '';
  if (p.current_weight && p.target_weight) {
    const diff = Number(p.current_weight) - Number(p.target_weight);
    if (Math.abs(diff) >= 0.5) {
      const dir = diff > 0 ? 'lose' : 'gain';
      weightGoal = `\nPrimary weight goal: ${dir} ${Math.abs(diff).toFixed(1)}kg (${p.current_weight}kg → ${p.target_weight}kg)`;
    }
  }

  // 30-day averages
  const avgCal = Math.round(Number(ctx.food.avg_daily_cal) || 0);
  const avgProtein = Math.round(Number(ctx.food.avg_daily_protein) || 0);
  const avgCarbs = Math.round(Number(ctx.food.avg_daily_carbs) || 0);
  const avgFats = Math.round(Number(ctx.food.avg_daily_fats) || 0);
  const foodDays = ctx.food.days_tracked || 0;
  const avgSleep = Number(ctx.sleep.avg_sleep || 0).toFixed(1);
  const sleepDays = ctx.sleep.days_logged || 0;
  const totalWorkouts = ctx.workouts.reduce((s: number, w: Record<string, unknown>) => s + Number(w.count), 0);
  const workoutBreakdown = ctx.workouts.map((w: Record<string, unknown>) => `${w.count} ${w.type}`).join(', ') || 'none';

  // Energy / stress / mood
  const avgStress = ctx.energy.avg_stress ? Number(ctx.energy.avg_stress).toFixed(1) : 'N/A';
  const avgEnergy = ctx.energy.avg_energy ? Number(ctx.energy.avg_energy).toFixed(1) : 'N/A';
  const mood = ctx.energy.most_common_mood || 'N/A';

  // Water
  const avgWater = ctx.water.avg_glasses ? Number(ctx.water.avg_glasses).toFixed(1) : 'N/A';

  // Weight trend
  const wt = ctx.weightTrend;
  const weightTrend = wt.start_weight && wt.end_weight
    ? `${Number(wt.start_weight).toFixed(1)}kg → ${Number(wt.end_weight).toFixed(1)}kg over ${wt.entries} weigh-ins`
    : 'No weight data';

  // Cycle
  let cycleInfo = '';
  if (ctx.cycle.length > 0) {
    const lastStart = ctx.cycle.find((c: Record<string, unknown>) => c.period_start);
    if (lastStart) {
      const startDate = (lastStart.date as Date).toISOString?.().slice(0, 10) ?? lastStart.date;
      const daysSince = Math.floor((Date.now() - new Date(startDate as string).getTime()) / (24 * 60 * 60 * 1000));
      const cycleLen = Number(p.average_cycle_length ?? 28);
      let phase = 'unknown';
      if (daysSince <= 5) phase = 'menstrual (days 1-5)';
      else if (daysSince <= 13) phase = 'follicular (days 6-13)';
      else if (daysSince <= 15) phase = 'ovulation (days 14-15)';
      else if (daysSince <= cycleLen) phase = 'luteal (days 16+)';
      cycleInfo = `\nMenstrual cycle: Last period started ${startDate} (${daysSince} days ago). Estimated phase: ${phase}.`;
    }
  }

  return `You are a world-class fitness and nutrition coach with deep expertise in exercise science, sports nutrition, sleep optimization, stress management, and overall wellness. You combine the knowledge of a certified sports nutritionist, an exercise physiologist, and a behavioral health coach.

You have a warm, knowledgeable, and direct personality. You give honest, data-driven advice — not generic motivation. You're like a trusted personal trainer who happens to know everything about the user.

You have FULL ACCESS to this user's health data. Always reference their actual numbers when giving advice. Never give generic advice when you have specific data.

═══ USER PROFILE ═══
${profileLines.length ? profileLines.join('\n') : 'Profile not set up yet'}${weightGoal}

═══ ACTIVE GOALS ═══
${goalLines.length ? goalLines.join('\n') : 'No goals set'}

═══ 30-DAY OVERVIEW ═══
- Workouts: ${totalWorkouts} total (${workoutBreakdown})
- Nutrition (daily avg over ${foodDays} tracked days): ${avgCal} kcal, ${avgProtein}g protein, ${avgCarbs}g carbs, ${avgFats}g fat
- Sleep: avg ${avgSleep} hrs/night (${sleepDays} nights logged)
- Stress: ${avgStress}/5, Energy: ${avgEnergy}/5, Mood: ${mood}
- Water: avg ${avgWater} glasses/day
- Weight trend (30d): ${weightTrend}${cycleInfo}

═══ DETAILED RECENT DATA ═══
${detailedWorkouts}

${detailedFood}

═══ RULES ═══
- ALWAYS reference the user's actual data and numbers in your responses.
- Be specific: "You averaged 1800 kcal/day but need ~2200 for your goal" NOT "try eating more".
- If the user asks about something you have data for, cite their actual numbers.
- Consider their goals in EVERY recommendation.
- If they have cycle data, factor the menstrual phase into advice (energy, recovery, nutrition needs vary by phase).
- Consider stress and energy levels when recommending workout intensity.
- Be encouraging but honest — if they're not hitting goals, say so kindly with a concrete plan.
- Keep responses concise for mobile — 2-4 short paragraphs unless they ask for detailed breakdowns.
- You can respond in Hebrew or English based on the language the user writes in.
- Today's date: ${new Date().toISOString().slice(0, 10)}`;
}

// ─── Agent response type ────────────────────────────────────────────────────

export interface AgentChatResponse {
  message: ChatMessage;
  actions: ExecuteResult[];
}

// ─── Send message (agent loop with function calling) ────────────────────────

const MAX_TOOL_ROUNDS = 5;

export async function sendMessage(userId: string, userMessage: string): Promise<AgentChatResponse> {
  // 1. Save user message
  await saveChatMessage(userId, 'user', userMessage);

  // 2. Build context and load history
  const [systemPrompt, history] = await Promise.all([
    buildChatSystemPrompt(userId),
    getChatHistory(userId, 20),
  ]);

  // 3. Build Gemini model with function-calling tools
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY not configured');
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: config.geminiModel,
    tools: VOICE_TOOLS as never,
  });

  const chat = model.startChat({
    history: [
      { role: 'user', parts: [{ text: 'System instructions: ' + systemPrompt + '\n\nYou are an AI agent — not just a chatbot. You can take actions on behalf of the user using the available tools (log food, workouts, sleep, goals, query data, etc.). When the user asks you to log, add, edit, or delete something, USE the appropriate tool to do it. When the user asks about their data, USE the query_user_data tool to look it up. After taking an action, confirm what you did in a natural, conversational way.' }] },
      { role: 'model', parts: [{ text: 'Understood. I\'m your fitness coach and assistant. I can both advise you AND take actions — log meals, workouts, sleep, manage goals, and look up your data. What would you like to do?' }] },
      ...history.slice(0, -1).map(msg => ({
        role: msg.role === 'user' ? 'user' as const : 'model' as const,
        parts: [{ text: msg.content }],
      })),
    ],
  });

  // 4. Agent loop: send message, handle function calls, repeat until text response
  const allActions: ExecuteResult[] = [];
  let responseText: string;

  try {
    let result = await chat.sendMessage(userMessage);
    let response = result.response;
    let rounds = 0;

    while (rounds < MAX_TOOL_ROUNDS) {
      const functionCalls = response.functionCalls?.() ?? [];
      if (functionCalls.length === 0) break;

      // Execute function calls via voiceExecutor
      const actions = functionCalls.map(fc => ({
        intent: fc.name,
        ...fc.args,
      }));
      const results = await executeActions(actions as { intent: string; [key: string]: unknown }[], userId);
      allActions.push(...results);

      // Send function results back to Gemini so it can generate a natural response
      const functionResponses = functionCalls.map((fc, i) => ({
        functionResponse: {
          name: fc.name,
          response: {
            success: results[i]?.success ?? false,
            message: results[i]?.message ?? 'Unknown result',
          },
        },
      }));

      result = await chat.sendMessage(functionResponses as never);
      response = result.response;
      rounds++;
    }

    responseText = response.text().trim();
  } catch (err) {
    logger.error({ err }, 'AI agent chat response failed');
    responseText = 'I apologize, but I encountered an issue. Please try again.';
  }

  // 5. Save and return assistant response with action results
  const saved = await saveChatMessage(userId, 'assistant', responseText);
  return { message: saved, actions: allActions };
}
