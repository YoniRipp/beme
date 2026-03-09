/**
 * In-process metrics collector. Tracks request counts, latencies, error rates,
 * DB query stats, and system info. Exposed via GET /metrics (Prometheus text format)
 * and GET /api/admin/metrics (JSON for the admin dashboard).
 *
 * Zero external dependencies — uses simple Maps and running stats.
 */

interface LatencyBucket {
  count: number;
  totalMs: number;
  maxMs: number;
  /** Sorted sample reservoir for percentile estimation (max 200 entries). */
  samples: number[];
}

const RESERVOIR_SIZE = 200;

function emptyBucket(): LatencyBucket {
  return { count: 0, totalMs: 0, maxMs: 0, samples: [] };
}

function recordSample(bucket: LatencyBucket, ms: number) {
  bucket.count++;
  bucket.totalMs += ms;
  if (ms > bucket.maxMs) bucket.maxMs = ms;

  // Reservoir sampling (Algorithm R)
  if (bucket.samples.length < RESERVOIR_SIZE) {
    bucket.samples.push(ms);
  } else {
    const idx = Math.floor(Math.random() * bucket.count);
    if (idx < RESERVOIR_SIZE) bucket.samples[idx] = ms;
  }
}

function percentile(bucket: LatencyBucket, p: number): number {
  if (bucket.samples.length === 0) return 0;
  const sorted = [...bucket.samples].sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}

// ─── HTTP request metrics ───────────────────────────────────────────

/** Key: "METHOD /path" */
const httpRequests = new Map<string, { total: number; byStatus: Map<number, number>; latency: LatencyBucket }>();

export function recordHttpRequest(method: string, path: string, statusCode: number, durationMs: number) {
  // Normalize path: strip IDs (UUIDs and numeric) to reduce cardinality
  const normalized = path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id');
  const key = `${method} ${normalized}`;
  let entry = httpRequests.get(key);
  if (!entry) {
    entry = { total: 0, byStatus: new Map(), latency: emptyBucket() };
    httpRequests.set(key, entry);
  }
  entry.total++;
  entry.byStatus.set(statusCode, (entry.byStatus.get(statusCode) || 0) + 1);
  recordSample(entry.latency, durationMs);
}

// ─── DB query metrics ───────────────────────────────────────────────

const dbQueries: LatencyBucket = emptyBucket();
let dbErrorCount = 0;
const slowQueries: Array<{ sql: string; durationMs: number; timestamp: number }> = [];
const MAX_SLOW_QUERIES = 50;
const SLOW_QUERY_THRESHOLD_MS = parseInt(process.env.SLOW_QUERY_MS || '500', 10);

export function recordDbQuery(durationMs: number, sql?: string) {
  recordSample(dbQueries, durationMs);
  if (durationMs >= SLOW_QUERY_THRESHOLD_MS && sql) {
    // Truncate long queries, strip values for safety
    const safeSql = sql.slice(0, 200).replace(/\$\d+/g, '?');
    slowQueries.push({ sql: safeSql, durationMs, timestamp: Date.now() });
    if (slowQueries.length > MAX_SLOW_QUERIES) slowQueries.shift();
  }
}

export function recordDbError() {
  dbErrorCount++;
}

// ─── Error tracking ─────────────────────────────────────────────────

let totalErrors = 0;
const errorsByCode = new Map<string, number>();

export function recordError(code: string) {
  totalErrors++;
  errorsByCode.set(code, (errorsByCode.get(code) || 0) + 1);
}

// ─── Event bus metrics ──────────────────────────────────────────────

let eventsPublished = 0;
let eventsProcessed = 0;
let eventsFailed = 0;

export function recordEventPublished() { eventsPublished++; }
export function recordEventProcessed() { eventsProcessed++; }
export function recordEventFailed() { eventsFailed++; }

// ─── Startup time ───────────────────────────────────────────────────

const startedAt = Date.now();

// ─── Snapshots ──────────────────────────────────────────────────────

