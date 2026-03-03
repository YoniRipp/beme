# BMe Project Context

BMe is a life management monorepo for tracking finances, workouts, energy/food, schedule, and goals with voice input powered by Gemini AI.

## Tech Stack

### Backend
- **Runtime**: Node.js 20+ with ES Modules
- **Framework**: Express.js with TypeScript
- **Database**: PostgreSQL with pgvector for embeddings
- **Cache/Queue**: Redis with BullMQ (optional, graceful fallback)
- **AI**: Google Gemini API for voice parsing and embeddings
- **Payments**: Stripe for subscriptions

### Frontend
- **Framework**: React 18 with Vite
- **Styling**: Tailwind CSS + shadcn/ui + Radix UI
- **State**: React Query (@tanstack/react-query) + React Context
- **Mobile**: Capacitor for iOS/Android builds

### Testing
- **Framework**: Vitest with @testing-library/react
- **Coverage**: @vitest/coverage-v8

## Code Style Rules

### General
- Use ES Modules (`import`/`export`), never CommonJS
- TypeScript strict mode enabled
- No `any` types - use `unknown` with type guards if needed
- Descriptive variable names (no single letters except loop indices)
- Max line length: 120 characters

### Backend
- All route handlers use `asyncHandler` wrapper for error handling
- Validate all inputs with Zod schemas
- Use parameterized SQL queries only - never string concatenation
- Services return plain objects, controllers handle HTTP responses
- Use `logger` (pino) for logging, never `console.log`

### Frontend
- Functional components only, no class components
- Custom hooks for reusable logic
- Co-locate styles with components using Tailwind
- Use React Query for server state, Context for UI state
- Feature-sliced architecture: `features/{domain}/api.ts`, `mappers.ts`, `hooks/`

## Security Rules

- NEVER hardcode API keys, tokens, or secrets
- Use environment variables via `config` module
- Validate ALL user inputs with Zod before processing
- Use parameterized queries - SQL injection is unacceptable
- Sanitize HTML output to prevent XSS
- Auth tokens in httpOnly cookies, not localStorage
- Rate limit all public endpoints

## Architecture Patterns

### Backend
```
routes/      → HTTP layer (validation, auth middleware)
controllers/ → Request handling (parse, delegate, respond)
services/    → Business logic (pure functions where possible)
models/      → Data access (SQL queries)
events/      → Async processing (pub/sub with Redis/SQS)
```

### Frontend
```
pages/       → Route components
components/  → Reusable UI (organized by domain)
features/    → Domain modules (api.ts, mappers.ts)
hooks/       → Custom hooks
context/     → React contexts for global state
lib/         → Utilities and helpers
```

## Forbidden Patterns

- No `console.log` in production code (use `logger`)
- No raw SQL string concatenation
- No `any` type annotations
- No synchronous file I/O in request handlers
- No secrets in code or git history
- No `// @ts-ignore` without explanation
- No empty catch blocks

## Testing Requirements

- Co-locate test files: `foo.ts` → `foo.test.ts`
- Unit test services and utilities
- Integration test API routes
- Mock external services (Gemini, Stripe, Redis)
- Minimum expectations: all new features have tests

## Voice System

The voice system uses Gemini function calling:
1. User speaks → audio/transcript sent to backend
2. Gemini parses → returns function calls (add_food, add_workout, etc.)
3. Backend processes → validates args, builds actions
4. Executor runs → creates database entries
5. Results returned → frontend shows success/failure

Key files:
- `backend/voice/tools.js` - Gemini function declarations
- `backend/src/services/voice.ts` - Parsing and action building
- `backend/src/services/voiceExecutor.ts` - Action execution

## Database Migrations

Use node-pg-migrate with timestamp-prefixed files:
```bash
npm run migrate:create -- my_migration_name
```

Pattern: `migrations/{timestamp}_my-migration-name.js`

## Common Commands

```bash
# Backend
cd backend && npm run dev      # Start dev server
cd backend && npm test         # Run tests
cd backend && npm run lint     # Lint code

# Frontend
cd frontend && npm run dev     # Start dev server
cd frontend && npm test        # Run tests
cd frontend && npm run build   # Production build

# Database
cd backend && npm run migrate:up    # Run migrations
cd backend && npm run migrate:down  # Rollback last migration
```

## Environment Variables

Required in `.env.development` or `.env.production`:
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Auth token signing key
- `GEMINI_API_KEY` - Google Gemini API key

Optional:
- `REDIS_URL` - Redis connection (falls back to in-memory)
- `STRIPE_SECRET_KEY` - Stripe API key for subscriptions
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook verification
