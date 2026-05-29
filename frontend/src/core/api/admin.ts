import { request } from './client';

export interface AppLogEntry {
  id: string;
  level: 'action' | 'error';
  message: string;
  details: Record<string, unknown> | null;
  userId: string | null;
  createdAt: string;
}

export interface LogsResponse {
  logs: AppLogEntry[];
}

export interface UserActivityEvent {
  id: string;
  eventType: string;
  eventId: string;
  summary: string;
  payload: Record<string, unknown> | null;
  createdAt: string;
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
}

export interface UserActivityResponse {
  events: UserActivityEvent[];
  nextCursor?: string;
}

export interface ApiUserSearchItem {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'trainer';
  createdAt?: string;
}

export interface PaginatedResponse<T = Record<string, unknown>> {
  data: T[];
  total: number;
}

function buildActivityQuery(opts: {
  limit?: number;
  before?: string;
  from: string;
  to: string;
  userId?: string;
  eventType?: string;
}) {
  const params = new URLSearchParams();
  params.set('from', opts.from);
  params.set('to', opts.to);
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.before) params.set('before', opts.before);
  if (opts.userId) params.set('userId', opts.userId);
  if (opts.eventType) params.set('eventType', opts.eventType);
  return params.toString();
}

export interface BusinessOverview {
  totalUsers: number;
  newUsersThisWeek: number;
  proSubscribers: number;
  totalTrainers: number;
  totalTrainees: number;
  activeTrainerClientLinks: number;
  activeTrainersWithClients: number;
  pendingTrainerInvites: number;
  monthlyProSubscribers: number;
  yearlyProSubscribers: number;
  selfPaidSubscribers: number;
  trainerGrantedSubscribers: number;
  churned: number;
  voiceCallsThisMonth: number;
  weeklyActiveUsers: number;
}

export interface VoiceHeavyUser {
  id: string;
  name: string;
  email: string;
  subscriptionStatus: string;
  voiceCalls: number;
  lastActive: string;
}

export interface AdminRecentErrors {
  count: number;
  lastErrorMessage: string | null;
}

export interface AdminStatsResponse {
  overview: BusinessOverview;
  userGrowth: Array<{ date: string; count: number }>;
  dailyVoiceCalls: Array<{ date: string; calls: number }>;
  subscriptionBreakdown: Array<{ label: string; count: number }>;
  trainerGrowth: Array<{ date: string; newTrainers: number; newTrainees: number }>;
  voiceHeavyUsers: VoiceHeavyUser[];
  recentErrors: AdminRecentErrors;
}

// ─── Observability / Telemetry ──────────────────────────────
export interface LatencyStats {
  count?: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms?: number;
  maxMs?: number;
}

export interface RouteMetric {
  route: string;
  total: number;
  statusCounts: Record<string, number>;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
}

export interface SlowQuery {
  sql: string;
  durationMs: number;
  timestamp: number;
}

export interface MetricsResponse {
  uptime: { seconds: number; startedAt: string };
  http: { routes: RouteMetric[]; totalRequests: number };
  db: {
    totalQueries: number;
    avgMs: number;
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    maxMs: number;
    errors: number;
    slowQueries: SlowQuery[];
  };
  errors: { total: number; byCode: Record<string, number> };
  events: {
    published: number;
    processed: number;
    failed: number;
    handlers: Record<string, { count: number; avgMs: number; p50Ms: number; p95Ms: number; maxMs: number }>;
  };
  cache: { hits: number; misses: number; hitRate: number };
  voiceJobs: { completed: number; failed: number; latency: LatencyStats };
  foodLookups: { bySource: Record<string, number>; total: number };
  gemini: { totalCalls: number; errors: number; latency: LatencyStats };
  redis: { reconnects: number };
  system: {
    memoryMb: { rss: number; heapUsed: number; heapTotal: number; external: number };
    nodeVersion: string;
    pid: number;
    cpuUsage: { user: number; system: number };
  };
}

export interface QueueCounts {
  name: string;
  waiting?: number;
  active?: number;
  completed?: number;
  failed?: number;
  delayed?: number;
}

export interface QueuesResponse {
  events?: QueueCounts;
  eventsDlq?: QueueCounts;
}

export interface AdminGeminiFood {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  isLiquid: boolean;
  imageUrl: string | null;
  verified: boolean;
  verifiedAt: string | null;
  createdAt: string;
}

export interface GeminiFoodsResponse {
  foods: AdminGeminiFood[];
  total: number;
}

export const adminApi = {
  getLogs: (level: 'action' | 'error') =>
    request<LogsResponse>(`/api/admin/logs?level=${level}`).then((r) => r.logs),

  getActivity: (opts: {
    limit?: number;
    before?: string;
    from: string;
    to: string;
    userId?: string;
    eventType?: string;
  }) => request<UserActivityResponse>(`/api/admin/activity?${buildActivityQuery(opts)}`),

  searchUsers: (q: string, limit = 20) =>
    request<ApiUserSearchItem[]>(`/api/admin/users/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  getStats: () => request<AdminStatsResponse>('/api/admin/stats'),

  getMetrics: () => request<MetricsResponse>('/api/admin/metrics'),

  getQueues: () => request<QueuesResponse>('/api/admin/queues'),

  getGeminiFoods: (status: 'all' | 'verified' | 'unverified' = 'all', limit = 50, offset = 0) =>
    request<GeminiFoodsResponse>(`/api/admin/foods/gemini?status=${status}&limit=${limit}&offset=${offset}`),

  updateFood: (id: string, data: { name?: string; calories?: number; protein?: number; carbs?: number; fat?: number; verified?: boolean }) =>
    request<AdminGeminiFood>(`/api/admin/foods/${id}`, { method: 'PATCH', body: data }),

  deleteFood: (id: string) =>
    request<{ success: boolean }>(`/api/admin/foods/${id}`, { method: 'DELETE' }),

  // ─── User Data Management ────────────────────────────────
  getUserWorkouts: (userId: string) =>
    request<PaginatedResponse>(`/api/admin/users/${userId}/workouts`),

  addUserWorkout: (userId: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/admin/users/${userId}/workouts`, { method: 'POST', body: data }),

  getUserFoodEntries: (userId: string) =>
    request<PaginatedResponse>(`/api/admin/users/${userId}/food-entries`),

  addUserFoodEntry: (userId: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/admin/users/${userId}/food-entries`, { method: 'POST', body: data }),

  getUserCheckIns: (userId: string) =>
    request<PaginatedResponse>(`/api/admin/users/${userId}/daily-check-ins`),

  addUserCheckIn: (userId: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/admin/users/${userId}/daily-check-ins`, { method: 'POST', body: data }),

  getUserGoals: (userId: string) =>
    request<PaginatedResponse>(`/api/admin/users/${userId}/goals`),

  addUserGoal: (userId: string, data: Record<string, unknown>) =>
    request<Record<string, unknown>>(`/api/admin/users/${userId}/goals`, { method: 'POST', body: data }),
};