export function getMetricsJson() {
  const routes: Record<string, unknown>[] = [];
  for (const [key, entry] of httpRequests) {
    const statusCounts: Record<number, number> = {};
    for (const [status, count] of entry.byStatus) statusCounts[status] = count;
    routes.push({
      route: key,
      total: entry.total,
      statusCounts,
      avgMs: entry.latency.count > 0 ? Math.round(entry.latency.totalMs / entry.latency.count) : 0,
      p50Ms: percentile(entry.latency, 50),
      p95Ms: percentile(entry.latency, 95),
      p99Ms: percentile(entry.latency, 99),
      maxMs: entry.latency.maxMs,
    });
  }
  // Sort by total requests descending
  routes.sort((a, b) => (b as { total: number }).total - (a as { total: number }).total);

  const mem = process.memoryUsage();

  return {
    uptime: {
      seconds: Math.floor((Date.now() - startedAt) / 1000),
      startedAt: new Date(startedAt).toISOString(),
    },
    http: {
      routes,
      totalRequests: [...httpRequests.values()].reduce((s, e) => s + e.total, 0),
    },
    db: {
      totalQueries: dbQueries.count,
      avgMs: dbQueries.count > 0 ? Math.round(dbQueries.totalMs / dbQueries.count) : 0,
      p50Ms: percentile(dbQueries, 50),
      p95Ms: percentile(dbQueries, 95),
      p99Ms: percentile(dbQueries, 99),
      maxMs: dbQueries.maxMs,
      errors: dbErrorCount,
      slowQueries: slowQueries.slice(-20),
    },
    errors: {
      total: totalErrors,
      byCode: Object.fromEntries(errorsByCode),
    },
    events: {
      published: eventsPublished,
      processed: eventsProcessed,
      failed: eventsFailed,
    },
    system: {
      memoryMb: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        external: Math.round(mem.external / 1024 / 1024),
      },
      nodeVersion: process.version,
      pid: process.pid,
      cpuUsage: process.cpuUsage(),
    },
  };
}

/**
 * Prometheus text exposition format (subset).
 */
export function getMetricsPrometheus(): string {
  const lines: string[] = [];
  const push = (line: string) => lines.push(line);

  // Uptime
  push('# HELP beme_uptime_seconds Server uptime in seconds');
  push('# TYPE beme_uptime_seconds gauge');
  push(`beme_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`);

  // HTTP
  push('# HELP beme_http_requests_total Total HTTP requests');
  push('# TYPE beme_http_requests_total counter');
  for (const [key, entry] of httpRequests) {
    const [method, route] = key.split(' ', 2);
    for (const [status, count] of entry.byStatus) {
      push(`beme_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }
  }

  push('# HELP beme_http_request_duration_ms HTTP request latency');
  push('# TYPE beme_http_request_duration_ms summary');
  for (const [key, entry] of httpRequests) {
    const [method, route] = key.split(' ', 2);
    const labels = `method="${method}",route="${route}"`;
    push(`beme_http_request_duration_ms{${labels},quantile="0.5"} ${percentile(entry.latency, 50)}`);
    push(`beme_http_request_duration_ms{${labels},quantile="0.95"} ${percentile(entry.latency, 95)}`);
    push(`beme_http_request_duration_ms{${labels},quantile="0.99"} ${percentile(entry.latency, 99)}`);
    push(`beme_http_request_duration_ms_count{${labels}} ${entry.latency.count}`);
    push(`beme_http_request_duration_ms_sum{${labels}} ${Math.round(entry.latency.totalMs)}`);
  }

  // DB
  push('# HELP beme_db_queries_total Total database queries');
  push('# TYPE beme_db_queries_total counter');
  push(`beme_db_queries_total ${dbQueries.count}`);
  push('# HELP beme_db_errors_total Total database errors');
  push('# TYPE beme_db_errors_total counter');
  push(`beme_db_errors_total ${dbErrorCount}`);
  push('# HELP beme_db_query_duration_ms DB query latency');
  push('# TYPE beme_db_query_duration_ms summary');
  push(`beme_db_query_duration_ms{quantile="0.5"} ${percentile(dbQueries, 50)}`);
  push(`beme_db_query_duration_ms{quantile="0.95"} ${percentile(dbQueries, 95)}`);
  push(`beme_db_query_duration_ms{quantile="0.99"} ${percentile(dbQueries, 99)}`);

  // Errors
  push('# HELP beme_errors_total Total application errors');
  push('# TYPE beme_errors_total counter');
  push(`beme_errors_total ${totalErrors}`);

  // Events
  push('# HELP beme_events_published_total Events published');
  push('# TYPE beme_events_published_total counter');
  push(`beme_events_published_total ${eventsPublished}`);
  push('# HELP beme_events_processed_total Events processed');
  push('# TYPE beme_events_processed_total counter');
  push(`beme_events_processed_total ${eventsProcessed}`);

  // Memory
  const mem = process.memoryUsage();
  push('# HELP beme_memory_rss_bytes Resident set size');
  push('# TYPE beme_memory_rss_bytes gauge');
  push(`beme_memory_rss_bytes ${mem.rss}`);
  push('# HELP beme_memory_heap_used_bytes Heap used');
  push('# TYPE beme_memory_heap_used_bytes gauge');
  push(`beme_memory_heap_used_bytes ${mem.heapUsed}`);

  push('');
  return lines.join('\n');
}
