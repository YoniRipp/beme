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
  role: 'admin' | 'user';
  createdAt?: string;
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

export interface AdminOverview {
  totalUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  workoutsToday: number;
  foodEntriesToday: number;
  checkInsToday: number;
  activeGoals: number;
}

export interface AdminFeatureAdoption {
  workouts: number;
  foodEntries: number;
  checkIns: number;
  goals: number;
  totalUsers: number;
}

export interface AdminRecentErrors {
  count: number;
  lastErrorMessage: string | null;
}

export interface AdminStatsResponse {
  overview: AdminOverview;
  userGrowth: Array<{ date: string; count: number }>;
  activityByDay: Array<{ date: string; workouts: number; foodEntries: number; checkIns: number }>;
  featureAdoption: AdminFeatureAdoption;
  recentErrors: AdminRecentErrors;
  tableSizes: Array<{ table: string; sizeBytes: number }>;
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
};
