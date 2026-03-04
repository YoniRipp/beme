# BeMe Codebase Review

Deep review of the website, backend, mobile app, and overall architecture — with prioritized, actionable suggestions.

---

## 1. Architecture & System Design

### 1.1 schema.ts Is a Ticking Time Bomb

**Issue:** `backend/src/db/schema.ts` mixes `CREATE TABLE IF NOT EXISTS` with dozens of `ALTER TABLE ADD COLUMN IF NOT EXISTS` calls wrapped in `.catch(() => {})`. This runs on every server startup, silently swallows errors, and makes it impossible to know the actual schema state of any given environment.

**Impact:** A failed `ALTER TABLE` is swallowed. You can't reproduce bugs if schema state diverges between environments. New developers have no way to understand what the "real" schema is.

**Recommendation:** Freeze `schema.ts` — stop adding to it. Move all future changes exclusively through `node-pg-migrate` (which already exists in `/backend/migrations/`). Create a single migration that represents the full current schema as the baseline, then delete the imperative ALTER logic. Set `SKIP_SCHEMA_INIT=true` in production and use migrations exclusively.

**Files:** `backend/src/db/schema.ts`, `backend/migrations/`

---

### 1.2 The Architecture Docs Promise More Than the Code Delivers

**Issue:** `docs/architecture-principles.md` and `docs/bounded-contexts.md` describe a mature event-driven system with strict bounded contexts. In reality:
- Events labeled "future" (e.g., `identity.UserRegistered`) are not implemented
- Cross-context reads happen via direct DB queries (shared `DATABASE_URL`), not via APIs
- Event consumers (`statsAggregator`, `userActivityLog`) are thin — most domain logic still lives in synchronous request paths

**Impact:** The docs create false confidence. A new developer reads them and assumes guardrails that don't exist, then accidentally introduces cross-context coupling.

**Recommendation:** Update `bounded-contexts.md` to mark which events are implemented vs. planned. Add a "Current Shortcuts" section listing where cross-context reads happen and when to fix them. Honest docs beat aspirational ones.

**Files:** `docs/bounded-contexts.md`, `docs/architecture-principles.md`

---

### 1.3 No Database Transactions Where They Matter

**Issue:** Many write paths (create workout, create food entry, voice executor actions) perform multiple DB operations without wrapping them in a SQL transaction. The voice executor calls multiple domain writes sequentially — if the second fails, the first isn't rolled back.

**Impact:** A voice command like "Add a workout and log 500 calories" could succeed on the workout but fail on the food entry, leaving data inconsistent.

**Recommendation:** Create a `withTransaction(pool, callback)` utility. Use it in the voice executor and any multi-row write. The pool already supports `client.query('BEGIN')` as shown in `schema.ts`.

**Files:** `backend/src/services/voiceExecutor.ts`, `backend/src/db/pool.ts`

---

### 1.4 No API Versioning

**Issue:** All endpoints live at `/api/...` with no version prefix.

**Impact:** When you need to change a response shape, you'll either break existing clients or add ugly conditional logic.

**Recommendation:** Add `/api/v1/` prefix now while the cost is near-zero. Update `frontend/src/core/api/client.ts` to prepend it. This pays off when the mobile app is in production and you can't force-update all clients simultaneously.

**Files:** `backend/src/routes/index.ts`, `frontend/src/core/api/client.ts`

---

## 2. Backend

### 2.1 JWT in localStorage — No Refresh Token

**Issue:** JWT is stored in `localStorage` with a 7-day expiry. No refresh token mechanism. On 401, the user is logged out completely.

**Impact:** If a token is stolen (XSS), the attacker has 7 days of access. There's no way to revoke a compromised token. Users are forcefully logged out every 7 days.

**Recommendation:** Short-lived access tokens (15-30 min) + HTTP-only refresh tokens. The refresh token should be stored in an HTTP-only, Secure, SameSite=Strict cookie. Implement `POST /api/auth/refresh` and have the frontend API client auto-refresh on 401 before retrying. This is the single biggest security improvement available.

