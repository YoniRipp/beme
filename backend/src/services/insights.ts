/**
 * AI Insights service — uses Gemini to generate personalized insights and recommendations
 * based on the user's actual data (workouts, food entries, sleep, energy, goals, profile).
 *
 * All insights use DAILY AVERAGES (never totals) and are personalized to the user's goals.
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { getPool } from '../db/pool.js';
import { logger } from '../lib/logger.js';

export function getGemini() {
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(config.geminiApiKey).getGenerativeModel({
    model: config.geminiModel,
    generationConfig: { responseMimeType: 'application/json' },
  });
}

export function getGeminiText() {
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(config.geminiApiKey).getGenerativeModel({
    model: config.geminiModel,
  });
}

// ─── User Context ──────────────────────────────────────────────────────────────

interface UserContext {
  profile: Record<string, unknown>;
  goals: Record<string, unknown>[];
  workouts: Record<string, unknown>[];
  food: Record<string, unknown>;
  sleep: Record<string, unknown>;
  energy: Record<string, unknown>;
  weightTrend: Record<string, unknown>;
  water: Record<string, unknown>;
  cycle: Record<string, unknown>[];
  periodDays: number;
}

/** Fetch a comprehensive summary of the user's data for the past N days. */
async function fetchUserContext(userId: string, days = 30): Promise<UserContext> {
  const pool = getPool();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const [
    profileResult,
    goalsResult,
    workoutResult,
    foodResult,
    sleepResult,
    energyResult,
    weightResult,
    waterResult,
    cycleResult,
  ] = await Promise.all([
    // User profile
    pool.query(
      `SELECT sex, height_cm, current_weight, target_weight, activity_level,
              date_of_birth, cycle_tracking_enabled, average_cycle_length
       FROM user_profiles WHERE user_id = $1`,
      [userId]
    ),
    // Active goals
    pool.query(
      `SELECT type, target, period FROM goals WHERE user_id = $1`,
      [userId]
    ),
    // Workout summary
    pool.query(
      `SELECT type, COUNT(*)::int AS count, AVG(duration_minutes)::numeric AS avg_duration
       FROM workouts WHERE user_id = $1 AND date >= $2
       GROUP BY type`,
      [userId, sinceStr]
    ),
    // Food: daily averages (group by date first, then avg across days)
    pool.query(
      `SELECT AVG(daily_cal)::numeric AS avg_daily_cal,
              AVG(daily_protein)::numeric AS avg_daily_protein,
              AVG(daily_carbs)::numeric AS avg_daily_carbs,
              AVG(daily_fats)::numeric AS avg_daily_fats,
              COUNT(*)::int AS days_tracked
       FROM (
         SELECT date,
                SUM(calories) AS daily_cal,
                SUM(protein) AS daily_protein,
                SUM(carbs) AS daily_carbs,
                SUM(fats) AS daily_fats
         FROM food_entries WHERE user_id = $1 AND date >= $2
         GROUP BY date
       ) daily`,
      [userId, sinceStr]
    ),
    // Sleep from daily_check_ins
    pool.query(
      `SELECT AVG(sleep_hours)::numeric AS avg_sleep, COUNT(*)::int AS days_logged
       FROM daily_check_ins WHERE user_id = $1 AND date >= $2 AND sleep_hours IS NOT NULL`,
      [userId, sinceStr]
    ),
    // Energy check-ins (stress, energy, mood, sleep quality)
    pool.query(
      `SELECT AVG(stress_level)::numeric AS avg_stress,
              AVG(energy_level)::numeric AS avg_energy,
              AVG(CASE WHEN sleep_quality = 'great' THEN 5
                       WHEN sleep_quality = 'good' THEN 4
                       WHEN sleep_quality = 'okay' THEN 3
                       WHEN sleep_quality = 'poor' THEN 2
                       WHEN sleep_quality = 'terrible' THEN 1
                       ELSE NULL END)::numeric AS avg_sleep_quality,
              mode() WITHIN GROUP (ORDER BY mood) AS most_common_mood,
              COUNT(*)::int AS days_logged
       FROM energy_checkins WHERE user_id = $1 AND date >= $2`,
      [userId, sinceStr]
    ),
    // Weight trend (earliest and latest in period)
    pool.query(
      `SELECT
        (SELECT weight FROM weight_entries WHERE user_id = $1 AND date >= $2 ORDER BY date ASC LIMIT 1) AS start_weight,
        (SELECT weight FROM weight_entries WHERE user_id = $1 AND date >= $2 ORDER BY date DESC LIMIT 1) AS end_weight,
        COUNT(*)::int AS entries
       FROM weight_entries WHERE user_id = $1 AND date >= $2`,
      [userId, sinceStr]
    ),
    // Water intake (avg daily glasses)
    pool.query(
      `SELECT AVG(glasses)::numeric AS avg_glasses, COUNT(*)::int AS days_logged
       FROM water_entries WHERE user_id = $1 AND date >= $2`,
      [userId, sinceStr]
    ),
    // Cycle entries (last 60 days regardless of period to capture full cycle)
    pool.query(
      `SELECT date, period_start, period_end, flow, symptoms
       FROM cycle_entries WHERE user_id = $1 AND date >= (NOW() - INTERVAL '60 days')::date
       ORDER BY date DESC LIMIT 30`,
      [userId]
    ),
  ]);

  return {
    profile: profileResult.rows[0] ?? {},
    goals: goalsResult.rows,
    workouts: workoutResult.rows,
    food: foodResult.rows[0] ?? {},
    sleep: sleepResult.rows[0] ?? {},
    energy: energyResult.rows[0] ?? {},
    weightTrend: weightResult.rows[0] ?? {},
    water: waterResult.rows[0] ?? {},
    cycle: cycleResult.rows,
    periodDays: days,
  };
}

