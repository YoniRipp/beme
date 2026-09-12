# Mobile Foundation — Shaping Notes

## Why this exists

`mobile/` is being brought to feature parity with `frontend/`. The decision was taken on
2026-09-12 against a measured audit rather than an estimate: **162 feature gaps** (81 small,
50 medium, 31 large) and a **32 engineer-week** midpoint, honest range 24–44.

The Capacitor route — wrapping the existing web client, which is already configured in
`frontend/capacitor.config.ts` with the Android shell generated — was evaluated and
**deliberately rejected** in favour of a real React Native client. The owner accepted the cost
knowing the reuse rate is near zero: 131 of 143 non-test `.tsx` files in `frontend/` use
`className=`, and Tailwind, Radix, Recharts and react-router have no RN equivalent.

This is recorded so the trade-off is not re-litigated later. It was made with the numbers in hand.

## Scope

This is **sub-project 1 of 8**. Foundation only — no feature porting. The other seven
(food, workouts, goals, health trackers, insights, voice, account) each get their own
spec → plan → build cycle.

Product scope, per the owner: **personal + friends now, App Store later.** That means no
marketing pages (Landing, Pricing, Terms, Privacy, About, Contact) and no admin screens.
Subscription gating is *kept at the API layer* so the paywall is additive later rather than
a rewrite. Distribution to friends requires TestFlight, which requires the Apple Developer
Program at $99/year — the same pipeline the App Store will later use.

## Decisions

### Shared code lives in a real npm workspace

Root `package.json` gains `workspaces: ["frontend", "backend", "mobile", "packages/*"]`,
and the shared layer becomes `packages/shared`.

A lighter alternative — a plain `shared/` directory with per-consumer path aliases — was
proposed and rejected by the owner in favour of conventional workspace tooling. The cost of
that choice is Metro: React Native's bundler needs `watchFolders` pointed at the monorepo
root, explicit `nodeModulesPaths`, and `disableHierarchicalLookup`, and symlinked workspace
packages are a known source of RN build failures.

**Therefore the workspace plumbing lands first, on its own, and all three packages must still
build before a single file moves.** If Metro cannot be made to resolve the workspace cleanly,
fall back to path aliases rather than fighting it — the goal is one definition of the types,
not a particular module-resolution strategy.

### What crosses into `packages/shared`

| Subpath | Contents |
|---|---|
| `types/` | workout, energy, goals, user, api — already duplicated across both clients today |
| `schemas/` | Zod request/response schemas |
| `api/` | transport + per-domain modules |
| `domain/` | mappers, date/unit/nutrition helpers, meal inference, workout templates |

Nothing that touches the DOM, `className`, react-router or Recharts crosses the line. The
audit found ~700 of the web's 4,254 body-area lines are already platform-agnostic, so this is
extraction, not invention.

Sharing the **Zod schemas** is where this pays for itself. One schema consumed by both clients
is what would have caught the `user_profiles` NOT NULL drift that broke onboarding.

### The API client takes an injected token provider

Web authenticates with an HTTP-only cookie plus an in-memory bearer; mobile uses a bearer held
in `expo-secure-store`. Rather than teach the shared client both, it takes a **token provider
and base URL as injected dependencies** and each client supplies its own.

Mobile's model is the better one and should not be "corrected" toward the web's: a SecureStore
token survives a cold start, and the web's in-memory token does not.

The backend already returns the token in the login body and accepts `Authorization: Bearer`
(`backend/src/middleware/auth.ts`), so no backend change is needed.

### Design tokens get a single source

The two clients look like different products. `frontend/` is Tailwind/shadcn on a paper-warm
palette with Fraunces + Inter and a named elevation scale; `mobile/` is `react-native-paper`
Material Design 3 with a hand-rolled hex palette, system fonts, and no typography or shadow
scale.

Tokens move to `packages/shared/tokens` and are consumed by the Tailwind config on web and an
RN theme object on mobile. This is invisible on a parity checklist and consumes real time, so
it is called out here as scope rather than discovered later.

### A test harness is part of Foundation, not a follow-up

`mobile/` has no test runner and no test files. `frontend/` has 36 suites, 4,504 lines of
tests, and Playwright E2E. Foundation stands up `jest-expo` + React Native Testing Library.

With 162 items to follow, porting without a safety net is not defensible.

### Four existing bugs are fixed here, not later

All three were verified by reading the code, not inferred. They are data-correctness defects
in code that already ships, and the first is actively destructive:

1. **Per-set workout data is destroyed on edit.** `mobile/src/screens/WorkoutFormScreen.tsx`
   rebuilds each exercise as `{name, sets, reps, weight, notes}`, and `ApiWorkout` in
   `mobile/src/core/api/workouts.ts` omits `repsPerSet` / `weightPerSet` / `completedPerSet`
   entirely. Editing on mobile a workout that was logged per-set on web **wipes** the per-set
   reps, weights and completion flags.
2. **Food totals silently truncate.** `mobile/src/core/api/food.ts:21` calls
   `/api/food-entries` with no `limit` or `offset`, so the backend's default of 50 caps what
   the client ever sees. Weekly, monthly and yearly totals are wrong beyond that cutoff.
3. **Drinks and per-unit foods get wrong macros.** `FoodEntryFormScreen` hard-codes
   `portionUnit: 'g'` and scales by `/100`, ignoring `referenceGrams`, `isLiquid`,
   `servingSizesMl`, `defaultUnit` and `unitWeightGrams` — all of which the same endpoint
   returns and which `frontend/src/components/energy/FoodEntryModal.tsx` honours correctly.

4. **"Clear All Data" silently does nothing.** `mobile/src/screens/SettingsScreen.tsx:61`
   passes `onConfirm={() => setShowClearDialog(false)}`. The dialog promises "This will
   permanently delete all your workouts, food entries, sleep logs, and goals" and then closes
   without deleting anything. Either wire it to the real endpoints or remove the control —
   a destructive confirmation that lies is worse than no control.

Fixing these first also means the shared `domain/` helpers are extracted from the *correct*
implementation (the web's) rather than the broken one.

### Five web files must not be ported

`CalorieTrendChart.tsx`, `CaloriesEditModal.tsx`, `EnergyChart.tsx`, `WellnessCard.tsx` and
`DailyCheckInModal.tsx` under `frontend/src/components/energy/` have no importers anywhere in
`frontend/src`. They are dead. The calorie trend users actually see comes from
`lib/analytics.getCalorieTrendData` on the Insights page.

## Out of scope

- Any feature porting — that is sub-projects 2–8.
- The paywall UI, marketing pages and admin screens (see Scope).
- Real-time voice streaming. A spike on 2026-09-12 proved mic capture, file read, WebSocket
  connect (52ms) and binary frame send all work in Expo Go, which covers the **batch** voice
  path. Continuous PCM streaming has no path in Expo Go — `AudioRecorder` exposes only
  `record()`, `stop()` and a file URI, with no live-sample callback — so it needs a native
  module and a development build. That decision belongs to the voice sub-project.

## Success criteria

1. `packages/shared` exists and is imported by `frontend`, `backend` and `mobile`.
2. All three packages build, and `frontend`'s existing 36 test suites still pass unchanged.
3. `mobile` has a working test runner with all four bug fixes covered by tests.
4. Types and Zod schemas have exactly one definition in the repo.
5. The Expo app still launches, signs in, and navigates — verified on the simulator.

The hard constraint throughout is CLAUDE.md rule #1: **never break existing functionality.**
`frontend/` is the live client with real users. Every step is reversible on its own.
