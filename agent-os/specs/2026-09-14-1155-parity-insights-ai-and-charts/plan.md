# Plan — Insights Parity: Charts First, Then the AI Half

Status: **proposed, not started.** This is a task write-up from a parity audit; no application
code has changed. Read `shape.md` first — in particular the correction to the going-in
assumption (Expo already has a charting library and three working charts) and the sizing table.

**Goal:** Expo's Insights screen shows what the web's does.

**Scope:** `mobile/` and `packages/shared`. `frontend/` changes in one place only — Task 3's
shared extraction, which must leave the web's rendered output byte-identical. No backend
change, no API change, no new endpoint.

**Shape of the work:** Phase A (Tasks 1–4) is a day and a half and depends on nothing. Phase B
(Tasks 5–8) is 2–3 days and **must not start until open question 1 in `shape.md` has an
answer**, because the answer changes what gets built. Phase C (Task 9) is the coach, and it is
sized separately because it is the largest single piece.

## Global constraints

- CLAUDE.md rule 1: never break existing functionality. Rule 4: don't change API shapes — the
  MCP server ships separately and consumes the same insight endpoints.
- `mobile/`'s Jest suites and `frontend/`'s Vitest suites green after every task.
- No inline hex in `mobile/` — AST guards in `src/theme/__tests__` fail the build.
- No new native module. The app runs in Expo Go and `mobile/CLAUDE.md` says keep it that way.
- Every task ends green and committed, and can be reverted on its own.

## File map

| File | Change |
|---|---|
| `mobile/src/screens/InsightsScreen.tsx` | `MobileScreen` wrapper, weight chart, full stats, trend badge, empty state, themed colours |
| `mobile/src/core/api/health.ts` | **new** — `weightApi`, mirroring the web's |
| `mobile/src/hooks/useWeight.ts` | **new** — query + `staleTime`, mirroring the web's |
| `mobile/src/lib/queryKeys.ts` | `weightEntries`, `aiInsights`, `aiTodayRecs`, `aiFreshness`, `chatHistory` |
| `mobile/src/components/shared/TrendBadge.tsx` | **new** — the web's badge in Paper's vocabulary |
| `mobile/src/core/api/aiInsights.ts` | **new** — Phase B; mirrors `frontend/src/core/api/aiInsights.ts` |
| `mobile/src/components/insights/*` | **new** — Phase B section components |
| `mobile/src/core/api/chat.ts` | **new** — Phase C |
| `packages/shared/src/domain/analytics.ts` | Phase A: the stat formatters, if Task 3 finds duplication worth moving |

---

## Phase A — the charts and stats Expo is missing (no gating questions)

### Task 1 — Weight progress

- [ ] `mobile/src/core/api/health.ts` with `weightApi.list()`, mirroring
      `frontend/src/core/api/health.ts`. `GET /api/weight-entries` already exists; it returns a
      bare array and accepts optional `startDate` / `endDate` filters plus optional pagination
      (`backend/src/controllers/weight.ts`).
- [ ] **Pass `startDate`** — 30 days back, the window the chart actually draws. The web calls
      it with no filter and slices to 30 client-side, which reads a user's whole weight history
      into a request path and is what CLAUDE.md rule 6 says not to do. Expo should use the
      filter the endpoint already supports. This is a deliberate, documented deviation from the
      reference; the web should follow later, filed separately rather than fixed here.
- [ ] `mobile/src/hooks/useWeight.ts` — React Query, key from `queryKeys`, **explicit
      `staleTime: 2 * 60 * 1000`** to match the web.
- [ ] Add `weightEntries` to `mobile/src/lib/queryKeys.ts`.
- [ ] Render the last 30 entries as a `LineChart`, sorted ascending by date, matching the web's
      `weightProgress` derivation in `frontend/src/pages/Insights.tsx`.
- [ ] Weight is kilograms (`global/domain-conventions`); label it.

### Task 2 — The stats the screen already has the numbers for

- [ ] Split the single Stats card into **Fitness** and **Health**, matching the web's grouping.
- [ ] Fitness gains most common workout type. Health gains sleep consistency (std dev, `1 dp`,
      "h std dev") and average macros (`P: {n}g | C: {n}g | F: {n}g`).
- [ ] Every one of these already comes back from the `getFitnessInsights` / `getHealthInsights`
      calls the screen makes today. No new data, no new request.
- [ ] Match the web's formatting exactly: calories `toFixed(0)`, sleep `toFixed(1)`.

