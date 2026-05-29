import { Activity, AlertTriangle, Clock, Cpu, Gauge, Zap } from 'lucide-react';
import type { MetricsResponse } from '@/core/api/admin';
import { MetricTile } from './MetricTile';
import { formatUptime, errorRateStatus, latencyStatus, statusBand } from './format';

/** Top-of-page KPI strip: the at-a-glance "is the system healthy?" view. */
export function HealthStrip({ metrics }: { metrics: MetricsResponse }) {
  const totalRequests = metrics.http.totalRequests;

  // Aggregate error rate across all routes (4xx + 5xx).
  let errs = 0;
  for (const r of metrics.http.routes) errs += statusBand(r.statusCounts, 400, 600);
  const errorRate = totalRequests > 0 ? (errs / totalRequests) * 100 : 0;

  // Volume-weighted average p95 across routes (approximation for a single headline number).
  let weighted = 0;
  for (const r of metrics.http.routes) weighted += r.p95Ms * r.total;
  const p95 = totalRequests > 0 ? Math.round(weighted / totalRequests) : 0;

  const cacheTotal = metrics.cache.hits + metrics.cache.misses;
  const mem = metrics.system.memoryMb;
  const memPct = mem.heapTotal > 0 ? Math.round((mem.heapUsed / mem.heapTotal) * 100) : 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <MetricTile
        label="Uptime"
        value={formatUptime(metrics.uptime.seconds)}
        sub={`since ${new Date(metrics.uptime.startedAt).toLocaleDateString()}`}
        status="neutral"
        icon={Clock}
      />
      <MetricTile
        label="Requests"
        value={totalRequests.toLocaleString()}
        sub={`${metrics.http.routes.length} routes`}
        status="neutral"
        icon={Activity}
      />
      <MetricTile
        label="Error rate"
        value={`${errorRate.toFixed(2)}%`}
        sub={`${errs.toLocaleString()} of ${totalRequests.toLocaleString()}`}
        status={errorRateStatus(errorRate)}
        icon={AlertTriangle}
      />
      <MetricTile
        label="Latency p95"
        value={`${p95} ms`}
        sub="weighted across routes"
        status={latencyStatus(p95)}
        icon={Gauge}
      />
      <MetricTile
        label="Cache hit rate"
        value={`${metrics.cache.hitRate}%`}
        sub={cacheTotal > 0 ? `${cacheTotal.toLocaleString()} lookups` : 'no activity'}
        status={cacheTotal === 0 ? 'neutral' : metrics.cache.hitRate >= 80 ? 'ok' : metrics.cache.hitRate >= 50 ? 'warn' : 'bad'}
        icon={Zap}
      />
      <MetricTile
        label="Heap memory"
        value={`${mem.heapUsed} MB`}
        sub={`${memPct}% of ${mem.heapTotal} MB · RSS ${mem.rss} MB`}
        status={memPct >= 90 ? 'bad' : memPct >= 75 ? 'warn' : 'ok'}
        icon={Cpu}
      />
    </div>
  );
}
