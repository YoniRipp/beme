/**
 * AI-powered Insights section — calls the backend Gemini endpoints
 * to show a wellness score, smart summary, highlights, and suggestions.
 */
import { useState, type FormEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Sparkles, TrendingUp, Lightbulb, AlertCircle, Search, X, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { aiInsightsApi, type SearchResult } from '@/core/api/aiInsights';
import { cn } from '@/lib/utils';

// ─── Wellness Score Ring ───────────────────────────────────────────────────────

function ScoreRing({ score }: { score: number }) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
        <text x="50" y="55" textAnchor="middle" fontSize="20" fontWeight="bold" fill={color}>
          {score}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground">Wellness Score</span>
    </div>
  );
}

// ─── Semantic Search Box ───────────────────────────────────────────────────────

const RECORD_TYPE_LABEL: Record<string, string> = {
  workout: '💪 Workout',
  food_entry: '🥗 Food',
};

function SearchBox() {
  const [query, setQuery] = useState('');
  const [submitted, setSubmitted] = useState('');

  const { data, isFetching, error } = useQuery({
    queryKey: ['semantic-search', submitted],
    queryFn: () => aiInsightsApi.search(submitted),
    enabled: submitted.length > 2,
    staleTime: 30_000,
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim().length > 2) setSubmitted(query.trim());
  };

  const clear = () => { setQuery(''); setSubmitted(''); };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Search className="w-4 h-4" />
          Search Your Data
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. leg day workouts, high calorie meals, morning runs…"
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={query.trim().length < 3 || isFetching}>
            {isFetching ? '…' : 'Search'}
          </Button>
          {submitted && (
            <Button type="button" variant="ghost" size="sm" onClick={clear}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </form>

        {error && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {(error as Error)?.message ?? 'Search unavailable.'}
          </p>
        )}

        {data && data.results.length === 0 && (
          <p className="text-sm text-muted-foreground">No matching records found.</p>
        )}

        {data && data.results.length > 0 && (
          <ul className="divide-y text-sm">
            {data.results.map((r: SearchResult) => (
              <li key={`${r.recordType}-${r.recordId}`} className="py-2 space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{RECORD_TYPE_LABEL[r.recordType] ?? r.recordType}</span>
                  <span className="text-xs text-muted-foreground">{(r.similarity * 100).toFixed(0)}% match</span>
                </div>
                <p className="text-muted-foreground line-clamp-2">{r.contentText}</p>
              </li>
            ))}
          </ul>
        )}

        <p className="text-xs text-muted-foreground">
          Powered by semantic vector search — finds results by meaning, not just keywords.
        </p>
      </CardContent>
    </Card>
  );
}

// ─── Today's Recommendations ───────────────────────────────────────────────────

function TodayRecommendations() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-today-recs'],
    queryFn: aiInsightsApi.getTodayRecommendations,
    staleTime: 30 * 60 * 1000, // 30 min — no need to refetch frequently
  });

  if (error) return null;

  const recs = [
    { icon: '💪', label: 'Workout', text: data?.workout },
    { icon: '😴', label: 'Sleep', text: data?.sleep },
    { icon: '🥗', label: 'Nutrition', text: data?.nutrition },
    { icon: '🧠', label: 'Focus', text: data?.focus },
  ].filter((r) => r.text);

  if (!isLoading && recs.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="w-4 h-4 text-amber-500" />
          Today's Recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
              <span>
                Generating recommendations
                <span className="animate-thinking-dots inline">
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </span>
              </span>
            </p>
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 rounded bg-muted/80 animate-pulse" />
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {recs.map((r) => (
              <li key={r.label} className="flex gap-2 text-sm">
                <span className="text-lg leading-none">{r.icon}</span>
                <div>
                  <span className="font-medium">{r.label}: </span>
                  <span className="text-muted-foreground">{r.text}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Section ──────────────────────────────────────────────────────────────

export function AiInsightsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: aiInsightsApi.getInsights,
    staleTime: 15 * 60 * 1000, // 15 min cache
  });

  const refreshMutation = useMutation({
    mutationFn: aiInsightsApi.refreshInsights,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      void queryClient.invalidateQueries({ queryKey: ['ai-today-recs'] });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-violet-500" />
          AI-Powered Insights
        </h2>
        <Button
          variant="outline"
          size="sm"
          disabled={isLoading || refreshMutation.isPending}
          onClick={() => refreshMutation.mutate()}
        >
          <RefreshCw
            className={cn('w-4 h-4 mr-1.5', (isLoading || refreshMutation.isPending) && 'animate-spin')}
          />
          Refresh insights
        </Button>
      </div>

      {/* Score + Summary card */}
      <Card>
        <CardContent className="pt-6">
          {isLoading || refreshMutation.isPending ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                <span>
                  Analyzing your data
                  <span className="animate-thinking-dots inline">
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </span>
                </span>
              </p>
              <div className="space-y-3">
                <div className="h-4 rounded bg-muted/80 animate-pulse w-3/4" />
                <div className="h-4 rounded bg-muted/80 animate-pulse w-full" />
                <div className="h-4 rounded bg-muted/80 animate-pulse w-2/3" />
              </div>
            </div>
          ) : error ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-destructive" />
                AI insights are temporarily unavailable. Please try refreshing.
              </p>
            </div>
          ) : data ? (
            <div className="flex gap-6 items-start flex-wrap">
              <ScoreRing score={data.score} />
              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-sm text-muted-foreground">{data.summary}</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Highlights + Suggestions side by side */}
      {data && !isLoading && !refreshMutation.isPending && (
        <div className="grid sm:grid-cols-2 gap-4">
          {data.highlights.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  Highlights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.highlights.map((h, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-green-500 mt-0.5">✓</span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {data.suggestions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Lightbulb className="w-4 h-4 text-amber-500" />
                  Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.suggestions.map((s, i) => (
                    <li key={i} className="text-sm flex gap-2">
                      <span className="text-amber-500 mt-0.5">→</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Today's Recommendations */}
      <TodayRecommendations />

      {/* Semantic Search */}
      <SearchBox />
    </div>
  );
}
