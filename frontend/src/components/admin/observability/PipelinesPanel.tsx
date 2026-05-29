import { Mic, Sparkles, Radio, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MetricsResponse } from '@/core/api/admin';
import { cn } from '@/lib/utils';

function successRate(ok: number, fail: number): number {
  const total = ok + fail;
  return total > 0 ? (ok / total) * 100 : 100;
}

function rateTone(pct: number): string {
  if (pct >= 99) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 95) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

interface PipelineRowProps {
  icon: typeof Mic;
  label: string;
  ok: number;
  fail: number;
  latencyMs?: number;
  extra?: string;
}

function PipelineRow({ icon: Icon, label, ok, fail, latencyMs, extra }: PipelineRowProps) {
  const total = ok + fail;
  const pct = successRate(ok, fail);
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border p-3">
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate">{label}</span>
          <span className={cn('text-sm font-semibold tabular-nums', rateTone(pct))}>{pct.toFixed(1)}%</span>
        </div>
        <div className="mt-1 flex h-1.5 overflow-hidden rounded-full bg-muted">
          {total > 0 && <div className="bg-emerald-500" style={{ width: `${(ok / total) * 100}%` }} />}
          {total > 0 && <div className="bg-red-500" style={{ width: `${(fail / total) * 100}%` }} />}
        </div>
        <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
          <span>{total.toLocaleString()} total</span>
          <span className={fail > 0 ? 'text-red-600 dark:text-red-400' : undefined}>{fail.toLocaleString()} failed</span>
          {latencyMs != null && <span>p95 {latencyMs} ms</span>}
          {extra && <span>{extra}</span>}
        </div>
      </div>
    </div>
  );
}

/** AI & event pipelines — voice jobs, Gemini, the domain event bus, food lookups. */
export function PipelinesPanel({ metrics }: { metrics: MetricsResponse }) {
  const { voiceJobs, gemini, events, foodLookups } = metrics;
  const topSources = Object.entries(foodLookups.bySource)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Pipelines &amp; AI</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <PipelineRow
          icon={Mic}
          label="Voice jobs"
          ok={voiceJobs.completed}
          fail={voiceJobs.failed}
          latencyMs={voiceJobs.latency.p95Ms}
        />
        <PipelineRow
          icon={Sparkles}
          label="Gemini API"
          ok={Math.max(gemini.totalCalls - gemini.errors, 0)}
          fail={gemini.errors}
          latencyMs={gemini.latency.p95Ms}
        />
        <PipelineRow
          icon={Radio}
          label="Event bus"
          ok={events.processed}
          fail={events.failed}
          extra={`${events.published.toLocaleString()} published`}
        />
        <div className="rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 mb-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Food lookups by source</span>
            <span className="ml-auto text-[11px] text-muted-foreground">{foodLookups.total.toLocaleString()} total</span>
          </div>
          {topSources.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No lookups recorded yet.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {topSources.map(([source, count]) => (
                <span key={source} className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[11px]">
                  <span className="font-medium">{source}</span>
                  <span className="tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
