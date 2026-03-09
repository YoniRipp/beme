/**
 * Wraps a pg Pool to instrument query timing for the metrics collector.
 * Also logs slow queries via Pino.
 */
import pg from 'pg';
import { recordDbQuery, recordDbError } from '../lib/metrics.js';
import { logger } from '../lib/logger.js';

const SLOW_QUERY_MS = parseInt(process.env.SLOW_QUERY_MS || '500', 10);

const queryLog = logger.child({ module: 'db' });

/**
 * Monkey-patch a Pool instance so every query() call is timed.
 * This is safe because pg.Pool.prototype.query delegates to Client.query;
 * we intercept at the Pool level.
 */
export function instrumentPool(pool: pg.Pool): pg.Pool {
  const originalQuery = pool.query.bind(pool);

  // pg's pool.query has multiple overload signatures — we wrap them all
  // by accepting ...args and forwarding.
  (pool as unknown as Record<string, unknown>).query = async function monitoredQuery(
    ...args: unknown[]
  ): Promise<pg.QueryResult> {
    const start = Date.now();
    const sqlText = typeof args[0] === 'string'
      ? args[0]
      : (args[0] as { text?: string })?.text ?? '';
    try {
      const result = await (originalQuery as (...a: unknown[]) => Promise<pg.QueryResult>)(...args);
      const durationMs = Date.now() - start;
      recordDbQuery(durationMs, sqlText);
      if (durationMs >= SLOW_QUERY_MS) {
        queryLog.warn({ durationMs, sql: sqlText.slice(0, 300) }, 'Slow query detected');
      }
      return result;
    } catch (err) {
      const durationMs = Date.now() - start;
      recordDbQuery(durationMs, sqlText);
      recordDbError();
      queryLog.error({ durationMs, sql: sqlText.slice(0, 200), err }, 'Query failed');
      throw err;
    }
  };

  return pool;
}
