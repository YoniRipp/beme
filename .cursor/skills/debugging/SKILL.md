# Debugging Skill

Systematic debugging approach for BMe backend and frontend issues.

## When to Use

Use this skill when:
- Investigating errors or unexpected behavior
- Tracing request/response flows
- Debugging voice command issues
- Analyzing performance problems

## Backend Debugging

### Using the Logger

BMe uses Pino logger. Never use `console.log` in production.

```typescript
import { logger } from '@/lib/logger';

// Log levels
logger.info({ userId, action: 'login' }, 'User logged in');
logger.warn({ endpoint }, 'Rate limit approaching');
logger.error({ err, userId }, 'Failed to process request');
logger.debug({ payload }, 'Request payload');
```

### Request Tracing

Each request has a unique ID via `requestId` middleware:

```typescript
// Access in handlers
const requestId = req.id;
logger.info({ requestId, path: req.path }, 'Processing request');
```

### Database Query Debugging

```typescript
// Add query logging temporarily
const result = await pool.query({
  text: 'SELECT * FROM users WHERE id = $1',
  values: [userId],
});
logger.debug({ 
  query: result.command,
  rowCount: result.rowCount,
  duration: result.duration
}, 'Query executed');
```

### Error Handling

Check the error handler middleware:

```typescript
// backend/src/middleware/errorHandler.ts
// All errors are caught here and logged
```

## Frontend Debugging

### React Query DevTools

Enable in development:

```tsx
// Already included in App.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
```

Open with the floating button in bottom-right corner.

### Network Debugging

1. Open DevTools → Network tab
2. Filter by `Fetch/XHR`
3. Check request/response payloads
4. Look for 4xx/5xx status codes

### State Inspection

```tsx
// Add temporary debugging
useEffect(() => {
  console.log('State changed:', { state, props });
}, [state, props]);
```

### React Error Boundaries

Check for error boundaries catching errors:

```tsx
// Look in error boundary components
// They may be silently catching errors
```

## Voice System Debugging

### Test Voice Commands

Use the MCP tool to test parsing:

```
voice_understand: "I ate rice and chicken for lunch"
```

### Check Voice Pipeline

1. **Transcription**: Audio → Text
   - Check `backend/src/services/voice.ts`
   - Verify Gemini API key is valid

2. **Understanding**: Text → Actions
   - Check `VOICE_PROMPT` in `voice.ts`
   - Verify function declarations in `backend/voice/tools.js`

3. **Execution**: Actions → Database
   - Check `backend/src/services/voiceExecutor.ts`
   - Verify action handlers

### Debug Voice Flow

```typescript
// backend/src/services/voice.ts
// Add logging to parseAudio and understand functions
logger.debug({ transcript }, 'Received transcript');
logger.debug({ actions }, 'Parsed actions');
```

## Common Issues

### 503 Service Unavailable

**Cause**: Redis unreachable
**Solution**: Comment out `REDIS_URL` or start Redis

```bash
# Check Redis
redis-cli ping

# Or start with Docker
docker run -p 6379:6379 redis
```

### 404 Not Found

**Check**:
1. Route exists in `backend/src/routes/`
2. Route is registered in `backend/src/routes/index.ts`
3. HTTP method matches (GET vs POST)

### Authentication Errors

**401 Unauthorized**:
- Token expired or invalid
- Check `JWT_SECRET` matches
- Verify token in request headers

**403 Forbidden**:
- User lacks permission
- Check `requirePro` middleware
- Verify subscription status

### Database Errors

**Connection refused**:
```bash
# Check PostgreSQL is running
pg_isready

# Check connection string
echo $DATABASE_URL
```

**Migration issues**:
```bash
cd backend
npm run migrate:up
npm run migrate:down  # Rollback if needed
```

### React Hydration Errors

**Cause**: Server/client mismatch
**Solution**: Ensure consistent rendering, avoid `Math.random()` or `Date.now()` in initial render

## Debugging Tools

### Backend

```bash
# Run with debug logging
DEBUG=* npm run dev

# Check specific module
DEBUG=express:* npm run dev
```

### Database

```bash
# Connect to database
psql $DATABASE_URL

# Check recent queries (if pg_stat_statements enabled)
SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;
```

### Redis

```bash
# Monitor all commands
redis-cli monitor

# Check keys
redis-cli keys "*"
```

## Debugging Checklist

1. [ ] Check server logs for errors
2. [ ] Verify environment variables are set
3. [ ] Check database connection
4. [ ] Verify Redis connection (if used)
5. [ ] Check network requests in browser DevTools
6. [ ] Verify authentication token is valid
7. [ ] Check for CORS errors
8. [ ] Review recent code changes

## Quick Fixes

### Clear all caches

```bash
# Redis
redis-cli FLUSHALL

# React Query (in browser console)
window.__REACT_QUERY_STATE__ = undefined;
location.reload();
```

### Reset database state

```bash
cd backend
npm run migrate:down
npm run migrate:up
npm run seed  # If seed script exists
```

### Restart everything

```bash
# Kill all node processes
pkill -f node

# Start fresh
cd backend && npm run dev
cd frontend && npm run dev
```
