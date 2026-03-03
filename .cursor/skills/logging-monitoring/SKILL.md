---
name: logging-monitoring
description: Logging and monitoring patterns for BMe. Use when implementing structured logging, health checks, error tracking, or performance monitoring.
---

# Logging & Monitoring Skill

Production-ready logging and observability patterns for BMe's Node.js backend.

## When to Use

- Implementing structured logging
- Adding health check endpoints
- Setting up error tracking
- Monitoring application performance
- Debugging production issues

## Structured Logging with Pino

### Setup

```bash
cd backend
npm install pino pino-pretty
```

### Logger Configuration

```typescript
// backend/src/lib/logger.ts
import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: process.env.NODE_ENV,
    service: 'bme-api',
  },
  redact: {
    paths: ['req.headers.authorization', 'password', 'token'],
    censor: '[REDACTED]',
  },
});
```

### Request Logging Middleware

```typescript
// backend/src/middleware/requestLogger.ts
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { logger } from '../lib/logger.js';

declare global {
  namespace Express {
    interface Request {
      id: string;
      startTime: number;
    }
  }
}

export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  req.id = (req.headers['x-request-id'] as string) || randomUUID();
  req.startTime = Date.now();

  // Log request
  logger.info({
    requestId: req.id,
    method: req.method,
    path: req.path,
    query: req.query,
    userAgent: req.headers['user-agent'],
    ip: req.ip,
  }, 'Request received');

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    const logData = {
      requestId: req.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userId: req.user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error(logData, 'Request failed');
    } else if (res.statusCode >= 400) {
      logger.warn(logData, 'Request error');
    } else {
      logger.info(logData, 'Request completed');
    }
  });

  // Add request ID to response headers
  res.setHeader('X-Request-ID', req.id);

  next();
}
```

### Logging Patterns

```typescript
// Contextual logging
logger.info({ userId, action: 'login' }, 'User logged in');

// Error logging (include error object)
logger.error({ err, userId, action: 'createFood' }, 'Failed to create food entry');

// Warning with context
logger.warn({ endpoint, remaining: 5 }, 'Rate limit approaching');

// Debug for development
logger.debug({ payload, headers }, 'Voice request received');

// Child logger for services
const voiceLogger = logger.child({ service: 'voice' });
voiceLogger.info({ transcript }, 'Processing voice command');
```

### Log Levels

| Level | When to Use |
|-------|-------------|
| `fatal` | Application crash |
| `error` | Operation failed, needs attention |
| `warn` | Potential issue, degraded state |
| `info` | Business events, request lifecycle |
| `debug` | Development debugging |
| `trace` | Verbose debugging |

## Health Checks

### Basic Health Endpoint

```typescript
// backend/src/routes/health.ts
import { Router } from 'express';
import { getPool } from '../db/index.js';
import { getRedisClient } from '../lib/redis.js';

const router = Router();

// Liveness probe - is the app running?
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness probe - can the app handle requests?
router.get('/ready', async (req, res) => {
  const checks: Record<string, { status: string; latency?: number }> = {};
  let healthy = true;

  // Database check
  try {
    const start = Date.now();
    const pool = getPool();
    await pool.query('SELECT 1');
    checks.database = { status: 'ok', latency: Date.now() - start };
  } catch (err) {
    checks.database = { status: 'error' };
    healthy = false;
  }

  // Redis check (optional)
  try {
    const redis = getRedisClient();
    if (redis) {
      const start = Date.now();
      await redis.ping();
      checks.redis = { status: 'ok', latency: Date.now() - start };
    } else {
      checks.redis = { status: 'not_configured' };
    }
  } catch (err) {
    checks.redis = { status: 'degraded' };
    // Redis is optional, don't fail health check
  }

  const status = healthy ? 200 : 503;
  res.status(status).json({
    status: healthy ? 'healthy' : 'unhealthy',
    checks,
    timestamp: new Date().toISOString(),
  });
});
```

### Detailed Status Endpoint

```typescript
// backend/src/routes/health.ts
router.get('/status', authenticate, requireRole('admin'), async (req, res) => {
  const pool = getPool();
  
  // Database stats
  const dbStats = await pool.query(`
    SELECT 
      numbackends as connections,
      xact_commit as transactions,
      blks_hit as cache_hits,
      blks_read as disk_reads
    FROM pg_stat_database 
    WHERE datname = current_database()
  `);

  // Memory usage
  const memUsage = process.memoryUsage();

  res.json({
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      rss: Math.round(memUsage.rss / 1024 / 1024),
    },
    database: dbStats.rows[0],
    version: process.env.npm_package_version || 'unknown',
    environment: process.env.NODE_ENV,
  });
});
```

## Error Tracking

### Structured Error Logging

```typescript
// backend/src/middleware/errorHandler.ts
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const errorContext = {
    err,
    requestId: req.id,
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    query: req.query,
    body: sanitizeBody(req.body),
    stack: err.stack,
  };

  if (err instanceof AppError && err.statusCode < 500) {
    // Client errors - warn level
    logger.warn(errorContext, `Client error: ${err.message}`);
  } else {
    // Server errors - error level
    logger.error(errorContext, `Server error: ${err.message}`);
    
    // Send to error tracking service
    trackError(err, errorContext);
  }

  // Send response...
}

function sanitizeBody(body: unknown): unknown {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body as Record<string, unknown> };
  const sensitiveKeys = ['password', 'token', 'secret', 'apiKey'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}
```

