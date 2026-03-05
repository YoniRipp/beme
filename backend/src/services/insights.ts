/**
 * AI Insights service — uses Gemini to generate personalized insights and recommendations
 * based on the user's actual data (workouts, food entries, sleep).
 */
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../config/index.js';
import { getPool } from '../db/pool.js';
import { logger } from '../lib/logger.js';

function getGemini() {
  if (!config.geminiApiKey) throw new Error('GEMINI_API_KEY not configured');
  return new GoogleGenerativeAI(config.geminiApiKey).getGenerativeModel({
    model: config.geminiModel,
    generationConfig: { responseMimeType: 'application/json' },
  });
}

/** Fetch a summary of the user's recent data from the DB for the past N days. */
async function fetchUserContext(userId: string, days = 30) {
  const pool = getPool();
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const [workoutResult, foodResult, sleepResult] = await Promise.all([
    pool.query(
      `SELECT type, COUNT(*)::int AS count, AVG(duration_minutes)::numeric AS avg_duration
       FROM workouts WHERE user_id = $1 AND date >= $2
       GROUP BY type`,
      [userId, sinceStr]
    ),
    pool.query(
      `SELECT SUM(calories)::numeric AS total_calories, AVG(calories)::numeric AS avg_daily_cal,
              SUM(protein)::numeric AS total_protein, COUNT(DISTINCT date)::int AS days_tracked
       FROM food_entries WHERE user_id = $1 AND date >= $2`,
      [userId, sinceStr]
    ),
    pool.query(
      `SELECT AVG(sleep_hours)::numeric AS avg_sleep, COUNT(*)::int AS days_logged
       FROM daily_check_ins WHERE user_id = $1 AND date >= $2 AND sleep_hours IS NOT NULL`,
      [userId, sinceStr]
    ),
  ]);

  return {
    workouts: workoutResult.rows,
    food: foodResult.rows[0] ?? {},
    sleep: sleepResult.rows[0] ?? {},
    periodDays: days,
  };
}

const CACHE_FRESH_HOURS = 24;

/** Get the most recent cached insight for a user. */
export async function getLastInsight(userId: string) {
  const pool = getPool();
  const result = await pool.query(
    `SELECT summary, highlights, suggestions, score, today_workout, today_sleep, today_nutrition, today_focus, created_at
     FROM ai_insights
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

/** Save generated insight to DB. */
export async function saveInsight(userId: string, data: Record<string, unknown>) {
  const pool = getPool();
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

/** Check if a cached insight is still fresh (within CACHE_FRESH_HOURS). */
export function isCacheFresh(row: Record<string, unknown> | null) {
  if (!row?.created_at) return false;
  const createdAt = new Date(row.created_at as string | number | Date);
  const cutoff = new Date();
  cutoff.setHours(cutoff.getHours() - CACHE_FRESH_HOURS);
  return createdAt >= cutoff;
}

/**
 * Get insights from cache if fresh, else generate and save.
 * @param {string} userId
 * @returns {Promise<{ main: object, today: object, cached: boolean }>}
 */
export async function getOrGenerateInsights(userId: string) {
  let cached: Record<string, unknown> | null = null;
  try {
    cached = await getLastInsight(userId);
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
  const result = await generateInsights(userId);
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
 * Force regenerate insights, ignoring cache. Used by Refresh button.
 * @param {string} userId
 * @returns {Promise<{ main: object, today: object }>}
 */
export async function refreshInsights(userId: string) {
  const result = await generateInsights(userId);
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
 * Generate AI-powered weekly insights and today's recommendations for a user.
 * Saves both to ai_insights. Returns main insights.
 * @param {string} userId
 * @returns {Promise<{ summary: string, highlights: string[], suggestions: string[], score: number, today?: object }>}
 */
export async function generateInsights(userId: string) {
  try {
    const ctx = await fetchUserContext(userId, 30);
    const model = getGemini();

    const totalWorkouts = ctx.workouts.reduce((s: number, w: Record<string, unknown>) => s + Number(w.count), 0);

    const prompt = `You are a personal wellness coach assistant. Analyze this user's last 30 days of data and return a JSON object.

Data summary:
- Workouts: ${totalWorkouts} workouts across ${ctx.workouts.map((w: Record<string, unknown>) => `${w.count} ${w.type}`).join(', ') || 'no data'}
- Nutrition: avg ${Math.round(Number(ctx.food.avg_daily_cal) || 0)} kcal/day over ${ctx.food.days_tracked || 0} tracked days, total protein ${Math.round(Number(ctx.food.total_protein) || 0)}g
- Sleep: avg ${Number(ctx.sleep.avg_sleep || 0).toFixed(1)} hours/night over ${ctx.sleep.days_logged || 0} logged nights

Return exactly this JSON structure (no markdown, raw JSON only):
{
  "summary": "2-3 sentence plain-English summary of this month",
  "highlights": ["3-5 positive bullet points (short, specific, data-driven)"],
  "suggestions": ["3-5 actionable improvement suggestions (short, specific)"],
  "score": <integer 0-100 representing overall wellness score>
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
      todayRecs = await generateTodayRecommendations(userId);
    } catch (recErr) {
      logger.warn({ err: recErr }, 'Today recommendations generation failed, saving main insights only');
    }
    await saveInsight(userId, { ...mainInsights, ...todayRecs });
    return { ...mainInsights, today: todayRecs };
  } catch (err) {
    logger.error({ err }, 'AI insights generation failed');
    return {
      summary: 'Unable to generate insights at this time.',
      highlights: [],
      suggestions: [],
      score: 0,
      today: { workout: '', sleep: '', nutrition: '', focus: '' },
    };
  }
}

/**
 * Generate personalized recommendations for today.
 * @param {string} userId
 * @returns {Promise<{ workout: string, sleep: string, nutrition: string, focus: string }>}
 */
export async function generateTodayRecommendations(userId: string) {
  try {
    const ctx = await fetchUserContext(userId, 14);
    const model = getGemini();

    const recentWorkouts = ctx.workouts.reduce((s: number, w: Record<string, unknown>) => s + Number(w.count), 0);
    const avgSleep = Number(ctx.sleep.avg_sleep || 0).toFixed(1);
    const avgCal = Math.round(Number(ctx.food.avg_daily_cal) || 0);

    const prompt = `You are a friendly wellness assistant. Based on this user's last 14 days, give them personalized recommendations for today.

Recent data:
- ${recentWorkouts} workouts in last 14 days (${ctx.workouts.map((w: Record<string, unknown>) => `${w.count} ${w.type}`).join(', ') || 'none'})
- Average sleep: ${avgSleep} hours/night
- Average daily calories: ${avgCal} kcal

Return exactly this JSON (no markdown, raw JSON):
{
  "workout": "One specific workout recommendation for today (1-2 sentences)",
  "sleep": "One specific sleep recommendation for today (1-2 sentences)",
  "nutrition": "One specific nutrition recommendation for today (1-2 sentences)",
  "focus": "One overall focus/mindset tip for today (1-2 sentences)"
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
