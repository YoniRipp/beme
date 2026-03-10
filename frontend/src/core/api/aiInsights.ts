import { request } from './client';

export interface AiInsights {
  summary: string;
  highlights: string[];
  suggestions: string[];
  score: number;
}

export interface TodayRecommendations {
  workout: string;
  sleep: string;
  nutrition: string;
  focus: string;
}

export interface DailyStat {
  date: string;
  total_calories: string;
  workout_count: number;
  sleep_hours: string | null;
}

export interface SearchResult {
  recordType: string;
  recordId: string;
  contentText: string;
  similarity: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

export interface FreshnessResponse {
  lastActivityAt: string | null;
  lastInsightAt: string | null;
  needsRefresh: boolean;
}

export const aiInsightsApi = {
  getInsights: (): Promise<AiInsights> =>
    request('/api/insights'),

  refreshInsights: (): Promise<AiInsights> =>
    request('/api/insights/refresh', { method: 'POST' }),

  getTodayRecommendations: (): Promise<TodayRecommendations> =>
    request('/api/insights/today'),

  getFreshness: (): Promise<FreshnessResponse> =>
    request('/api/insights/freshness'),

  getStats: (days = 30): Promise<{ days: number; stats: DailyStat[] }> =>
    request(`/api/insights/stats?days=${days}`),

  search: (q: string, types?: string[]): Promise<SearchResponse> =>
    request('/api/search', {
      method: 'POST',
      body: { q, types: types ?? [], limit: 10 },
    }),
};
