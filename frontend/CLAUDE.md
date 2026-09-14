# Frontend

React 19 SPA built with Vite, TypeScript, React Query, Tailwind CSS, and shadcn/ui.
Ships as the web app and the PWA (`src/sw.ts`). Native iOS/Android is **not** this
package any more — that is `mobile/` (Expo). The Capacitor shell here is legacy: nothing
in CI builds it, `ios/` is not in the repo, and `@capacitor/cli` is a major behind its
runtime, so `cap add ios` produces a project that will not compile. Don't reach for it.

## Commands
- Dev server: `npm run dev`
- Typecheck: `npx tsc --noEmit`
- Build: `npm run build`
- Tests: `npx vitest run`
- E2E tests: `npx playwright test`
- Capacitor (legacy shell, unmaintained): `npm run cap:sync`, `npm run cap:ios`, `npm run cap:android`

## E2E ports

`npx playwright test` needs no setup: it starts both dev servers itself, on ports **derived
from this checkout's path** — not 5173 and 3000. The run prints them on its first line
(`[e2e] app http://localhost:… · api http://localhost:…`).

They are derived because the repo is worked in many git worktrees at once. When every
worktree named 5173, Playwright's `reuseExistingServer` reused whichever dev server got there
first and reported *that* checkout's behaviour against your branch — silently, in both
directions. `globalSetup` now also asks each running server which checkout it is serving
(`/__e2e/identity` on Vite, `checkout` in the API's `/health`) and aborts the run naming the
other checkout if it is not this one.

| Env var | Effect |
|---|---|
| `E2E_FRONTEND_PORT` | Pin the app's port instead of deriving it |
| `E2E_BACKEND_PORT` | Pin the API's port instead of deriving it |
| `SKIP_BACKEND=1` | Don't start or check an API server; the app falls back to `:3000` |
| `E2E_ALLOW_FOREIGN_SERVER=1` | Turn an identity mismatch into a warning instead of a failure |

The two flags take `1` or `true` and nothing else, so `SKIP_BACKEND=0` means off rather than on.
The API server the run starts is passed `SEPARATE_WORKERS=true`: it shares your `DATABASE_URL`
and Redis, and a second voice worker would take jobs off your own backend's queue.

Nothing about this runs in CI — CI does not run Playwright at all. It is a local-only guard.

The mechanics live in `e2e/support/servers.ts`.

## Architecture
- `src/routes.tsx` — route table; `src/App.tsx` and `src/Providers.tsx` wrap the tree
- `src/pages/` — page components. App pages: `Home`, `Body` (workouts), `Energy`
  (food/journal), `Water`, `Goals`, `Insights`, `Settings` (the Profile tab),
  `Admin` (+ `pages/admin/`). Auth: `Login`, `Signup`,
  `ForgotPassword`, `AuthCallback`. Marketing: `Landing`, `Pricing`, `About`,
  `Contact`, `Privacy`, `Terms`, `NotFound`.
- `src/components/` — UI organized by domain: `layout/`, `home/`, `body/`, `energy/`,
  `goals/`, `insights/`, `chat/`, `voice/`, `admin/`, `onboarding/`,
  `subscription/`, `marketing/`, `settings/`, `pwa/`, `shared/`, `ui/`, `auth/`
- `src/components/ui/` is **the** design system — shadcn primitives (`dialog`, `sheet`,
  `input`, `select`, …) plus the app's own (`card`, `page`, `progress-ring`, `quick-tile`,
  `audio-wave`). Reach for one of these before writing a styled div. `shared/` is for
  composite helpers (`EmptyState`, `ContentWithLoading`, `ImagePlaceholder`), not for a
  second set of primitives.
- `src/hooks/` — React Query data hooks (`useWorkouts`, `useGoals`, `useEnergy`,
  `useWater`, `useWeight`, `useCycle`, `useStreaks`, `useExercises`, `useSubscription`, …)
  plus device hooks (`useSpeechRecognition`, `useNativeSpeech`, `useIsMobile`, …)
- `src/context/` — `AppContext`, `AuthContext`, `NotificationContext`
- `src/features/` — feature-scoped logic: `auth/`, `body/`, `energy/`, `goals/`,
  `settings/`
- `src/core/api/` — typed API clients per domain (`workouts`, `food`, `goals`, `chat`,
  `aiInsights`, `exercises`, `admin`, `subscription`, `push`, `health`, `users`, `auth`)
- `src/lib/` — utilities: date ranges, storage, offline sync queue, analytics, feature
  flags, push subscription, voice helpers, theme palette
- `src/schemas/` — Zod schemas shared by forms and API payloads

## Patterns
- Path alias: `@/` maps to `src/`
- Data fetching: React Query hooks in `src/hooks/`; keys follow `[domain, ...params]`
- API calls go through `src/core/api/` — don't call `fetch` from components
- UI: Tailwind utility classes + shadcn/ui components
- Routing: React Router with lazy-loaded pages
- State: React Query for server state, React Context for shared client state
- Navigation: tab set defined in `components/layout/Base44Layout.tsx`, rendered by
  `components/layout/BottomNavigation.tsx` — Home, Workouts, Food, Profile, the same for
  every user, with a center mic button
- Missing images render `components/shared/ImagePlaceholder.tsx` — there are no
  placeholder image assets
- Tests: Vitest + React Testing Library for unit tests, Playwright for E2E
