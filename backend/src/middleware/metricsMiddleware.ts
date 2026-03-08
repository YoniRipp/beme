/**
 * Express middleware that records HTTP request metrics (count, latency, status).
 * Attach early in the middleware chain (after requestId, before routes).
 */
import { Request, Response, NextFunction } from 'express';
import { recordHttpRequest } from '../lib/metrics.js';

export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - start;
    // Skip health / ready to avoid noise
    if (req.path === '/health' || req.path === '/ready') return;
    recordHttpRequest(req.method, req.path, res.statusCode, durationMs);
  });
  next();
}
