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

// ─── Event handler per-handler latency ──────────────────────────────

const eventHandlerLatency = new Map<string, LatencyBucket>();

export function recordEventHandler(handlerName: string, durationMs: number) {
  let bucket = eventHandlerLatency.get(handlerName);
  if (!bucket) {
    bucket = emptyBucket();
    eventHandlerLatency.set(handlerName, bucket);
  }
  recordSample(bucket, durationMs);
}

// ─── Redis cache metrics ────────────────────────────────────────────

let cacheHits = 0;
let cacheMisses = 0;

export function recordCacheHit() { cacheHits++; }
export function recordCacheMiss() { cacheMisses++; }

// ─── Voice job metrics ──────────────────────────────────────────────

let voiceJobsCompleted = 0;
let voiceJobsFailed = 0;
const voiceJobLatency: LatencyBucket = emptyBucket();

export function recordVoiceJob(durationMs: number, success: boolean) {
  recordSample(voiceJobLatency, durationMs);
  if (success) voiceJobsCompleted++;
  else voiceJobsFailed++;
}

// ─── Food lookup source metrics ─────────────────────────────────────

const foodLookupsBySource = new Map<string, number>();

export function recordFoodLookup(source: string) {
  foodLookupsBySource.set(source, (foodLookupsBySource.get(source) || 0) + 1);
}

// ─── Gemini API metrics ─────────────────────────────────────────────

const geminiCalls: LatencyBucket = emptyBucket();
let geminiErrors = 0;

export function recordGeminiCall(durationMs: number, success: boolean) {
  recordSample(geminiCalls, durationMs);
  if (!success) geminiErrors++;
}

// ─── Redis connection metrics ───────────────────────────────────────

let redisReconnects = 0;

