/**
 * Centralized error handler. Produces standardized error responses.
 * Also exports asyncHandler for wrapping async route handlers.
 */
import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AppError, type ErrorCode } from '../errors.js';
import { logger } from '../lib/logger.js';
import { recordError } from '../lib/metrics.js';

/**
 * Wraps async route handlers to forward errors to Express error middleware.
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Express error middleware. Maps errors to standardized JSON responses.
 * Must be registered after all routes.
 */
export function errorHandler(err: Error & { code?: string; constraint?: string }, req: Request, res: Response, next: NextFunction) {
  if (res.headersSent) return next(err);

  // Domain errors (AppError subclasses)
  if (err instanceof AppError) {
    recordError(err.code);
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details != null ? { details: err.details } : {}),
      },
    });
  }

  // PostgreSQL unique constraint violation
  if (err?.code === '23505') {
    const constraint = err?.constraint ?? '';
    const message = constraint.includes('email') ? 'Email already registered' : 'A record with this value already exists';
    recordError('CONFLICT');
    return res.status(409).json({
      error: {
        code: 'CONFLICT' as ErrorCode,
        message,
      },
    });
  }

  // Unhandled errors
  const ref = `ERR-${Date.now().toString(36).toUpperCase()}`;
  const reqWithId = req as Request & { id?: string };
  recordError('INTERNAL_ERROR');
  logger.error({ err, ref, requestId: reqWithId?.id }, 'Unhandled error');

  const message = process.env.NODE_ENV === 'production'
    ? `Something went wrong. If this persists, contact support (ref: ${ref})`
    : (err?.message ?? 'Internal server error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR' as ErrorCode,
      message,
      ...(process.env.NODE_ENV !== 'production' ? { ref } : {}),
    },
  });
}
