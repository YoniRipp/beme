/**
 * Monitoring routes:
 * - GET /metrics              — Prometheus text format (for scrapers)
 * - GET /api/admin/metrics    — JSON metrics (for admin dashboard, requires admin)
 * - GET /api/admin/queues     — BullMQ queue health (requires admin)
 * - POST /api/client-logs     — Ingest frontend error/perf logs (requires auth)
 */
import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { getMetricsJson, getMetricsPrometheus } from '../lib/metrics.js';
import { getEventsQueue, getEventsDlq } from '../events/bus.js';
import { logger } from '../lib/logger.js';
import { logError } from '../services/appLog.js';
import { isDbConfigured } from '../db/index.js';

const clientLog = logger.child({ module: 'client' });

const router = Router();

// ── Prometheus endpoint (no auth — meant for internal scraper) ──────
router.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(getMetricsPrometheus());
});

// ── Admin JSON metrics ──────────────────────────────────────────────
router.get('/api/admin/metrics', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  res.json(getMetricsJson());
}));

// ── Queue health ────────────────────────────────────────────────────
router.get('/api/admin/queues', requireAuth, requireAdmin, asyncHandler(async (_req, res) => {
  const results: Record<string, unknown> = {};

  const eventsQueue = await getEventsQueue();
  if (eventsQueue) {
    const counts = await eventsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed');
    results.events = { name: eventsQueue.name, ...counts };
  }

  const dlq = await getEventsDlq();
  if (dlq) {
    const counts = await dlq.getJobCounts('waiting', 'active', 'failed');
    results.eventsDlq = { name: dlq.name, ...counts };
  }

  res.json(results);
}));

// ── Client-side log ingestion ───────────────────────────────────────
const CLIENT_LOG_LIMIT = 10; // max entries per request

interface ClientLogEntry {
  level: 'error' | 'warn' | 'info';
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  timestamp?: string;
  extra?: Record<string, unknown>;
}

router.post('/api/client-logs', requireAuth, asyncHandler(async (req, res) => {
  const entries: ClientLogEntry[] = Array.isArray(req.body) ? req.body.slice(0, CLIENT_LOG_LIMIT) : [req.body];
  const userId = (req as unknown as { user?: { id?: string } }).user?.id;

  for (const entry of entries) {
    if (!entry?.message) continue;
    const level = entry.level === 'error' ? 'error' : entry.level === 'warn' ? 'warn' : 'info';

    clientLog[level]({
      userId,
      message: entry.message,
      stack: entry.stack?.slice(0, 2000),
      url: entry.url,
      userAgent: entry.userAgent?.slice(0, 200),
      timestamp: entry.timestamp,
      ...(entry.extra ?? {}),
    }, `[CLIENT] ${entry.message}`);

    // Persist errors to app_logs for admin visibility
    if (level === 'error' && isDbConfigured()) {
      await logError(`[CLIENT] ${entry.message}`, {
        stack: entry.stack?.slice(0, 2000),
        url: entry.url,
        userAgent: entry.userAgent?.slice(0, 200),
      }, userId);
    }
  }

  res.status(204).send();
}));

export default router;
