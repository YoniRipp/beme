# Changelog

All notable changes to this project are documented in this file. Releases and notable changes, latest first.

## [19.0] - 2026-03-04

### Removed
- **Groups feature** — Groups pages, API, and database tables removed (will be rethought in a future iteration)
- **AI Insights financial references** — Removed budget recommendations and transaction-based insights from the AI pipeline; replaced budget tip with sleep recommendation

### Changed
- AI Insights now focuses exclusively on wellness: workouts, nutrition, sleep, and general focus
- Today's Recommendations shows Workout, Sleep, Nutrition, and Focus tips (previously included Budget)

---

## [18.0] - 2026-03-04

### Removed
- Money (transactions) feature — income/expense tracking, balance, monthly charts
- Schedule feature — daily schedule items, calendar views, recurrence
- Savings goal type (depended on transaction data)
- Money and Schedule voice intents
- Gateway proxy for money-service and schedule-service

### Changed
- Dashboard now shows wellness-only content (goals progress, sleep)
- Navigation simplified to Home, Body, Energy, Goals
- Voice agent focused on workouts, food, sleep, and goals

---

## Update 17.0 — AI Insights, Food UX, Money, Animations

### AI Insights
- **Persistence** — AI-generated insights saved to `ai_insights` table; last insight shown on visit (no Gemini call when cached within 24h)
- **Refresh** — `POST /api/insights/refresh` to force regenerate; frontend "Refresh insights" button
- **Thinking animations** — "Analyzing your data…" and "Generating recommendations…" with animated dots during loading

### Food
- **Add food bug fix** — Trigger validation after selecting from search so "Add Food" button works
- **Liquid vs solid** — Backend returns `servingSizesMl`; liquid options: can, bottle (500ml), 1L, 1.5L, 2L, glass; solid presets: 50g, 150g, 200g, 1 portion (100g)
- **Look up with AI** — When search has no results, "Look up with AI" calls `POST /api/food/lookup-or-create`; populates form with nutrition and type

### Money
- **Heading deduplication** — Layout shows "Money"; page content shows only "Where does the money go?" (no duplicate title)

### Backend
- Migration `1730145600000_add-ai-insights.js` — `ai_insights` table (summary, highlights, suggestions, score, today_*)
- `GET /api/insights` — returns cached insight if fresh, else generates and saves
- `POST /api/insights/refresh` — force regenerate
- `foodSearch` model — returns `servingSizesMl` from foods table

---

## Update 16.0 — Documentation, run guides, and professional repo polish

Documentation overhaul and repo conventions to support contributors and deployment.

### Documentation

- **Technology flow** — Root README: client → gateway/main API → (optional proxy to context services) → PostgreSQL; event bus (Redis/SQS) and event consumer; voice pipeline and BullMQ.
- **Architecture diagram** — Updated mermaid: Event bus, Event Consumer process, optional Money/OtherSvcs; links to bounded-contexts, event-schema, architecture-principles.
- **Run guides** — [docs/RUNNING.md](docs/RUNNING.md) index; [docs/RUNNING-LOCAL.md](docs/RUNNING-LOCAL.md), [docs/RUNNING-RAILWAY.md](docs/RUNNING-RAILWAY.md), [docs/RUNNING-AWS.md](docs/RUNNING-AWS.md) for local, Railway, and AWS.
- **Docs index** — [docs/README.md](docs/README.md) for all docs.
- **Docs reorganization** — `SCALE-HARDEN-AWS.md` moved to `docs/scale-harden-aws.md`; all references updated.

### Environment

- **backend/.env.example** — Restored with full var list: PORT, DATABASE_URL, JWT_SECRET, CORS_ORIGIN, FRONTEND_ORIGIN, GEMINI_API_KEY, REDIS_URL, EVENT_TRANSPORT, EVENT_QUEUE_URL, AWS_REGION, per-context DB URLs, *_SERVICE_URL, auth vars.
- **frontend/.env.example** — Restored with VITE_API_URL, VITE_GOOGLE_CLIENT_ID, VITE_FACEBOOK_APP_ID.

### Professional repo conventions

- **LICENSE** — MIT License (TrackVibe contributors).
- **CONTRIBUTING.md** — Contribution flow, dev setup (link to RUNNING-LOCAL), code style, PR process.
- **CODE_OF_CONDUCT.md** — Contributor Covenant 2.1.
- **SECURITY.md** — Security vulnerability reporting (GitHub Security Advisories).
- **.editorconfig** — Shared indent, line endings, charset.
- **.gitattributes** — text=auto, linguist-generated for lockfiles, binary for images.
- **.github/PULL_REQUEST_TEMPLATE.md** — PR checklist (lint, test, docs, CI).
- **Root package.json** — version, license, repository, keywords; scripts: lint:backend, test:backend, test:all.
- **Dependabot** — Removed root directory (no deps); kept backend and frontend.
- **README** — Links to LICENSE, SECURITY, CONTRIBUTING, CODE_OF_CONDUCT; Root Scripts table includes lint:backend, test:backend, test:all.
- **CHANGELOG** — Header: "All notable changes to this project are documented in this file."

