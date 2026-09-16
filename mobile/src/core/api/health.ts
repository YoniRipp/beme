import { request } from './client';

/**
 * The health slice — profile, weight, water, cycle and streaks.
 *
 * Transcribed from `frontend/src/core/api/health.ts` so the two clients call the same
 * endpoints with the same parameters. Nothing here is a new endpoint: every route below is
 * already mounted (`backend/src/routes/index.ts`) and already consumed by the web client and
 * the MCP server. The Expo Home could not show a streak, a water count, a weight trend or a
 * cycle day for one mechanical reason — this file did not exist.
 *
 * EVERY READ BELOW IS BOUNDED, and that is why they take parameters. The endpoints paginate
 * only when the client asks (`backend/src/controllers/weight.ts`, via
 * `parseOptionalPagination`), so an unbounded call reads a user's entire history — critical
 * rule 6. This client bounded its reads from day one; the web's weight read was unbounded
 * until it was fixed separately, and now passes `WEIGHT_HISTORY_LIMIT` from
 * `packages/shared/src/domain/weight.ts`, the same constant this client uses. See
 * `mobile/src/hooks/useWeight.ts` and `useCycle.ts` for each bound and why it was chosen.
 */

export interface ApiProfile {
  id?: string;
  dateOfBirth?: string;
  sex?: string;
  heightCm?: number;
  currentWeight?: number;
  targetWeight?: number;
  activityLevel?: string;
  waterGoalGlasses: number;
  cycleTrackingEnabled: boolean;
  averageCycleLength?: number;
  setupCompleted: boolean;
  macroCarbs?: number;
  macroFat?: number;
  macroProtein?: number;
}

export const profileApi = {
  get: () => request<ApiProfile>('/api/profile'),
  upsert: (data: Partial<ApiProfile>) =>
    request<ApiProfile>('/api/profile', { method: 'PUT', body: data }),
};

// ─── Weight ─────────────────────────────────────────────────

export interface ApiWeightEntry {
  id: string;
  date: string;
  weight: number;
  notes?: string;
}

/**
 * Bounds for a list read. `limit`/`offset` reach SQL as LIMIT/OFFSET over the model's
 * `ORDER BY date DESC` (`backend/src/models/weight.ts:47`), so a limit returns the N most
 * recent rows — which is what a "latest weight plus a short trend" card wants, and which a
 * date window cannot promise (a user who last weighed in four months ago has nothing inside
 * a 90-day window, but still has a latest weight).
 */
export interface WeightListParams {
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export const weightApi = {
  list: (params: WeightListParams = {}) =>
    request<ApiWeightEntry[]>(`/api/weight-entries${toQuery({ ...params })}`),
  add: (data: { date: string; weight: number; notes?: string }) =>
    request<ApiWeightEntry>('/api/weight-entries', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{ date: string; weight: number; notes?: string }>) =>
    request<ApiWeightEntry>(`/api/weight-entries/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => request<void>(`/api/weight-entries/${id}`, { method: 'DELETE' }),
};

// ─── Water ──────────────────────────────────────────────────

export interface ApiWaterEntry {
  /** Absent on the zero-row the controller synthesises for a day with no entry. */
  id?: string;
  date: string;
  glasses: number;
  mlTotal: number;
}

export const waterApi = {
  /**
   * One row, keyed by date — the cheapest read in the app. The date is passed explicitly
   * rather than left to the server, whose default is `new Date().toISOString().split('T')[0]`
   * (`backend/src/controllers/water.ts:13`) — a UTC day, which is yesterday for the first
   * hours of the morning anywhere ahead of UTC. The caller passes a LOCAL calendar day.
   */
  getToday: (date?: string) => request<ApiWaterEntry>(`/api/water-entries${toQuery({ date })}`),
  upsert: (data: { date: string; glasses?: number; mlTotal?: number }) =>
    request<ApiWaterEntry>('/api/water-entries', { method: 'PUT', body: data }),
  addGlass: (date?: string) =>
    request<ApiWaterEntry>('/api/water-entries/add-glass', { method: 'POST', body: { date } }),
  removeGlass: (date?: string) =>
    request<ApiWaterEntry>('/api/water-entries/remove-glass', { method: 'POST', body: { date } }),
};

// ─── Cycle ──────────────────────────────────────────────────

export interface ApiCycleEntry {
  id: string;
  date: string;
  periodStart: boolean;
  periodEnd: boolean;
  flow?: string;
  symptoms: string[];
  notes?: string;
}

export interface CycleEntryInput {
  date: string;
  periodStart?: boolean;
  periodEnd?: boolean;
  flow?: string;
  symptoms?: string[];
  notes?: string;
}

export const cycleApi = {
  /**
   * Date-windowed, not paginated: `backend/src/models/cycle.ts:35` takes `startDate`/
   * `endDate` but no `PaginationParams`, so a window is the only bound this endpoint offers.
   */
  list: (startDate?: string, endDate?: string) =>
    request<ApiCycleEntry[]>(`/api/cycle-entries${toQuery({ startDate, endDate })}`),
  add: (data: CycleEntryInput) =>
    request<ApiCycleEntry>('/api/cycle-entries', { method: 'POST', body: data }),
  update: (id: string, data: Partial<ApiCycleEntry>) =>
    request<ApiCycleEntry>(`/api/cycle-entries/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) => request<void>(`/api/cycle-entries/${id}`, { method: 'DELETE' }),
};

// ─── Streaks ────────────────────────────────────────────────

export interface ApiStreak {
  id: string;
  type: 'workout' | 'food' | 'water' | 'weight' | 'login';
  currentCount: number;
  bestCount: number;
  lastDate: string | null;
  createdAt: string;
}

export const streakApi = {
  /** Naturally bounded: one row per streak type, five types (`backend/src/models/streak.ts:24`). */
  list: () => request<ApiStreak[]>('/api/streaks'),
};