**Files:** `backend/src/routes/auth.ts`, `backend/src/middleware/auth.ts`, `frontend/src/core/api/client.ts`, `frontend/src/context/AuthContext.tsx`

---

### 2.2 Silent .catch(() => {}) Everywhere

**Issue:** `schema.ts` and several other places use `.catch(() => {})` to swallow errors completely.

**Impact:** Real failures hide. A silent failure in schema initialization or event consumption can cause data loss discovered much later.

**Recommendation:** At minimum, `.catch((e) => logger.warn({ err: e }, 'non-fatal ...'))`. For schema operations, use migrations instead (1.1). For event consumers, log the error with the event payload so you can replay it.

**Files:** `backend/src/db/schema.ts`, `backend/src/events/consumers/`

---

### 2.3 Inconsistent Model Layer

**Issue:** The model layer (`backend/src/models/`) is clean — parameterized queries, well-structured functions. But some controllers and routes bypass models and write raw SQL directly (admin routes, some auth queries).

**Impact:** Duplicated query logic, harder to maintain, higher risk of SQL errors in less-tested paths.

**Recommendation:** Enforce the convention: all SQL goes through model files. Controllers call services, services call models. This is mostly followed — just tighten the few places where it's not.

**Files:** `backend/src/routes/auth.ts` (inline queries), `backend/src/routes/admin.ts`

---

### 2.4 Rate Limiting Gaps

**Issue:** Auth routes have stricter rate limits (10/15min), but several sensitive endpoints lack specific limits:
- `POST /api/voice/understand` — calls Gemini (expensive)
- `POST /api/auth/forgot-password` — can be used for email probing
- Bulk endpoints

**Impact:** An attacker can burn through your Gemini API quota. Password reset can be used to spam users.

**Recommendation:** Add per-user rate limits for expensive operations. For voice, consider 20 requests per hour per user. For forgot-password, the endpoint already returns success regardless — but add rate limiting to prevent email spam.

**Files:** `backend/app.ts`, `backend/src/routes/voice.ts`, `backend/src/routes/auth.ts`

---

### 2.5 No OpenAPI/Swagger Documentation

**Issue:** No machine-readable API documentation. Routes are self-documenting by file structure but there's no Swagger UI or OpenAPI spec.

**Impact:** Frontend and mobile developers read backend source code to understand API contracts. No auto-generated client SDKs.

**Recommendation:** Add `zod-to-openapi` to generate an OpenAPI spec from the Zod schemas in `backend/src/schemas/`. The validation schemas are already a strong foundation — leverage them for documentation too.

**Files:** `backend/src/schemas/`, `backend/app.ts`

---

### 2.6 Gemini API Has No Circuit Breaker

**Issue:** Voice requests call Google Gemini synchronously. If Gemini is slow or down, requests hang for the full 30s timeout. No circuit breaker to fail fast after repeated failures.

**Impact:** A Gemini outage makes the voice feature unresponsive and ties up server connections.

**Recommendation:** Add a circuit breaker (e.g., `opossum` library) around Gemini calls. After N consecutive failures, fail fast for a cooling period. Set an explicit timeout shorter than the HTTP timeout (e.g., 15s for Gemini vs 30s for HTTP) so the server can return a meaningful error.

**Files:** `backend/src/services/voice.ts`, `backend/src/services/foodLookupGemini.ts`

---

## 3. Frontend (Website)

### 3.1 Eight Context Providers Is Too Many

**Issue:** `Providers.tsx` nests multiple context providers: Auth, App, Workout, Energy, Goals, Notification. Each wraps TanStack Query mutations. Any state change in a provider re-renders all its children.

**Impact:** Performance degradation as the app grows. The 140+ `useMemo`/`useCallback` calls are symptoms of fighting this architecture.

**Recommendation:** You already use TanStack Query — lean into it. Replace domain contexts (Workout, Energy, Goals) with custom hooks that call React Query directly. Keep AuthContext and AppContext (they hold true client state). This eliminates provider nesting and gives automatic render optimization from React Query's selector support.

