import { Database, RefreshCw, Bug } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MetricsResponse } from '@/core/api/admin';
import { cn } from '@/lib/utils';
import { latencyStatus } from './format';

const LATENCY_COLORS = {
  ok: 'text-emerald-600 dark:text-emerald-400',
  warn: 'text-amber-600 dark:text-amber-400',
  bad: 'text-red-600 dark:text-red-400',
  neutral: 'text-foreground',
} as const;

/** Datastore & dependency health: DB latency, slow queries, errors by code, Redis. */
export function DependenciesPanel({ metrics }: { metrics: MetricsResponse }) {
  const { db, errors, redis } = metrics;
  const errorCodes = Object.entries(errors.byCode).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Database className="h-4 w-4" /> Datastore &amp; dependencies
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <div className="text-[11px] text-muted-foreground">Queries</div>
            <div className="text-lg font-semibold tabular-nums">{db.totalQueries.toLocaleString()}</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">DB p95</div>
            <div className={cn('text-lg font-semibold tabular-nums', LATENCY_COLORS[latencyStatus(db.p95Ms)])}>{db.p95Ms} ms</div>
          </div>
          <div>
            <div className="text-[11px] text-muted-foreground">DB errors</div>
            <div className={cn('text-lg font-semibold tabular-nums', db.errors > 0 && 'text-red-600 dark:text-red-400')}>
              {db.errors.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <RefreshCw className="h-3 w-3" /> Redis reconnects
            </div>
            <div className={cn('text-lg font-semibold tabular-nums', redis.reconnects > 0 && 'text-amber-600 dark:text-amber-400')}>
              {redis.reconnects.toLocaleString()}
            </div>
          </div>
        </div>

        {errorCodes.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
              <Bug className="h-3.5 w-3.5" /> Errors by code ({errors.total.toLocaleString()} total)
            </div>
            <div className="flex flex-wrap gap-1.5">
              {errorCodes.map(([code, count]) => (
                <span key={code} className="inline-flex items-center gap-1 rounded-md border border-red-500/30 bg-red-500/5 px-2 py-0.5 text-[11px]">
                  <span className="font-mono">{code}</span>
                  <span className="tabular-nums text-muted-foreground">{count.toLocaleString()}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="text-xs font-medium text-muted-foreground mb-2">Slow queries (≥ threshold)</div>
          {db.slowQueries.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">No slow queries recorded.</p>
          ) : (
            <div className="max-h-40 overflow-y-auto rounded-md border bg-muted/20">
              <ul className="divide-y divide-border text-[11px]">
                {[...db.slowQueries].reverse().map((q, i) => (
                  <li key={`${q.timestamp}-${i}`} className="flex items-start gap-2 p-2">
                    <span className="shrink-0 font-semibold tabular-nums text-amber-600 dark:text-amber-400">{q.durationMs} ms</span>
                    <code className="font-mono break-all text-muted-foreground">{q.sql}</code>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
