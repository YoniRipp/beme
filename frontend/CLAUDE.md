# Frontend

React 18 SPA built with Vite, TypeScript, React Query, Tailwind CSS, and shadcn/ui.

## Commands
- Dev server: `npm run dev`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Tests: `npx vitest run`
- E2E tests: `npx playwright test`
- Capacitor (mobile): `npm run cap:sync`, `npm run cap:ios`, `npm run cap:android`

## Architecture
- `src/pages/` -- Top-level page components (Home, Body, Energy, Goals, Insights)
- `src/hooks/` -- Data-fetching hooks (wrap React Query: useGoals, useWorkouts, useEnergy, etc.)
- `src/features/` -- Feature-specific logic (goals)
- `src/components/` -- Reusable UI components organized by domain (layout/, goals/, home/, energy/)
- `src/context/` -- React contexts (GoalsContext, WorkoutContext, EnergyContext)
- `src/lib/` -- Utilities (date ranges, API client)

## Patterns
- Path alias: `@/` maps to `src/`
- Data fetching: React Query hooks in `src/hooks/`, keys follow `[domain, ...params]` pattern
- UI: Tailwind CSS utility classes + shadcn/ui components
- Routing: React Router with lazy-loaded pages
- State: React Query for server state, React Context for shared client state
- Tests: Vitest + React Testing Library for unit tests, Playwright for E2E
