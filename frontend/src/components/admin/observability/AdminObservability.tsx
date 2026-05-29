import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useMetrics, useQueues } from '@/hooks/useObservability';
import { AdminLogs } from '@/components/admin/AdminLogs';
import { HealthStrip } from './HealthStrip';
import { TopRoutesTable } from './TopRoutesTable';
import { QueueHealthPanel } from './QueueHealthPanel';
import { PipelinesPanel } from './PipelinesPanel';
import { DependenciesPanel } from './DependenciesPanel';

function secondsAgo(ts: number): string {
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  return `${Math.floor(s / 60)}m ago`;
}

/**
 * Full observability dashboard for the admin "System" tab.
 * Surfaces the live runtime metrics (`/api/admin/metrics`) and queue health
 * (`/api/admin/queues`) the backend already collects, auto-refreshing every 10s.
 */
export function AdminObservability() {
  const metricsQuery = useMetrics();
  const queuesQuery = useQueues();

  const metrics = metricsQuery.data;
  const isInitialLoading = metricsQuery.isLoading && !metrics;
  const isError = metricsQuery.isError;

  const handleRefresh = () => {
    metricsQuery.refetch();
    queuesQuery.refetch();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">System &amp; Observability</h2>
          <p className="text-xs text-muted-foreground">
            Live runtime telemetry · auto-refreshes every 10s
            {metricsQuery.dataUpdatedAt > 0 && !isInitialLoading && (
              <> · updated {secondsAgo(metricsQuery.dataUpdatedAt)}</>
            )}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={metricsQuery.isFetching}>
          <RefreshCw className={cn('h-4 w-4 mr-1.5', metricsQuery.isFetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {isError ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Could not load metrics. {metricsQuery.error instanceof Error ? metricsQuery.error.message : ''}
          </CardContent>
        </Card>
      ) : isInitialLoading || !metrics ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">Loading telemetry…</CardContent>
        </Card>
      ) : (
        <>
          <HealthStrip metrics={metrics} />

          <TopRoutesTable routes={metrics.http.routes} />

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
            <QueueHealthPanel queues={queuesQuery.data} isLoading={queuesQuery.isLoading} />
            <PipelinesPanel metrics={metrics} />
          </div>

          <DependenciesPanel metrics={metrics} />
        </>
      )}

      {/* Who did what — persisted action/error logs and the per-user activity feed. */}
      <AdminLogs />
    </div>
  );
}
