---
name: error-handling-patterns
description: Error handling patterns for BMe backend and frontend. Use when implementing error handling, creating error boundaries, or standardizing API error responses.
---

# Error Handling Patterns Skill

Comprehensive error handling patterns for BMe's Express backend and React frontend.

## When to Use

- Implementing error handling in new features
- Standardizing API error responses
- Adding React Error Boundaries
- Creating resilient service integrations
- Debugging production errors

## Backend Error Handling

### Error Classes

Define custom error classes for different scenarios:

```typescript
// backend/src/errors/index.ts
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter?: number) {
    super('Rate limit exceeded', 429, 'RATE_LIMIT', { retryAfter });
    this.name = 'RateLimitError';
  }
}
```

### Error Handler Middleware

```typescript
// backend/src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/index.js';
import { logger } from '../lib/logger.js';

interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error with context
  logger.error({
    err,
    requestId: req.id,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
  }, 'Request error');

  // Handle known errors
  if (err instanceof AppError) {
    const response: ErrorResponse = {
      error: {
        message: err.message,
        code: err.code,
        details: err.details,
      },
    };
    res.status(err.statusCode).json(response);
    return;
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    const response: ErrorResponse = {
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: err.errors,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle database errors
  if (err.code === '23505') { // Unique violation
    const response: ErrorResponse = {
      error: {
        message: 'Resource already exists',
        code: 'CONFLICT',
      },
    };
    res.status(409).json(response);
    return;
  }

  // Unknown errors - don't leak details in production
  const response: ErrorResponse = {
    error: {
      message: process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message,
      code: 'INTERNAL_ERROR',
    },
  };
  res.status(500).json(response);
}
```

### Async Handler Wrapper

```typescript
// backend/src/utils/asyncHandler.ts
import { Request, Response, NextFunction, RequestHandler } from 'express';

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void>;

export function asyncHandler(fn: AsyncRequestHandler): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
```

### Usage in Controllers

```typescript
// backend/src/controllers/food.ts
import { asyncHandler } from '../utils/asyncHandler.js';
import { NotFoundError, ValidationError } from '../errors/index.js';
import * as foodService from '../services/food.js';

export const getFood = asyncHandler(async (req, res) => {
  const food = await foodService.findById(req.params.id);
  
  if (!food) {
    throw new NotFoundError('Food entry');
  }
  
  res.json(food);
});

export const createFood = asyncHandler(async (req, res) => {
  const { name, calories } = req.body;
  
  if (!name) {
    throw new ValidationError('Name is required');
  }
  
  const food = await foodService.create(req.user!.id, { name, calories });
  res.status(201).json(food);
});
```

## Result Type Pattern

For operations that can fail, use a Result type:

```typescript
// backend/src/types/result.ts
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function ok<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function err<E>(error: E): Result<never, E> {
  return { success: false, error };
}
```

### Usage

```typescript
// Service layer
import { Result, ok, err } from '../types/result.js';

interface ParseError {
  code: 'INVALID_FORMAT' | 'MISSING_FIELD';
  message: string;
}

export async function parseVoiceCommand(
  text: string
): Promise<Result<Action[], ParseError>> {
  try {
    const actions = await gemini.understand(text);
    
    if (actions.length === 0) {
      return err({ 
        code: 'INVALID_FORMAT', 
        message: 'Could not understand command' 
      });
    }
    
    return ok(actions);
  } catch (e) {
    return err({ 
      code: 'INVALID_FORMAT', 
      message: 'Failed to parse command' 
    });
  }
}

// Controller layer
const result = await parseVoiceCommand(text);

if (!result.success) {
  throw new ValidationError(result.error.message);
}

const actions = result.data;
```

## Frontend Error Handling

### Error Boundary Component

```tsx
// frontend/src/components/ErrorBoundary.tsx
import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    // Send to error tracking service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-8">
          <h2 className="text-xl font-semibold mb-4">Something went wrong</h2>
          <p className="text-muted-foreground mb-4">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
          <Button onClick={this.handleReset}>Try again</Button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

### API Error Handling with React Query

```typescript
// frontend/src/lib/api.ts
import { toast } from 'sonner';

interface ApiError {
  error: {
    message: string;
    code?: string;
    details?: unknown;
  };
}

export async function apiRequest<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error: ApiError = await response.json().catch(() => ({
      error: { message: 'Network error' },
    }));

    throw new Error(error.error.message);
  }

  return response.json();
}
```

### React Query Error Handling

```typescript
// frontend/src/hooks/useFood.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/api';

export function useFoodEntries() {
  return useQuery({
    queryKey: ['food-entries'],
    queryFn: () => apiRequest<FoodEntry[]>('/api/food'),
    retry: (failureCount, error) => {
      // Don't retry on 4xx errors
      if (error.message.includes('not found')) return false;
      if (error.message.includes('unauthorized')) return false;
      return failureCount < 3;
    },
  });
}

export function useCreateFood() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateFoodInput) =>
      apiRequest<FoodEntry>('/api/food', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['food-entries'] });
      toast.success('Food entry added');
    },
    onError: (error: Error) => {
      toast.error('Failed to add food', {
        description: error.message,
      });
    },
  });
}
```

### Global Error Handler

```typescript
// frontend/src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      staleTime: 5000,
    },
    mutations: {
      onError: (error: Error) => {
        toast.error('Operation failed', {
          description: error.message,
        });
      },
    },
  },
});
```

## Service Integration Errors

### External Service Wrapper

```typescript
// backend/src/services/external.ts
import { logger } from '../lib/logger.js';

interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  shouldRetry?: (error: Error) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { 
    maxRetries = 3, 
    baseDelay = 1000,
    shouldRetry = () => true 
  } = options;

  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (!shouldRetry(lastError) || attempt === maxRetries - 1) {
        throw lastError;
      }

      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn({ 
        attempt, 
        delay, 
        error: lastError.message 
      }, 'Retrying operation');
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}
```

### Graceful Degradation

```typescript
// backend/src/services/insights.ts
export async function getInsights(userId: string): Promise<Insights | null> {
  try {
    return await fetchInsightsFromAI(userId);
  } catch (error) {
    logger.error({ error, userId }, 'Failed to fetch AI insights');
    
    // Return cached or fallback data
    return getCachedInsights(userId) ?? getDefaultInsights();
  }
}
```

## Error Monitoring

### Structured Error Logging

```typescript
// Always log with context
logger.error({
  err,                    // The error object
  requestId: req.id,      // Request correlation
  userId: req.user?.id,   // User context
  action: 'createFood',   // What was being attempted
  input: { name, calories }, // Relevant input (sanitized)
}, 'Failed to create food entry');
```

### Error Tracking Integration

```typescript
// frontend/src/lib/errorTracking.ts
export function trackError(error: Error, context?: Record<string, unknown>) {
  // In production, send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // e.g., Sentry.captureException(error, { extra: context });
  }
  
  console.error('Error:', error, context);
}
```

## Best Practices

### Do

- Use custom error classes for different error types
- Always wrap async handlers
- Log errors with context (userId, requestId, action)
- Return consistent error response format
- Use Error Boundaries in React
- Implement retry logic for external services

### Don't

- Leak stack traces or internal details in production
- Catch errors without logging them
- Use generic error messages that don't help debugging
- Retry on 4xx errors (they're not transient)
- Swallow errors silently

## Error Response Format

All API errors should follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Standard Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Invalid input |
| UNAUTHORIZED | 401 | Not authenticated |
| FORBIDDEN | 403 | Not authorized |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource already exists |
| RATE_LIMIT | 429 | Too many requests |
| INTERNAL_ERROR | 500 | Server error |