### Error Tracking Service Integration

```typescript
// backend/src/lib/errorTracking.ts
interface ErrorContext {
  requestId?: string;
  userId?: string;
  path?: string;
  extra?: Record<string, unknown>;
}

export function trackError(error: Error, context: ErrorContext = {}): void {
  if (process.env.NODE_ENV !== 'production') {
    // In development, just log
    logger.error({ error, ...context }, 'Error tracked');
    return;
  }

  // Production: send to error tracking service
  // Example with Sentry:
  // Sentry.captureException(error, { extra: context });
  
  // Example with custom service:
  // errorTrackingAPI.report(error, context);
}
```

## Performance Monitoring

### Request Duration Tracking

```typescript
// backend/src/middleware/metrics.ts
interface RouteMetrics {
  count: number;
  totalDuration: number;
  errors: number;
}

const metrics = new Map<string, RouteMetrics>();

export function collectMetrics(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const key = `${req.method} ${req.route?.path || req.path}`;
    
    const current = metrics.get(key) || { count: 0, totalDuration: 0, errors: 0 };
    current.count++;
    current.totalDuration += duration;
    if (res.statusCode >= 500) current.errors++;
    
    metrics.set(key, current);
    
    // Log slow requests
    if (duration > 1000) {
      logger.warn({
        requestId: req.id,
        method: req.method,
        path: req.path,
        duration,
      }, 'Slow request detected');
    }
  });

  next();
}

export function getMetrics(): Record<string, { avgDuration: number; count: number; errorRate: number }> {
  const result: Record<string, any> = {};
  
  for (const [route, data] of metrics) {
    result[route] = {
      avgDuration: Math.round(data.totalDuration / data.count),
      count: data.count,
      errorRate: data.count > 0 ? (data.errors / data.count) : 0,
    };
  }
  
  return result;
}
```

### Database Query Monitoring

```typescript
// backend/src/db/index.ts
import { Pool } from 'pg';
import { logger } from '../lib/logger.js';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Log slow queries
const originalQuery = pool.query.bind(pool);

pool.query = async function(queryText: string | any, values?: any[]) {
  const start = Date.now();
  
  try {
    const result = await originalQuery(queryText, values);
    const duration = Date.now() - start;
    
    if (duration > 100) { // Log queries > 100ms
      logger.warn({
        query: typeof queryText === 'string' ? queryText.slice(0, 200) : 'QueryConfig',
        duration,
        rowCount: result.rowCount,
      }, 'Slow database query');
    }
    
    return result;
  } catch (error) {
    logger.error({
      query: typeof queryText === 'string' ? queryText.slice(0, 200) : 'QueryConfig',
      error,
    }, 'Database query failed');
    throw error;
  }
} as typeof pool.query;
```

## Application Metrics Endpoint

```typescript
// backend/src/routes/metrics.ts
import { Router } from 'express';
import { getMetrics } from '../middleware/metrics.js';

const router = Router();

router.get('/metrics', authenticate, requireRole('admin'), (req, res) => {
  res.json({
    routes: getMetrics(),
    process: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    },
    timestamp: new Date().toISOString(),
  });
});
```

## Log Aggregation

### Structured Log Format

```json
{
  "level": 30,
  "time": 1709398800000,
  "service": "bme-api",
  "env": "production",
  "requestId": "abc-123",
  "method": "POST",
  "path": "/api/food",
  "statusCode": 201,
  "duration": 45,
  "userId": "user-456",
  "msg": "Request completed"
}
```

### Log Queries

```bash
# Find errors for a request
grep "abc-123" logs/*.log | grep error

# Find all errors in last hour
cat logs/app.log | jq 'select(.level >= 50)'

# Find slow requests
cat logs/app.log | jq 'select(.duration > 1000)'
```

## Best Practices

### Do

- Use structured logging (JSON format)
- Include request IDs for correlation
- Log at appropriate levels
- Redact sensitive data
- Monitor health endpoints
- Set up alerting for errors

### Don't

- Log passwords, tokens, or PII
- Use console.log in production
- Log every request body (too verbose)
- Ignore slow query warnings
- Skip health checks in deployment

## Environment Variables

```bash
# Logging
LOG_LEVEL=info              # debug, info, warn, error
NODE_ENV=production         # development, production

# Error tracking (optional)
SENTRY_DSN=https://xxx@sentry.io/xxx
```

## Checklist

### Setup

- [ ] Pino logger configured
- [ ] Request logging middleware
- [ ] Error handler with logging
- [ ] Sensitive data redaction

### Health Checks

- [ ] `/health` liveness probe
- [ ] `/ready` readiness probe
- [ ] Database connectivity check
- [ ] Redis connectivity check (if used)

### Monitoring

- [ ] Slow request detection
- [ ] Error rate tracking
- [ ] Database query monitoring
- [ ] Memory usage tracking