// ─── Prompt helpers ────────────────────────────────────────────────────────────

function buildProfileBlock(ctx: UserContext): string {
  const p = ctx.profile;
  if (!p || Object.keys(p).length === 0) return 'User profile: Not set up yet.';

  const parts: string[] = [];
  if (p.sex) parts.push(`Sex: ${p.sex}`);
  if (p.date_of_birth) {
    const age = Math.floor((Date.now() - new Date(p.date_of_birth as string).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
    parts.push(`Age: ${age}`);
  }
  if (p.height_cm) parts.push(`Height: ${p.height_cm}cm`);
  if (p.current_weight) parts.push(`Current weight: ${p.current_weight}kg`);
  if (p.target_weight) parts.push(`Target weight: ${p.target_weight}kg`);
  if (p.activity_level) parts.push(`Activity level: ${p.activity_level}`);
  if (p.cycle_tracking_enabled) parts.push(`Cycle tracking: enabled (avg ${p.average_cycle_length ?? 28} days)`);

  return `User profile:\n- ${parts.join('\n- ')}`;
}

function buildGoalsBlock(ctx: UserContext): string {
  if (!ctx.goals.length) return 'Goals: No goals set.';

  const goalDescriptions = ctx.goals.map(g => {
    const target = Number(g.target);
    switch (g.type) {
      case 'calories': return `${target} kcal ${g.period}`;
      case 'workouts': return `${target} workouts ${g.period}`;
      case 'sleep': return `${target} hours sleep ${g.period}`;
      default: return `${g.type}: ${target} ${g.period}`;
    }
  });
  return `Goals:\n- ${goalDescriptions.join('\n- ')}`;
}

function buildWeightGoalContext(ctx: UserContext): string {
  const p = ctx.profile;
  if (!p.current_weight || !p.target_weight) return '';
  const current = Number(p.current_weight);
  const target = Number(p.target_weight);
  const diff = current - target;
  if (Math.abs(diff) < 0.5) return 'Weight goal: At target weight.';
  const direction = diff > 0 ? 'lose' : 'gain';
  return `Weight goal: ${direction} ${Math.abs(diff).toFixed(1)}kg (currently ${current}kg, target ${target}kg)`;
}

function buildDataBlock(ctx: UserContext): string {
  const days = ctx.periodDays;
  const totalWorkouts = ctx.workouts.reduce((s: number, w: Record<string, unknown>) => s + Number(w.count), 0);
  const workoutBreakdown = ctx.workouts.map((w: Record<string, unknown>) => `${w.count} ${w.type}`).join(', ') || 'none';

  const avgCal = Math.round(Number(ctx.food.avg_daily_cal) || 0);
  const avgProtein = Math.round(Number(ctx.food.avg_daily_protein) || 0);
  const avgCarbs = Math.round(Number(ctx.food.avg_daily_carbs) || 0);
  const avgFats = Math.round(Number(ctx.food.avg_daily_fats) || 0);
  const foodDays = ctx.food.days_tracked || 0;

  const avgSleep = Number(ctx.sleep.avg_sleep || 0).toFixed(1);
  const sleepDays = ctx.sleep.days_logged || 0;

  const avgStress = ctx.energy.avg_stress ? Number(ctx.energy.avg_stress).toFixed(1) : 'N/A';
  const avgEnergy = ctx.energy.avg_energy ? Number(ctx.energy.avg_energy).toFixed(1) : 'N/A';
  const avgSleepQuality = ctx.energy.avg_sleep_quality ? Number(ctx.energy.avg_sleep_quality).toFixed(1) : 'N/A';
  const mood = ctx.energy.most_common_mood || 'N/A';

  const avgWater = ctx.water.avg_glasses ? Number(ctx.water.avg_glasses).toFixed(1) : 'N/A';

  const wt = ctx.weightTrend;
  const weightLine = wt.start_weight && wt.end_weight
    ? `Weight trend: ${Number(wt.start_weight).toFixed(1)}kg → ${Number(wt.end_weight).toFixed(1)}kg (${Number(wt.entries)} weigh-ins)`
    : 'Weight trend: No data';

  let cycleLine = '';
  if (ctx.cycle.length > 0) {
    const lastPeriodStart = ctx.cycle.find((c: Record<string, unknown>) => c.period_start);
    cycleLine = lastPeriodStart
      ? `Cycle: Last period started ${(lastPeriodStart.date as Date).toISOString?.().slice(0, 10) ?? lastPeriodStart.date}`
      : 'Cycle: Tracking enabled, no recent period data';
  }

  return `Data for the last ${days} days:
- Workouts: ${totalWorkouts} total (${workoutBreakdown})
- Nutrition (daily averages over ${foodDays} tracked days): ${avgCal} kcal/day, ${avgProtein}g protein/day, ${avgCarbs}g carbs/day, ${avgFats}g fat/day
- Sleep: avg ${avgSleep} hours/night over ${sleepDays} logged nights
- Sleep quality: ${avgSleepQuality}/5, Stress level: ${avgStress}/5, Energy level: ${avgEnergy}/5
- Most common mood: ${mood}
- Water: avg ${avgWater} glasses/day
- ${weightLine}${cycleLine ? `\n- ${cycleLine}` : ''}`;
}

// ─── Cache ─────────────────────────────────────────────────────────────────────

const CACHE_FRESH_HOURS = 24;

/** Get the most recent cached insight for a user. */
export async function getLastInsight(userId: string, days?: number) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT summary, highlights, suggestions, score, today_workout, today_sleep, today_nutrition, today_focus, period_days, created_at
     FROM ai_insights
     WHERE user_id = $1 ${days != null ? 'AND period_days = $2' : ''}
     ORDER BY created_at DESC
     LIMIT 1`,
    days != null ? [userId, days] : [userId]
  );
  return result.rows[0] ?? null;
}

/** Save generated insight to DB. */
export async function saveInsight(userId: string, data: Record<string, unknown>) {
  const pool = getPool();
  // Ensure period_days column exists (added by migration); fall back to INSERT without it
  try {
    await pool.query(
      `INSERT INTO ai_insights (user_id, summary, highlights, suggestions, score, today_workout, today_sleep, today_nutrition, today_focus, period_days)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9, $10)`,
      [
        userId,
        data.summary ?? '',
        JSON.stringify(data.highlights ?? []),
        JSON.stringify(data.suggestions ?? []),
        data.score ?? 0,
        data.today_workout ?? '',
        data.today_sleep ?? '',
        data.today_nutrition ?? '',
        data.today_focus ?? '',
        data.period_days ?? 30,
      ]
    );
  } catch {
    // Fallback if period_days column doesn't exist yet
    await pool.query(
      `INSERT INTO ai_insights (user_id, summary, highlights, suggestions, score, today_workout, today_sleep, today_nutrition, today_focus)
       VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6, $7, $8, $9)`,
      [
        userId,
        data.summary ?? '',
        JSON.stringify(data.highlights ?? []),
        JSON.stringify(data.suggestions ?? []),
        data.score ?? 0,
        data.today_workout ?? '',
        data.today_sleep ?? '',
        data.today_nutrition ?? '',
        data.today_focus ?? '',
      ]
    );
  }
}

/** Check if a cached insight is still fresh (within CACHE_FRESH_HOURS). */
export function isCacheFresh(row: Record<string, unknown> | null) {
  if (!row?.created_at) return false;
  const createdAt = new Date(row.created_at as string | number | Date);
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - CACHE_FRESH_HOURS);
  return createdAt >= cutoff;
}

// ─── Generate Insights ─────────────────────────────────────────────────────────

/**
 * Get insights from cache if fresh, else generate and save.
 */
export async function getOrGenerateInsights(userId: string, days = 30) {
  let cached: Record<string, unknown> | null = null;
  try {
    cached = await getLastInsight(userId, days);
  } catch (err) {
    logger.warn({ err }, 'Failed to fetch cached insights, will regenerate');
  }
  if (cached && isCacheFresh(cached)) {
    return {
      main: {
        summary: cached.summary,
        highlights: cached.highlights ?? [],
        suggestions: cached.suggestions ?? [],
        score: Number(cached.score) ?? 0,
      },
      today: {
        workout: cached.today_workout ?? '',
        sleep: cached.today_sleep ?? '',
        nutrition: cached.today_nutrition ?? '',
        focus: cached.today_focus ?? '',
      },
      cached: true,
    };
  }
  const result = await generateInsights(userId, days);
  const main = {
    summary: result.summary,
    highlights: result.highlights ?? [],
    suggestions: result.suggestions ?? [],
    score: result.score ?? 0,
  };
  const today = result.today ?? { workout: '', sleep: '', nutrition: '', focus: '' };
  return { main, today, cached: false };
}

/**
 * Force regenerate insights, ignoring cache.
 */
export async function refreshInsights(userId: string, days = 30) {
  const result = await generateInsights(userId, days);
  const main = {
    summary: result.summary,
    highlights: result.highlights ?? [],
    suggestions: result.suggestions ?? [],
    score: result.score ?? 0,
  };
  const today = result.today ?? { workout: '', sleep: '', nutrition: '', focus: '' };
  return { main, today };
}

/**
 * Generate AI-powered insights and today's recommendations for a user.
 * All insights use DAILY AVERAGES and are personalized to user goals.
 */
export async function generateInsights(userId: string, days = 30) {
  const ctx = await fetchUserContext(userId, days);
  const model = getGemini();

  const profileBlock = buildProfileBlock(ctx);
  const goalsBlock = buildGoalsBlock(ctx);
  const weightGoal = buildWeightGoalContext(ctx);
  const dataBlock = buildDataBlock(ctx);

  const prompt = `You are an expert personal fitness and wellness coach. Analyze this user's last ${days} days of data and return personalized, goal-aware insights.