### Backend and frontend READMEs

- **backend/README.md** — Event-ready overview, event bus and consumers, per-context DB and extracted services, scripts (start:consumer, start:money, etc.), config table, testing (event schema, bus, SQS, write-paths, transactionAnalytics), API note (proxy when *_SERVICE_URL), changelog (event-driven migration).
- **frontend/README.md** — Gateway/single URL note; Data flow: API base URL may be gateway; no frontend changes.

---

## Update 15.0 — Event-driven migration (Plans 0–12)

Event bus, all write paths emit events, configurable transport (Redis/SQS), idempotency, transaction analytics consumer, event-consumer as separate process, per-context DB configuration, extracted Money/Schedule/Body/Energy/Goals services, gateway proxy. See [docs/bounded-contexts.md](docs/bounded-contexts.md), [docs/event-schema.md](docs/event-schema.md), [docs/architecture-principles.md](docs/architecture-principles.md).

---

## Docs: workflow and architecture diagrams

- Add `docs/WORKFLOW.md` (branches and tags, dev flow).
- Add `docs/architecture-current-railway-supabase.md` (current: Railway + Supabase).
- Add `docs/architecture-target-aws.md` (target: AWS).
- README: add "Branches and tags" section and link to workflow; add "Documentation" section with links to workflow and architecture docs.
- SCALE-HARDEN-AWS: add link to current and target architecture docs.

## Update 14.0 — Backend Architecture Refactor (planned)

**Note:** This refactor was planned but not yet implemented. The current backend remains a JavaScript monorepo with a single Express service.

Planned changes:
- **API Service**: HTTP handlers only, enqueues heavy work
- **Workers Service**: Queue consumers (voice, email, food)
- **Scheduler Service**: Cron jobs
- Full TypeScript migration with shared types via `@trackvibe/core`
- Queue abstraction (BullMQ for dev, AWS SQS for prod)
- Async voice API with job polling (partially implemented: `POST /api/voice/understand` returns jobId for audio, `GET /api/jobs/:id` for result)
- New packages: `packages/core`, `packages/api`, `packages/workers`, `packages/scheduler`
- Turborepo for monorepo builds

## Update 13.0 — Redis Integration

Adds optional Redis for:
- Distributed rate limiting (express-rate-limit + rate-limit-redis)
- Food search caching
- BullMQ voice queue (async audio processing)
- Job result storage

Backend runs without Redis when `REDIS_URL` is unset; uses in-memory rate limiting and sync-only voice (transcript only).

## Update 12.0 — Testing, security, observability, and data foundation

### Testing
- Backend tests: Vitest with unit tests for `src/utils/validation.js`, `src/services/appLog.js`, `src/services/transaction.js`
- CI: `.github/workflows/ci.yml` runs backend and frontend lint, test, build

### Security
- Helmet HTTP security headers
- Auth rate limit: 10 requests per 15 min for `/api/auth/login` and `/api/auth/register`
- Dependabot for dependency updates

### Observability
- Structured logging with Pino
- Health: `GET /health` (always 200); `GET /ready` (200 if DB and Redis reachable, else 503)

### Data
- node-pg-migrate migrations in `backend/migrations/`
- Export from API-backed data (TanStack Query cache)

## Update 11.0 — Infrastructure, resilience & security audit

Five-layer audit of backend, voice/AI, frontend, data, and security. See root README history for recommendations. Key items: connection pooling, indexing, N+1 fixes, CORS, CI/CD.

## Update 10.0 — Voice live, layout refresh, admin UI

- Voice Live (WebSocket at `/api/voice/live`): **now disabled** — code commented out; voice uses Browser Web Speech API → text → sync endpoint, or audio → async job when Redis enabled
- Layout: AppSidebar, Base44Layout, TopBar
- Admin page: AdminLogs, AdminUsersTable
- Graceful shutdown: SIGTERM/SIGINT handling

## Update 9.0

Schedule recurrence and appearance settings; voice executor and schedule types.

## Update 8.0

Food entry and voice improvements; FoodEntryModal, VoiceAgentButton/Panel, voiceActionExecutor.

## Update 7.0

Voice and food robustness, local date conventions, preparation column, Gemini fallback, workout exercises in voice schema, week convention (Sunday–Saturday), layout and UI updates.

## Update 6.x

Docker, MCP server, Zod, TanStack Query, React Hook Form adoption; voice and Dockerfile tweaks.

## Update 5.0

Monorepo layout: frontend moved into `frontend/`.

## Update 4.x

Backend restructure (controllers, services, models); frontend feature modules; voice and API integration.

## Update 3.0

Backend and MCP server added; frontend auth, voice panel, API client, contexts.

## Version 1.x

Initial project documentation and frontend refactors.
