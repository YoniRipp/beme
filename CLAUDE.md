# BMe

Full-stack wellness app: body, energy, goals, voice.

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

## UI & Styling Guidelines
Informed by research of leading fitness apps (MyFitnessPal, Strava, Nike Training Club, Fitbit, Strong, WHOOP, Hevy). See [docs/fitness-app-research.md](docs/fitness-app-research.md) for full details.

- **Color encoding**: blue (#3B82F6) for body/workouts, orange (#F97316) for energy/food, indigo (#6366F1) for sleep, green (#22C55E) for goals. Keep sage primary and cream background as brand identity.
- **Typography**: bold headings (text-2xl font-bold), semibold subheadings (text-lg font-semibold), tabular-nums for all numeric values (calories, weights, reps, hours)
- **Hero metrics**: Large numbers (text-3xl+ font-bold) for key stats on dashboard — inspired by WHOOP/Fitbit. Numbers should be the visual anchor.
- **Cards**: consistent padding (p-4 md:p-6), subtle hover states (hover:border-primary/50), 200ms transitions, rounded-lg corners. Use colored left borders to indicate domain.
- **Data viz**: progress rings for goal completion (animate 0→current, 500ms ease-out), line charts with area fill for trends, bar charts for volume comparisons. Color-code per domain.
- **Spacing**: follow 8px grid (gap-2, gap-4, gap-6), generous whitespace between sections (space-y-6+). Restraint and whitespace signal premium quality.
- **Animations**: 150-300ms for transitions, 300-500ms for meaningful animations (progress fills, card entry). Use fadeUp with stagger for card lists. Skeleton shimmer loaders instead of spinners.
- **Dark mode**: all components must work in dark mode using semantic color tokens (bg-background, text-foreground). Not just inverted — needs custom dark palette.
- **Mobile**: large tap targets (min 44×44px / p-3), bottom-aligned primary actions, one-handed use patterns. Bottom nav for mobile, sidebar for desktop.
- **Dashboard layout**: status overview (progress rings) at top → trend charts below → detailed activity lists last
- **Premium feel**: generous spacing, high contrast text (4.5:1+), consistent border-radius, color restraint (1-2 brand colors + semantic domain colors), thoughtful empty states with illustration + CTA

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