### Task 3 — Trend badge, and one formatter if it earns its place

- [ ] `mobile/src/components/shared/TrendBadge.tsx` — Paper equivalent of
      `frontend/src/components/shared/TrendBadge.tsx`, taking `changePercent` and a label.
- [ ] Wire it above the workout frequency chart with
      `calculateTrends(workouts, () => 1, 'week')`, which `mobile/src/lib/analytics.ts` already
      re-exports and nothing uses.
- [ ] **Only if** the two badges end up with the same rounding/sign/threshold logic: move that
      pure part to `packages/shared/src/domain/analytics.ts` and have both import it. If the
      shared part is one `Math.round`, leave it alone — a shared module with one line in it is
      not worth the indirection.
- [ ] If anything moves, `frontend/`'s existing tests must pass **unchanged**. That is the proof
      the live client didn't move.

### Task 4 — Frame, empty state, colours

- [ ] Wrap the screen in `MobileScreen` with title "Patterns" and subtitle "Trends from your
      recent activity.", matching the web's `PageHeader`. Every other Expo tab already uses
      `MobileScreen`; this is the only one that doesn't. Using "Patterns" as the title also
      avoids repeating the navigator header's "Insights".
- [ ] Empty state condition widens to workouts **or** food **or** check-ins **or** weight,
      matching the web. Today a sleep-only user is told they have no data.
- [ ] Empty state adopts the web's copy — "No patterns yet" / "Log a few workouts and meals and
      your trends will show up here." — and gains an action that navigates Home, matching
      "Log something".
- [ ] Replace `color="#ef4444"` and `textColor="#fff"` with themed values via
      `useThemedStyles` / `useAppTheme`. `CHART_COLORS` in `mobile/src/lib/analytics.ts` stays
      as-is — it is the documented platform exception.
- [ ] While the file is open: render the fetch error instead of the empty state when a query
      fails. Neither client does this today (`shape.md` gap 5); fix Expo here and file the web
      side separately rather than smuggling a `frontend/` change into a mobile task.

---

## Phase B — the AI insights section

**Do not start until open question 1 is answered.** The answer determines whether Task 5 exists
at all.

### Task 5 — Make the subscription state visible to the client

- [ ] Add `subscriptionStatus` and `aiCallsRemaining` to `ApiUser` in
      `mobile/src/core/api/auth.ts` and stop dropping them in `apiUserToUser`
      (`mobile/src/context/AuthContext.tsx`). Both fields are already declared in
      `packages/shared/src/types/user.ts` and already returned by
      `backend/src/models/user.ts` — this is a mapper fix, not an API change.
- [ ] While there: `ApiUser.role` on mobile still includes `'trainer'`, which the 2026-08-15
      single-role spec removed everywhere else. Narrow it to `'admin' | 'user'`.
- [ ] `mobile/src/hooks/useSubscription.ts` exposing `isPro`, `hasAiAccess`, `aiCallsRemaining`
      — the same three the web computes. **No checkout on native**: the upgrade action opens the
      web checkout in an external browser (`Linking.openURL`), per open question 1's
      recommendation. Do not build native IAP under an Insights spec.

### Task 6 — The AI insights API client

- [ ] `mobile/src/core/api/aiInsights.ts` mirroring `frontend/src/core/api/aiInsights.ts`:
      `getInsights(days)`, `refreshInsights(days)`, `getTodayRecommendations()`,
      `getFreshness()`, `search(q)`.
- [ ] Add the keys to `mobile/src/lib/queryKeys.ts`. The web inlines
      `['ai-insights', periodDays]` and `['chat-history']` as string arrays, against
      `frontend/data-fetching`. Do not copy that — Expo centralises its keys.
- [ ] **Do not port the prefetch of all four periods.** The web fires three extra
      `GET /api/insights` calls on first success, each of which consumes a free-tier AI call
      (`shape.md` gap 4). Fetch the selected period only.
- [ ] **Do not poll freshness.** Until open question 3 is resolved, `GET /api/insights/freshness`
      costs a call per check. Refresh on explicit user action instead.
