import type { RouteMetric } from '@/core/api/admin';
import type { TileStatus } from './MetricTile';

/** Human-readable uptime, e.g. "2d 4h 13m". */
export function formatUptime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0m';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (d === 0) parts.push(`${m}m`);
  return parts.join(' ') || '0m';
}

/** Sum of status-code counts within a [lo, hi) range for one route. */
export function statusBand(statusCounts: Record<string, number>, lo: number, hi: number): number {
  let sum = 0;
  for (const [code, count] of Object.entries(statusCounts)) {
    const n = Number(code);
    if (n >= lo && n < hi) sum += count;
  }
  return sum;
}

/** Error rate (4xx + 5xx) as a percentage for a route. */
export function routeErrorRate(route: RouteMetric): number {
  if (route.total === 0) return 0;
  const errs = statusBand(route.statusCounts, 400, 600);
  return (errs / route.total) * 100;
}

/** Map a latency value (ms) to a tile status using common web thresholds. */
export function latencyStatus(p95Ms: number): TileStatus {
  if (p95Ms >= 1000) return 'bad';
  if (p95Ms >= 500) return 'warn';
  return 'ok';
}

/** Map an error rate (%) to a tile status. */
export function errorRateStatus(pct: number): TileStatus {
  if (pct >= 5) return 'bad';
  if (pct >= 1) return 'warn';
  return 'ok';
}
