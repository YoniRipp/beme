import { getPool } from '../db/pool.js';

export type TrainerAnalyticsRange = '7d' | '30d' | '3m' | 'ytd' | '1y';
export type TrainerClientAnalyticsStatus = 'new' | 'good' | 'attention' | 'at_risk';

interface ClientRow {
  id: string;
  client_id: string;
  client_name: string;
  client_email: string;
  created_at: Date | string;
}

interface ActivityRow {
  user_id: string;
  date: Date | string;
}

interface FoodRow {
  user_id: string;
  date: Date | string;
  calories: string | number;
}

interface WeightRow {
  user_id: string;
  date: Date | string;
  weight: string | number;
}

interface WorkoutRow {
  user_id: string;
  date: Date | string;
  exercises: unknown;
}

export interface TrainerAnalyticsPoint {
  label: string;
  startDate: string;
  endDate: string;
}

export interface TrainerAnalytics {
  range: TrainerAnalyticsRange;
  summary: {
    totalTrainees: number;
    newTrainees: number;
    engagedPercent: number;
    atRiskCount: number;
  };
  engagementSeries: Array<TrainerAnalyticsPoint & { activeTrainees: number; engagementPercent: number }>;
  growthSeries: Array<TrainerAnalyticsPoint & { totalTrainees: number; newTrainees: number }>;
  subscriptionAgeBuckets: Array<{ label: string; count: number }>;
  progress: {
    weightDeltaAvg: number | null;
    calorieAverage: number | null;
    calorieTrendPercent: number | null;
    volumeTotal: number;
    volumeTrendPercent: number | null;
    volumeKind: 'weighted' | 'set_reps';
    series: Array<TrainerAnalyticsPoint & { weightDeltaAvg: number | null; calorieAverage: number | null; volume: number }>;
  };
  roster: Array<{
    clientId: string;
    clientName: string;
    clientEmail: string;
    status: TrainerClientAnalyticsStatus;
    subscriptionAgeDays: number;
    lastActivityAt: string | null;
    weightDelta: number | null;
    calorieAverage: number | null;
    volumeTrendPercent: number | null;
    volumeKind: 'weighted' | 'set_reps';
  }>;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function toDateKey(value: Date | string): string {
  return toDate(value).toISOString().slice(0, 10);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(start: Date, end: Date): number {
  return Math.max(0, Math.floor((startOfDay(end).getTime() - startOfDay(start).getTime()) / DAY_MS));
}

function getRangeWindow(range: TrainerAnalyticsRange) {
  const end = startOfDay(new Date());
  let start: Date;
  if (range === '7d') start = addDays(end, -6);
  else if (range === '30d') start = addDays(end, -29);
  else if (range === '3m') start = addDays(end, -89);
  else if (range === 'ytd') start = new Date(end.getFullYear(), 0, 1);
  else start = addDays(end, -364);

  const days = daysBetween(start, end) + 1;
  const previousEnd = addDays(start, -1);
  const previousStart = addDays(previousEnd, -(days - 1));
  return { start, end, previousStart, previousEnd, days };
}

function bucketLabel(start: Date, end: Date, unitDays: number): string {
  const month = new Intl.DateTimeFormat('en-US', { month: 'short' });
  if (unitDays <= 1) return `${month.format(start)} ${start.getDate()}`;
  if (start.getMonth() === end.getMonth()) return `${month.format(start)} ${start.getDate()}-${end.getDate()}`;
  return `${month.format(start)} ${start.getDate()}-${month.format(end)} ${end.getDate()}`;
}

function makeBuckets(range: TrainerAnalyticsRange, start: Date, end: Date): TrainerAnalyticsPoint[] {
  const unitDays = range === '7d' ? 1 : 7;
  const buckets: TrainerAnalyticsPoint[] = [];
  for (let cursor = startOfDay(start); cursor <= end; cursor = addDays(cursor, unitDays)) {
    const bucketStart = cursor;
    const bucketEnd = addDays(cursor, unitDays - 1) > end ? end : addDays(cursor, unitDays - 1);
    buckets.push({
      label: bucketLabel(bucketStart, bucketEnd, unitDays),
      startDate: toDateKey(bucketStart),
      endDate: toDateKey(bucketEnd),
    });
  }
  return buckets;
}

function getWeekKey(date: Date): string {
  const d = startOfDay(date);
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return toDateKey(addDays(d, mondayOffset));
}

function inPoint(date: Date, point: TrainerAnalyticsPoint): boolean {
  const key = toDateKey(date);
  return key >= point.startDate && key <= point.endDate;
}

function average(values: Array<number | null | undefined>): number | null {
  const nums = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  if (nums.length === 0) return null;
  return Math.round((nums.reduce((sum, value) => sum + value, 0) / nums.length) * 10) / 10;
}

function percentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

function parseExercises(raw: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(raw)) return raw as Array<Record<string, unknown>>;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function workoutVolume(exercises: unknown): { volume: number; weighted: boolean } {
  let volume = 0;
  let weighted = false;
  for (const exercise of parseExercises(exercises)) {
    const sets = Math.max(0, Number(exercise.sets) || 0);
    const defaultReps = Math.max(0, Number(exercise.reps) || 0);
    const repsPerSet = Array.isArray(exercise.repsPerSet) ? exercise.repsPerSet : [];
    const weightPerSet = Array.isArray(exercise.weightPerSet) ? exercise.weightPerSet : [];
    const defaultWeight = Number(exercise.weight) || 0;

    for (let i = 0; i < sets; i += 1) {
      const reps = Math.max(0, Number(repsPerSet[i]) || defaultReps);
      const weight = Math.max(0, Number(weightPerSet[i]) || defaultWeight);
      if (weight > 0) {
        volume += reps * weight;
        weighted = true;
      } else {
        volume += reps;
      }
    }
  }
  return { volume, weighted };
}

function getWeightDelta(rows: WeightRow[]): number | null {
  const sorted = [...rows].sort((a, b) => toDate(a.date).getTime() - toDate(b.date).getTime());
  if (sorted.length < 2) return null;
  return Math.round((Number(sorted[sorted.length - 1].weight) - Number(sorted[0].weight)) * 10) / 10;
}

function getAverageDailyCalories(rows: FoodRow[]): number | null {
  const byDate = new Map<string, number>();
  for (const row of rows) {
    const key = toDateKey(row.date);
    byDate.set(key, (byDate.get(key) ?? 0) + Number(row.calories));
  }
  return average([...byDate.values()]);
}

function getVolume(rows: WorkoutRow[]): { volume: number; weighted: boolean } {
  return rows.reduce<{ volume: number; weighted: boolean }>(
    (acc, row) => {
      const next = workoutVolume(row.exercises);
      return { volume: acc.volume + next.volume, weighted: acc.weighted || next.weighted };
    },
    { volume: 0, weighted: false },
  );
}

function rowsInPoint<T extends { date: Date | string }>(rows: T[], point: TrainerAnalyticsPoint): T[] {
  return rows.filter((row) => inPoint(toDate(row.date), point));
}

function getStatus(args: {
  createdAt: Date;
  activeWeeks: number;
  totalWeeks: number;
  lastActivityAt: Date | null;
  now: Date;
}): TrainerClientAnalyticsStatus {
  if (daysBetween(args.createdAt, args.now) <= 14) return 'new';
  const activeRatio = args.totalWeeks > 0 ? args.activeWeeks / args.totalWeeks : 0;
  const idleDays = args.lastActivityAt ? daysBetween(args.lastActivityAt, args.now) : Infinity;
  if (idleDays >= 14 || activeRatio < 0.25) return 'at_risk';
  if (activeRatio >= 0.6) return 'good';
  return 'attention';
}

function emptyAnalytics(range: TrainerAnalyticsRange): TrainerAnalytics {
  return {
    range,
    summary: { totalTrainees: 0, newTrainees: 0, engagedPercent: 0, atRiskCount: 0 },
    engagementSeries: [],
    growthSeries: [],
    subscriptionAgeBuckets: [
      { label: '0-30d', count: 0 },
      { label: '31-90d', count: 0 },
      { label: '3-6m', count: 0 },
      { label: '6-12m', count: 0 },
      { label: '1y+', count: 0 },
    ],
    progress: {
      weightDeltaAvg: null,
      calorieAverage: null,
      calorieTrendPercent: null,
      volumeTotal: 0,
      volumeTrendPercent: null,
      volumeKind: 'set_reps',
      series: [],
    },
    roster: [],
  };
}

export async function getTrainerAnalytics(trainerId: string, range: TrainerAnalyticsRange): Promise<TrainerAnalytics> {
  const db = getPool();
  const { start, end, previousStart, previousEnd, days } = getRangeWindow(range);
  const buckets = makeBuckets(range, start, end);

  const clientResult = await db.query<ClientRow>(
    `SELECT tc.id, tc.client_id, tc.created_at, u.name AS client_name, u.email AS client_email
     FROM trainer_clients tc
     JOIN users u ON u.id = tc.client_id
     WHERE tc.trainer_id = $1 AND tc.status = 'active'
     ORDER BY tc.created_at DESC`,
    [trainerId],
  );

  if (clientResult.rows.length === 0) {
    return { ...emptyAnalytics(range), engagementSeries: buckets.map((point) => ({ ...point, activeTrainees: 0, engagementPercent: 0 })), growthSeries: buckets.map((point) => ({ ...point, totalTrainees: 0, newTrainees: 0 })) };
  }

  const clients = clientResult.rows;
  const clientIds = clients.map((client) => client.client_id);
  const minDate = toDateKey(previousStart);
  const maxDate = toDateKey(end);

  const [activityResult, foodResult, previousFoodResult, weightResult, workoutResult, previousWorkoutResult] = await Promise.all([
    db.query<ActivityRow>(
      `SELECT user_id, date FROM workouts WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date
       UNION ALL SELECT user_id, date FROM food_entries WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date
       UNION ALL SELECT user_id, date FROM daily_check_ins WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date
       UNION ALL SELECT user_id, date FROM weight_entries WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date
       UNION ALL SELECT user_id, date FROM water_entries WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date`,
      [clientIds, minDate, maxDate],
    ),
    db.query<FoodRow>(
      `SELECT user_id, date, calories FROM food_entries WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date`,
      [clientIds, toDateKey(start), toDateKey(end)],
    ),
    db.query<FoodRow>(
      `SELECT user_id, date, calories FROM food_entries WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date`,
      [clientIds, toDateKey(previousStart), toDateKey(previousEnd)],
    ),
    db.query<WeightRow>(
      `SELECT user_id, date, weight FROM weight_entries WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date ORDER BY date ASC`,
      [clientIds, toDateKey(start), toDateKey(end)],
    ),
    db.query<WorkoutRow>(
      `SELECT user_id, date, exercises FROM workouts WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date`,
      [clientIds, toDateKey(start), toDateKey(end)],
    ),
    db.query<WorkoutRow>(
      `SELECT user_id, date, exercises FROM workouts WHERE user_id = ANY($1::uuid[]) AND date BETWEEN $2::date AND $3::date`,
      [clientIds, toDateKey(previousStart), toDateKey(previousEnd)],
    ),
  ]);

  const activityByClient = new Map<string, ActivityRow[]>();
  for (const row of activityResult.rows) {
    const rows = activityByClient.get(row.user_id) ?? [];
    rows.push(row);
    activityByClient.set(row.user_id, rows);
  }

  const totalWeeks = Math.max(1, Math.ceil(days / 7));
  const now = startOfDay(new Date());
  const roster = clients.map((client) => {
    const activities = activityByClient.get(client.client_id) ?? [];
    const rangeActivities = activities.filter((row) => toDate(row.date) >= start && toDate(row.date) <= end);
    const activeWeeks = new Set(rangeActivities.map((row) => getWeekKey(toDate(row.date)))).size;
    const lastActivityAt = activities.length > 0
      ? new Date(Math.max(...activities.map((row) => toDate(row.date).getTime())))
      : null;
    const clientFood = foodResult.rows.filter((row) => row.user_id === client.client_id);
    const clientWeight = weightResult.rows.filter((row) => row.user_id === client.client_id);
    const clientVolume = getVolume(workoutResult.rows.filter((row) => row.user_id === client.client_id));
    const previousVolume = getVolume(previousWorkoutResult.rows.filter((row) => row.user_id === client.client_id));
    const createdAt = toDate(client.created_at);
    return {
      clientId: client.client_id,
      clientName: client.client_name,
      clientEmail: client.client_email,
      status: getStatus({ createdAt, activeWeeks, totalWeeks, lastActivityAt, now }),
      subscriptionAgeDays: daysBetween(createdAt, now),
      lastActivityAt: lastActivityAt ? toDateKey(lastActivityAt) : null,
      weightDelta: getWeightDelta(clientWeight),
      calorieAverage: getAverageDailyCalories(clientFood),
      volumeTrendPercent: percentChange(clientVolume.volume, previousVolume.volume),
      volumeKind: clientVolume.weighted ? 'weighted' as const : 'set_reps' as const,
    };
  });

  const newTrainees = clients.filter((client) => toDate(client.created_at) >= start && toDate(client.created_at) <= end).length;
  const engagedCount = roster.filter((client) => client.status === 'good').length;
  const atRiskCount = roster.filter((client) => client.status === 'at_risk').length;

  const engagementSeries = buckets.map((point) => {
    const activeTrainees = new Set(activityResult.rows.filter((row) => inPoint(toDate(row.date), point)).map((row) => row.user_id)).size;
    return {
      ...point,
      activeTrainees,
      engagementPercent: clients.length > 0 ? Math.round((activeTrainees / clients.length) * 100) : 0,
    };
  });

  const growthSeries = buckets.map((point) => ({
    ...point,
    totalTrainees: clients.filter((client) => toDateKey(client.created_at) <= point.endDate).length,
    newTrainees: clients.filter((client) => inPoint(toDate(client.created_at), point)).length,
  }));

  const ageBucketCounts = { '0-30d': 0, '31-90d': 0, '3-6m': 0, '6-12m': 0, '1y+': 0 };
  for (const client of clients) {
    const age = daysBetween(toDate(client.created_at), now);
    if (age <= 30) ageBucketCounts['0-30d'] += 1;
    else if (age <= 90) ageBucketCounts['31-90d'] += 1;
    else if (age <= 180) ageBucketCounts['3-6m'] += 1;
    else if (age <= 365) ageBucketCounts['6-12m'] += 1;
    else ageBucketCounts['1y+'] += 1;
  }

  const weightDeltaAvg = average(roster.map((client) => client.weightDelta));
  const calorieAverage = getAverageDailyCalories(foodResult.rows);
  const previousCalorieAverage = getAverageDailyCalories(previousFoodResult.rows);
  const volume = getVolume(workoutResult.rows);
  const previousVolume = getVolume(previousWorkoutResult.rows);

  return {
    range,
    summary: {
      totalTrainees: clients.length,
      newTrainees,
      engagedPercent: clients.length > 0 ? Math.round((engagedCount / clients.length) * 100) : 0,
      atRiskCount,
    },
    engagementSeries,
    growthSeries,
    subscriptionAgeBuckets: Object.entries(ageBucketCounts).map(([label, count]) => ({ label, count })),
    progress: {
      weightDeltaAvg,
      calorieAverage,
      calorieTrendPercent: percentChange(calorieAverage, previousCalorieAverage),
      volumeTotal: Math.round(volume.volume),
      volumeTrendPercent: percentChange(volume.volume, previousVolume.volume),
      volumeKind: volume.weighted ? 'weighted' : 'set_reps',
      series: buckets.map((point) => {
        const bucketWeightsByClient = clients.map((client) => getWeightDelta(rowsInPoint(weightResult.rows.filter((row) => row.user_id === client.client_id), point)));
        const bucketFood = rowsInPoint(foodResult.rows, point);
        const bucketVolume = getVolume(rowsInPoint(workoutResult.rows, point));
        return {
          ...point,
          weightDeltaAvg: average(bucketWeightsByClient),
          calorieAverage: getAverageDailyCalories(bucketFood),
          volume: Math.round(bucketVolume.volume),
        };
      }),
    },
    roster,
  };
}
