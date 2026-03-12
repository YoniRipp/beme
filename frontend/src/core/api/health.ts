import { request } from './client';

// ─── Profile ────────────────────────────────────────────────
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

export const weightApi = {
  list: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return request<ApiWeightEntry[]>(`/api/weight-entries${qs ? `?${qs}` : ''}`);
  },
  add: (data: { date: string; weight: number; notes?: string }) =>
    request<ApiWeightEntry>('/api/weight-entries', { method: 'POST', body: data }),
  update: (id: string, data: Partial<{ date: string; weight: number; notes?: string }>) =>
    request<ApiWeightEntry>(`/api/weight-entries/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) =>
    request<void>(`/api/weight-entries/${id}`, { method: 'DELETE' }),
};

// ─── Water ──────────────────────────────────────────────────
export interface ApiWaterEntry {
  id?: string;
  date: string;
  glasses: number;
  mlTotal: number;
}

export const waterApi = {
  getToday: (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return request<ApiWaterEntry>(`/api/water-entries${qs}`);
  },
  history: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return request<ApiWaterEntry[]>(`/api/water-entries/history${qs ? `?${qs}` : ''}`);
  },
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

export const cycleApi = {
  list: (startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    const qs = params.toString();
    return request<ApiCycleEntry[]>(`/api/cycle-entries${qs ? `?${qs}` : ''}`);
  },
  add: (data: { date: string; periodStart?: boolean; periodEnd?: boolean; flow?: string; symptoms?: string[]; notes?: string }) =>
    request<ApiCycleEntry>('/api/cycle-entries', { method: 'POST', body: data }),
  update: (id: string, data: Partial<ApiCycleEntry>) =>
    request<ApiCycleEntry>(`/api/cycle-entries/${id}`, { method: 'PATCH', body: data }),
  delete: (id: string) =>
    request<void>(`/api/cycle-entries/${id}`, { method: 'DELETE' }),
};

// ─── Streaks ─────────────────────────────────────────────────
export interface ApiStreak {
  id: string;
  type: 'workout' | 'food' | 'water' | 'weight' | 'login';
  currentCount: number;
  bestCount: number;
  lastDate: string | null;
  createdAt: string;
}

export const streakApi = {
  list: () => request<ApiStreak[]>('/api/streaks'),
};