${profileBlock}
${goalsBlock}${weightGoal ? `\n${weightGoal}` : ''}

${dataBlock}

CRITICAL RULES:
- All highlights and metrics MUST use DAILY AVERAGES, NEVER totals. Say "averaged Xg protein per day" NOT "total protein of Yg".
- Tailor all suggestions to the user's specific goals (e.g., if goal is weight loss, focus on caloric deficit strategies).
- Give CONCRETE, ACTIONABLE steps — not generic advice. Reference the user's actual numbers.
- If the user has a weight goal, calculate approximate daily caloric needs and compare to their intake.
- Consider stress, energy, sleep quality, and mood when giving recommendations.
- If cycle data exists, factor menstrual phase into recommendations.

Return exactly this JSON structure (no markdown, raw JSON only):
{
  "summary": "2-3 sentence personalized summary referencing their goals and daily averages",
  "highlights": ["3-5 positive bullet points using daily averages, specific to their data"],
  "suggestions": ["3-5 actionable improvement suggestions tied to their goals with concrete numbers"],
  "score": <integer 0-100 representing overall wellness score relative to their goals>
}`;

  const result = await model.generateContent(prompt);
  const text = result.response.text().trim();
  const parsed = JSON.parse(text);
  const mainInsights = {
    summary: String(parsed.summary ?? ''),
    highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
    suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.map(String) : [],
    score: Number.isFinite(Number(parsed.score)) ? Math.min(100, Math.max(0, Math.round(Number(parsed.score)))) : 50,
  };
  let todayRecs = { workout: '', sleep: '', nutrition: '', focus: '' };
  try {
    todayRecs = await generateTodayRecommendations(userId, ctx);
  } catch (recErr) {
    logger.warn({ err: recErr }, 'Today recommendations generation failed, saving main insights only');
  }
  try {
    await saveInsight(userId, {
      ...mainInsights,
      today_workout: todayRecs.workout,
      today_sleep: todayRecs.sleep,
      today_nutrition: todayRecs.nutrition,
      today_focus: todayRecs.focus,
      period_days: days,
    });
  } catch (saveErr) {
    logger.warn({ err: saveErr }, 'Failed to cache insights, returning generated result');
  }
  return { ...mainInsights, today: todayRecs };
}

/**
 * Generate personalized recommendations for today using the already-fetched context.
 */
export async function generateTodayRecommendations(userId: string, existingCtx?: UserContext) {
  try {
    const ctx = existingCtx ?? await fetchUserContext(userId, 14);
    const model = getGemini();

    const profileBlock = buildProfileBlock(ctx);
    const goalsBlock = buildGoalsBlock(ctx);
    const weightGoal = buildWeightGoalContext(ctx);
    const dataBlock = buildDataBlock(ctx);

    const prompt = `You are an expert personal fitness coach. Based on this user's recent data, give them personalized recommendations for TODAY.

${profileBlock}
${goalsBlock}${weightGoal ? `\n${weightGoal}` : ''}

${dataBlock}

RULES:
- Recommendations must be specific to the user's goals and current data.
- Reference actual numbers from their data.
- Consider their stress, energy, and sleep quality levels.
- If they're in a caloric deficit/surplus relative to their goal, address it.
- Keep each recommendation to 1-2 sentences, actionable and concrete.

Return exactly this JSON (no markdown, raw JSON):
{
  "workout": "One specific workout recommendation for today",
  "sleep": "One specific sleep recommendation for today",
  "nutrition": "One specific nutrition recommendation for today",
  "focus": "One overall focus/mindset tip for today"
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const parsed = JSON.parse(text);
    return {
      workout: String(parsed.workout ?? ''),
      sleep: String(parsed.sleep ?? ''),
      nutrition: String(parsed.nutrition ?? ''),
      focus: String(parsed.focus ?? ''),
    };
  } catch (err) {
    logger.error({ err }, 'AI recommendations generation failed');
    return {
      workout: '',
      sleep: '',
      nutrition: '',
      focus: '',
    };
  }
}

/** Export fetchUserContext for reuse by the chat service. */
export { fetchUserContext };