- [ ] Handle the two documented failures as states, not crashes: 403 `free_quota_exhausted`
      (show the upgrade card) and 503 (show "AI insights aren't configured", the web's copy).

### Task 7 — The section itself

- [ ] Wellness score ring — hand-rolled on `react-native-svg`, reusing the arc maths in
      `mobile/src/components/shared/ProgressRing.tsx`. Do not add a chart library for a circle.
      Colour thresholds match the web: ≥75 success, ≥50 warning, below that destructive, all
      from the theme.
- [ ] Summary, highlights (`✓`) and suggestions (`→`) lists, with the web's
      `replace(/\*\*(.*?)\*\*/g, '$1')` bold-stripping so raw markdown never reaches the user.
- [ ] Period selector 7/14/30/90. `mobile/src/components/shared/PeriodSelector.tsx` exists but
      is typed to the *goal* periods (daily/weekly/monthly/yearly) — either generalise it or
      write a small local one. Do not widen the goal type union to fit.
- [ ] Explicit refresh control, wired to `POST /api/insights/refresh`.
- [ ] Today's recommendations card — four rows, hidden entirely when the query errors, as the
      web does.
- [ ] Loading states: the web shows "Analyzing your data…" with skeleton lines rather than a
      spinner. Match the intent; Paper's `ActivityIndicator` alone is not it.

### Task 8 — Semantic search

- [ ] Search box + results list against `POST /api/search`, mirroring the web's `SearchBox`.
- [ ] **Not Pro-gated** (`backend/src/routes/search.ts` has no `requirePro`), so it renders for
      every user regardless of how open question 1 lands.
- [ ] Minimum three characters before searching, `staleTime: 30_000`, and the web's
      "no matching records" and "powered by semantic vector search" copy.

---

## Phase C — the AI coach

### Task 9 — Text-only chat

Sized separately: **3 to 4 days**, the largest single piece in this spec.

- [ ] `mobile/src/core/api/chat.ts` — `sendMessage`, `getHistory(50)`, `clearHistory`, against
      `POST /api/chat` and `GET`/`DELETE /api/chat/history`. All live.
- [ ] A modal screen registered in `mobile/src/navigation/RootNavigator.tsx`, following the
      `presentation: 'modal'` pattern the four form screens use. Not a bottom sheet — Expo has
      no sheet primitive and this spec is not introducing one.
- [ ] Keyboard-avoiding message list, auto-scroll to newest, send-in-flight state.
- [ ] Port the action-driven cache invalidation from `AiChatPanel`: when the agent reports
      successful actions, invalidate the affected query keys. Expo's `queryKeys` currently has
      four entries against the web's twelve, so only the domains Expo actually holds
      (workouts, food entries, check-ins, goals, and weight after Task 1) get invalidated. The
      rest are no-ops until those features land — say so in a comment rather than inventing keys.
- [ ] **Voice dictation is explicitly out.** The web's composer has a mic
      (`useVoiceDictation` + `VoiceRecorderBar`); Expo has no speech dependency and no voice
      code. Adding one likely means leaving Expo Go. That belongs to the voice sub-project.
      Ship the coach text-only and say so in the UI rather than shipping a dead mic button.

## Verification

- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `cd mobile && npm test`
- [ ] `cd frontend && npx tsc --noEmit`
- [ ] `cd frontend && npx vitest run` — if Task 3 moved anything, the existing insights suites
      (`AiChatPanel.test.tsx`, `AiInsightsSection.test.tsx`) must pass **unchanged**
- [ ] `npx vitest run` in `packages/shared` if anything moved there
- [ ] Manual on a simulator: a user with no data; a user with only sleep logged (the empty-state
      bug); a free user at zero remaining calls (the 403 path); the backend running without
      `GEMINI_API_KEY` (the 503 path)
- [ ] Confirm in the DB that one Insights visit on Expo consumes **one** AI call, not six —
      this is the check that Task 6's two "do not port" items actually held

## Deliberately not in scope

- **The quota burn on the web** (`shape.md` gap 4, six of ten free calls per page view). Real,
  high severity, pre-existing on the shipping client, and a backend + web change. Filed as open
  question 3 with a recommendation; fixing it under a mobile parity spec would bury it.
- **Native in-app purchase.** An upgrade path on iOS is an App Store question, not an Insights
  question. Task 5 sends the user to an external browser and stops there.
- **Voice dictation in the coach.** Voice sub-project.
- **The `InsightsSectionCarousel`.** Open question 2 recommends a vertical stack on Expo; if the
  answer comes back "carousel", it is roughly another day for gesture handling and tabs.
- **Swapping the charting library.** `shape.md` recommends keeping `react-native-gifted-charts`.
  Revisit only if a custom dev client is adopted for some other reason.
- **`GET /api/insights/stats`.** A live, ungated, server-computed daily-stats endpoint that
  *neither* client uses. Possibly a better data source than client-side aggregation for both —
  worth its own look, not worth widening this spec.