Example: Replace `WorkoutContext` with `useWorkouts()`, `useAddWorkout()`, `useUpdateWorkout()` hooks that call React Query directly. The `features/body/` folder already has the API layer — wire hooks to it without the Context wrapper.

**Files:** `frontend/src/Providers.tsx`, all domain context files in `frontend/src/context/`, `frontend/src/hooks/`

---

### 3.2 No Error Recovery for Network Failures

**Issue:** On 401, the client dispatches a logout event. For other network errors (timeout, 500, offline), React Query retries once then shows an error state. No retry button on most data-fetching components.

**Impact:** On flaky mobile connections (especially via Capacitor), users see error states frequently with no way to recover.

**Recommendation:** Add a global query error handler in `queryClient.ts` that shows a toast for network errors. Add a `RetryBanner` component that appears when queries fail, with a "Retry" button that calls `queryClient.invalidateQueries()`.

**Files:** `frontend/src/lib/queryClient.ts`, `frontend/src/components/shared/`

---

### 3.3 Capacitor + Expo = Two Competing Native Strategies

**Issue:** `frontend/` uses Capacitor to wrap the React web app as a native app. `mobile/` uses Expo/React Native for a truly native app. Two completely different approaches to the same problem.

**Impact:** Maintaining two native codebases doubles the work. Feature parity will drift.

**Recommendation:** Pick one:
- **Option A (Recommended for current stage):** Double down on Capacitor. The web app is already feature-complete with PWA support. Capacitor wraps it as a native app with access to native APIs. Delete `/mobile`. One codebase, one deployment pipeline.
- **Option B:** If native performance matters (complex animations, offline-first), invest in React Native + Expo. Set up a monorepo with shared packages (`packages/shared/` with types, validation, API client, constants).

**Files:** `frontend/package.json` (Capacitor deps), `mobile/` (entire directory)

---

### 3.4 No Centralized Error Logging

**Issue:** `ErrorBoundary.tsx` has a comment `// TODO: Log to external service (e.g. Sentry, LogRocket)`. Frontend errors are only visible if users report them.

**Impact:** Zero visibility into client-side errors, failed API calls, and rendering issues.

**Recommendation:** Add Sentry (free tier is sufficient). ~10 lines to set up, gives error grouping, stack traces, user context, and release tracking. Wire it into the error boundary and the API client's catch blocks.

**Files:** `frontend/src/components/shared/ErrorBoundary.tsx`, `frontend/src/core/api/client.ts`, `frontend/src/main.tsx`

---

### 3.5 The Dashboard Fetches Too Much Data

**Issue:** `Home.tsx` renders `QuickStats` and other dashboard components. Each triggers its own React Query fetch. On initial load, this fires multiple parallel API requests.

**Impact:** Slow initial load, especially on mobile.

**Recommendation:** Create a dedicated `GET /api/v1/dashboard` backend endpoint that aggregates home screen data in a single response. The `user_daily_stats` table already exists for this purpose — leverage it.

**Files:** `frontend/src/pages/Home.tsx`, `frontend/src/components/home/`, `backend/src/db/schema.ts` (user_daily_stats)

---

### 3.6 Accessibility Gaps

**Issue:** Radix UI provides solid baseline accessibility, but:
- No skip-navigation link
- Color contrast hasn't been audited (Sage/Cream palette may have issues at smaller font sizes)
- Charts (Recharts) have no screen-reader alternatives
- Voice agent UI lacks ARIA live regions for status updates

**Recommendation:** Run a Lighthouse accessibility audit and fix the top issues. Add `aria-live="polite"` to the voice agent panel. Add data tables as alternatives to chart visualizations.

**Files:** `frontend/src/components/voice/VoiceAgentPanel.tsx`, `frontend/src/components/layout/`, chart components

---

## 4. Mobile App

### 4.1 The Mobile App Is a Skeleton — Decide Its Fate

**Issue:** `/mobile` has 10 screens, but they're bare-bones (HomeScreen shows item counts, no forms, no charts, no voice). It uses React Native + Expo while web uses React + Capacitor. Completely different stacks with duplicated auth and API layers. Uses Zod v4 while web uses Zod v3.

