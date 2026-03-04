# BMe

Full-stack wellness app: body, energy, goals, groups, voice.

## Stack
- Backend: Node/Express, TypeScript, PostgreSQL, optional Redis
- Frontend: React 18, Vite, TypeScript, React Query, Tailwind, shadcn/ui
- Voice: Google Gemini; audio requires Redis + BullMQ

## Commands
- Backend dev: `cd backend && npm run dev`
- Frontend dev: `cd frontend && npm run dev`
- Backend typecheck: `cd backend && npx tsc --noEmit`
- Frontend typecheck: `cd frontend && npx tsc --noEmit`
- Frontend tests: `cd frontend && npx vitest run`
- E2E tests: `cd frontend && npx playwright test`

## Architecture
- Backend: controllers (src/controllers/) -> services (src/services/) -> models (src/models/)
- Use asyncHandler wrapper, sendJson/sendError from utils/response
- Frontend: hooks in src/hooks/, features in src/features/, @/ alias for src/
- Events: domain events published via src/events/publish.ts

## Conventions
- ES modules (import/export), not CommonJS
- Dates stored as YYYY-MM-DD strings
- API responses use sendJson/sendError helpers
- All DB access through models, never raw queries in controllers

## Interaction rules
- ALWAYS ask clarifying questions before starting implementation. Do not assume requirements.
- When given a vague request, break it into specific questions and present them before writing code.
- Confirm the scope, affected files, and approach before making changes.
- If a request could be interpreted multiple ways, ask which interpretation is correct.

## Architecture goals
This project follows a modular monolith pattern designed for incremental extraction:
- Each domain (body, energy, goals) can run as a standalone service
- The main app acts as an API gateway when *_SERVICE_URL env vars are set
- getPool(context) supports per-domain database URLs (BODY_DATABASE_URL, etc.)
- Event bus supports memory, Redis/BullMQ, and SQS transports (config-driven)
- Voice worker can run in-process or separately (SEPARATE_WORKERS=true)
- When adding new features, keep domain boundaries clean: own model, service, controller, events
- Never create cross-domain direct imports between service layers; use events for cross-domain communication

## Env vars needed
- DATABASE_URL, GEMINI_API_KEY, JWT_SECRET
- Optional: REDIS_URL (voice, rate limiting, events)

@README.md