export function recordRedisReconnect() { redisReconnects++; }

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
      handlers: Object.fromEntries(
        [...eventHandlerLatency.entries()].map(([name, bucket]) => [name, {
          count: bucket.count,
          avgMs: bucket.count > 0 ? Math.round(bucket.totalMs / bucket.count) : 0,
          p50Ms: percentile(bucket, 50),
          p95Ms: percentile(bucket, 95),
          maxMs: bucket.maxMs,
        }])
      ),
    },
    cache: {
      hits: cacheHits,
      misses: cacheMisses,
      hitRate: (cacheHits + cacheMisses) > 0
        ? Math.round((cacheHits / (cacheHits + cacheMisses)) * 10000) / 100
        : 0,
    },
    voiceJobs: {
      completed: voiceJobsCompleted,
      failed: voiceJobsFailed,
      latency: {
        count: voiceJobLatency.count,
        avgMs: voiceJobLatency.count > 0 ? Math.round(voiceJobLatency.totalMs / voiceJobLatency.count) : 0,
        p50Ms: percentile(voiceJobLatency, 50),
        p95Ms: percentile(voiceJobLatency, 95),
        p99Ms: percentile(voiceJobLatency, 99),
        maxMs: voiceJobLatency.maxMs,
      },
    },
    foodLookups: {
      bySource: Object.fromEntries(foodLookupsBySource),
      total: [...foodLookupsBySource.values()].reduce((s, c) => s + c, 0),
    },
    gemini: {
      totalCalls: geminiCalls.count,
      errors: geminiErrors,
      latency: {
        avgMs: geminiCalls.count > 0 ? Math.round(geminiCalls.totalMs / geminiCalls.count) : 0,
        p50Ms: percentile(geminiCalls, 50),
        p95Ms: percentile(geminiCalls, 95),
        p99Ms: percentile(geminiCalls, 99),
        maxMs: geminiCalls.maxMs,
      },
    },
    redis: {
      reconnects: redisReconnects,
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
  push('# HELP trackvibe_uptime_seconds Server uptime in seconds');
  push('# TYPE trackvibe_uptime_seconds gauge');
  push(`trackvibe_uptime_seconds ${Math.floor((Date.now() - startedAt) / 1000)}`);

  // HTTP
  push('# HELP trackvibe_http_requests_total Total HTTP requests');
  push('# TYPE trackvibe_http_requests_total counter');
  for (const [key, entry] of httpRequests) {
    const [method, route] = key.split(' ', 2);
    for (const [status, count] of entry.byStatus) {
      push(`trackvibe_http_requests_total{method="${method}",route="${route}",status="${status}"} ${count}`);
    }
  }

  push('# HELP trackvibe_http_request_duration_ms HTTP request latency');
  push('# TYPE trackvibe_http_request_duration_ms summary');
  for (const [key, entry] of httpRequests) {
    const [method, route] = key.split(' ', 2);
    const labels = `method="${method}",route="${route}"`;
    push(`trackvibe_http_request_duration_ms{${labels},quantile="0.5"} ${percentile(entry.latency, 50)}`);
    push(`trackvibe_http_request_duration_ms{${labels},quantile="0.95"} ${percentile(entry.latency, 95)}`);
    push(`trackvibe_http_request_duration_ms{${labels},quantile="0.99"} ${percentile(entry.latency, 99)}`);
    push(`trackvibe_http_request_duration_ms_count{${labels}} ${entry.latency.count}`);
    push(`trackvibe_http_request_duration_ms_sum{${labels}} ${Math.round(entry.latency.totalMs)}`);
  }

  // DB
  push('# HELP trackvibe_db_queries_total Total database queries');
  push('# TYPE trackvibe_db_queries_total counter');
  push(`trackvibe_db_queries_total ${dbQueries.count}`);
  push('# HELP trackvibe_db_errors_total Total database errors');
  push('# TYPE trackvibe_db_errors_total counter');
  push(`trackvibe_db_errors_total ${dbErrorCount}`);
  push('# HELP trackvibe_db_query_duration_ms DB query latency');
  push('# TYPE trackvibe_db_query_duration_ms summary');
  push(`trackvibe_db_query_duration_ms{quantile="0.5"} ${percentile(dbQueries, 50)}`);
  push(`trackvibe_db_query_duration_ms{quantile="0.95"} ${percentile(dbQueries, 95)}`);
  push(`trackvibe_db_query_duration_ms{quantile="0.99"} ${percentile(dbQueries, 99)}`);

  // Errors
  push('# HELP trackvibe_errors_total Total application errors');
  push('# TYPE trackvibe_errors_total counter');
  push(`trackvibe_errors_total ${totalErrors}`);

  // Events
  push('# HELP trackvibe_events_published_total Events published');
  push('# TYPE trackvibe_events_published_total counter');
  push(`trackvibe_events_published_total ${eventsPublished}`);
  push('# HELP trackvibe_events_processed_total Events processed');
  push('# TYPE trackvibe_events_processed_total counter');
  push(`trackvibe_events_processed_total ${eventsProcessed}`);

  // Events failed
  push('# HELP trackvibe_events_failed_total Events failed');
  push('# TYPE trackvibe_events_failed_total counter');
  push(`trackvibe_events_failed_total ${eventsFailed}`);

  // Event handler latency
  push('# HELP trackvibe_event_handler_duration_ms Event handler latency');
  push('# TYPE trackvibe_event_handler_duration_ms summary');
  for (const [name, bucket] of eventHandlerLatency) {
    const lbl = `handler="${name}"`;
    push(`trackvibe_event_handler_duration_ms{${lbl},quantile="0.5"} ${percentile(bucket, 50)}`);
    push(`trackvibe_event_handler_duration_ms{${lbl},quantile="0.95"} ${percentile(bucket, 95)}`);
    push(`trackvibe_event_handler_duration_ms_count{${lbl}} ${bucket.count}`);
    push(`trackvibe_event_handler_duration_ms_sum{${lbl}} ${Math.round(bucket.totalMs)}`);
  }

  // Cache
  push('# HELP trackvibe_cache_hits_total Cache hits');
  push('# TYPE trackvibe_cache_hits_total counter');
  push(`trackvibe_cache_hits_total ${cacheHits}`);
  push('# HELP trackvibe_cache_misses_total Cache misses');
  push('# TYPE trackvibe_cache_misses_total counter');
  push(`trackvibe_cache_misses_total ${cacheMisses}`);

  // Voice jobs
  push('# HELP trackvibe_voice_jobs_completed_total Voice jobs completed');
  push('# TYPE trackvibe_voice_jobs_completed_total counter');
  push(`trackvibe_voice_jobs_completed_total ${voiceJobsCompleted}`);
  push('# HELP trackvibe_voice_jobs_failed_total Voice jobs failed');
  push('# TYPE trackvibe_voice_jobs_failed_total counter');
  push(`trackvibe_voice_jobs_failed_total ${voiceJobsFailed}`);
  push('# HELP trackvibe_voice_job_duration_ms Voice job latency');
  push('# TYPE trackvibe_voice_job_duration_ms summary');
  push(`trackvibe_voice_job_duration_ms{quantile="0.5"} ${percentile(voiceJobLatency, 50)}`);
  push(`trackvibe_voice_job_duration_ms{quantile="0.95"} ${percentile(voiceJobLatency, 95)}`);
  push(`trackvibe_voice_job_duration_ms{quantile="0.99"} ${percentile(voiceJobLatency, 99)}`);

  // Food lookups
  push('# HELP trackvibe_food_lookups_total Food lookups by source');
  push('# TYPE trackvibe_food_lookups_total counter');
  for (const [source, count] of foodLookupsBySource) {
    push(`trackvibe_food_lookups_total{source="${source}"} ${count}`);
  }

  // Gemini
  push('# HELP trackvibe_gemini_calls_total Gemini API calls');
  push('# TYPE trackvibe_gemini_calls_total counter');
  push(`trackvibe_gemini_calls_total ${geminiCalls.count}`);
  push('# HELP trackvibe_gemini_errors_total Gemini API errors');
  push('# TYPE trackvibe_gemini_errors_total counter');
  push(`trackvibe_gemini_errors_total ${geminiErrors}`);
  push('# HELP trackvibe_gemini_duration_ms Gemini API latency');
  push('# TYPE trackvibe_gemini_duration_ms summary');
  push(`trackvibe_gemini_duration_ms{quantile="0.5"} ${percentile(geminiCalls, 50)}`);
  push(`trackvibe_gemini_duration_ms{quantile="0.95"} ${percentile(geminiCalls, 95)}`);
  push(`trackvibe_gemini_duration_ms{quantile="0.99"} ${percentile(geminiCalls, 99)}`);

  // Redis
  push('# HELP trackvibe_redis_reconnects_total Redis reconnections');
  push('# TYPE trackvibe_redis_reconnects_total counter');
  push(`trackvibe_redis_reconnects_total ${redisReconnects}`);

  // Memory
  const mem = process.memoryUsage();
  push('# HELP trackvibe_memory_rss_bytes Resident set size');
  push('# TYPE trackvibe_memory_rss_bytes gauge');
  push(`trackvibe_memory_rss_bytes ${mem.rss}`);
  push('# HELP trackvibe_memory_heap_used_bytes Heap used');
  push('# TYPE trackvibe_memory_heap_used_bytes gauge');
  push(`trackvibe_memory_heap_used_bytes ${mem.heapUsed}`);

  push('');
  return lines.join('\n');
}