**Impact:** Maintaining this alongside the web + Capacitor app is pure overhead with no user benefit.

**Recommendation:** See 3.3 above. If you choose Capacitor (recommended), archive `/mobile`. If you choose React Native, commit to it properly: monorepo with shared packages, align Zod versions, build screens to feature parity.

**Files:** `mobile/` (entire directory), `mobile/package.json` (Zod v4 vs frontend's Zod v3)

---

## 5. Voice Architecture — Handling Ambiguous Commands

### 5.1 Recommended Approach: One Gemini Call + pgvector

The voice system needs to handle commands like "I drank zero" where:
1. **Disambiguation**: "zero" → "Coca-Cola Zero" (world knowledge)
2. **Serving inference**: "drank" → most likely a can → 330ml (common sense)
3. **Nutritional lookup**: Coca-Cola Zero 330ml → exact calories/macros (data problem)

**Architecture:**

```
"I drank zero"
    │
    ▼
┌─────────────────────────────────────────────────┐
│  Gemini Call (enhanced function schema)          │
│  - Disambiguate: "zero" → "Coca-Cola Zero"      │
│  - Infer serving: "drank" → can → 330ml         │
│  - Output: {                                     │
│      name: "Coca-Cola Zero",                     │
│      serving_size: 330,                          │
│      serving_unit: "ml",                         │
│      serving_type: "can"                         │
│    }                                             │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  pgvector similarity search on `foods` table     │
│  Embed "Coca-Cola Zero" → cosine similarity      │
│  → find closest match → per-100ml nutritional    │
│    values (calories, protein, carbs, fat)        │
└──────────────────┬──────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────┐
│  Calculate: 330ml × (per-100ml values)           │
│  → Create food_entry with accurate macros        │
└─────────────────────────────────────────────────┘
```

**Why this beats two Gemini calls:**

| Factor | 2x Gemini | 1x Gemini + pgvector |
|--------|-----------|----------------------|
| Latency | ~3-6s (sequential) | ~2-3s + ~5ms |
| Cost | 2x Gemini tokens | 1x Gemini + negligible DB |
| Nutritional accuracy | Gemini guesses (unreliable) | Curated `foods` table (reliable) |
| Personalization | None | Can weight toward user's previous entries |

**Why not pure pgvector:** Disambiguation ("zero" → "Coca-Cola Zero") is a language/world-knowledge problem. No amount of vector similarity resolves "zero" to "Coca-Cola Zero" unless you've pre-embedded every colloquial alias. Gemini handles the fuzzy human stuff; pgvector handles the precise data stuff.

### 5.2 Implementation Details

**Enhance the voice function schema** in `backend/src/services/voice.ts`:

Add to the food entry function call parameters:
- `product_brand` (optional) — "Coca-Cola" separately from "Zero"
- `serving_type` — "can", "bottle", "cup", "glass", "serving"
- `serving_amount_ml` — inferred volume in ml
- `confidence` — how confident Gemini is in the disambiguation

Add few-shot examples to the system prompt:
```
User: "I drank zero" → name: "Coca-Cola Zero", serving_type: "can", serving_amount_ml: 330
User: "had a sprite" → name: "Sprite", serving_type: "can", serving_amount_ml: 330
User: "drank 2 liters of water" → name: "Water", serving_type: "bottle", serving_amount_ml: 2000
```

**pgvector lookup flow** (after Gemini returns structured output):
1. Generate embedding for the identified product name
2. `SELECT * FROM foods ORDER BY embedding <=> $1 LIMIT 3` — get top 3 candidates
3. If confidence is high and top match similarity > 0.85, use it directly
4. If ambiguous, return candidates to the user for selection
5. Calculate nutrition: `serving_amount_ml / 100 * per_100_values`

**Embed the `foods` table:** When a food item is created or updated, generate and store its embedding in `user_embeddings` (or a dedicated `food_embeddings` table). Include the food name, brand, and any aliases in the embedding text. This makes the pgvector lookup fast and accurate.

**Files:** `backend/src/services/voice.ts`, `backend/src/services/foodLookupGemini.ts`, `backend/src/models/food.ts`, `backend/src/db/schema.ts` (user_embeddings table already exists)

---

## 6. Cross-Cutting Concerns

### 6.1 Testing: Good Foundation, Critical Gaps

**Issue:** ~50 test files total with solid patterns, but:
- No end-to-end tests (Playwright/Cypress)
- No integration tests that hit a real database
- Event consumers tested in isolation — no test verifies full publish-consume cycle
- Voice executor has no test for multi-action scenarios

**Recommendation (priority order):**
1. Add Playwright E2E tests for top 3 user flows (auth, add/view workout, voice command)
2. Add integration tests for event publish-consume cycle (test Redis instance)
3. Add multi-action voice executor tests

**Files:** Add `e2e/` directory at project root, `backend/src/events/`

---

### 6.2 CI/CD Pipeline Is Minimal

**Issue:** `.github/workflows/ci.yml` runs lint + test on push. Missing:
- Staging deployment
- Database migration check
- Bundle size check
- `npm audit` in CI

**Recommendation:** Add to CI:
1. `npm audit --audit-level=high`
2. Bundle size comparison (`bundlesize` or Vite's built-in report)
3. Migration dry-run against a test DB
4. Auto-deploy to staging on merge to main

**Files:** `.github/workflows/ci.yml`

---

### 6.3 No Deep Health Check

**Issue:** `/health` likely returns 200 without verifying database, Redis, or Gemini connectivity.

**Recommendation:** Enhance to perform a lightweight DB query (`SELECT 1`), Redis PING, and return degraded status if non-critical services are down.

**Files:** `backend/app.ts`

---

### 6.4 No Product Analytics

**Issue:** No product analytics (Mixpanel, PostHog, Amplitude) for understanding user behavior.

**Impact:** Building features blind — don't know which features users actually use or where they drop off.

**Recommendation:** Add PostHog (open-source, generous free tier). Track: sign up, feature usage by domain, voice command success rate, subscription conversion.

**Files:** `frontend/src/lib/analytics.ts`, `frontend/src/main.tsx`

---

## 7. Priority Order

### Do First (high impact, reasonable effort):
1. **Fix JWT security** (2.1) — Short-lived tokens + HTTP-only refresh cookies
2. **Freeze schema.ts** (1.1) — Migrate to node-pg-migrate exclusively
3. **Pick one native strategy** (3.3/4.1) — Capacitor or React Native, not both
4. **Replace domain Contexts with React Query hooks** (3.1) — Biggest frontend perf win
5. **Add Sentry** (3.4) — 30 minutes, visibility forever

### Do Next (medium term):
6. **Enhance voice with pgvector** (5.1/5.2) — Better disambiguation + accurate nutrition
7. **Add E2E tests** (6.1) — Playwright for top 3 flows
8. **Add circuit breaker for Gemini** (2.6) — Protect against third-party outages
9. **Dashboard aggregation endpoint** (3.5) — Single request instead of 5-8
10. **Align architecture docs with reality** (1.2) — Honest docs prevent bad assumptions
11. **Add database transactions** (1.3) — Data integrity for multi-write operations

### What's Actually Fine As-Is:
- **Express + raw SQL** — Model layer is clean, no ORM needed
- **The event system** — Works, well-documented, solid envelope schema
- **Tailwind + Shadcn** — Modern, maintainable, accessible by default
- **Feature-based file organization** — Both frontend and backend are well-organized
- **Zod everywhere** — Consistent validation across the stack
- **Pino logging** — Structured, performant, good choice

### What's Over-Engineered for Current Stage:
- **Microservice extraction infrastructure** (5 standalone service files, per-context DB URLs, SQS transport) — Running as a monolith on Railway. The extraction code adds complexity without current benefit. Keep the docs as a roadmap but don't maintain unused code paths.
- **pgvector** is NOT over-engineered — see section 5 for its real use case in voice disambiguation
