# Reference Implementations Studied

Everything below was read on `origin/main` at 2026-09-14 before any claim in `shape.md` was
written. Where the audit expected a gap and did not find one, that is noted — the going-in
assumption about the charting library was wrong and the code is why.

## The reference client (web)

- `frontend/src/pages/Insights.tsx` — the page shape: AI section gated on `hasAiAccess`, then
  fitness and health sections behind `ContentWithLoading`. Note it passes `skeleton` but **no
  `error` prop**, which is `shape.md` gap 5
- `frontend/src/components/insights/AiInsightsSection.tsx` (468 lines) — score ring, period
  selector, refresh, the freshness auto-refresh effect, the prefetch of all four periods (the
  behaviour the plan explicitly does not port), today's recommendations, semantic search
- `frontend/src/components/insights/AiChatPanel.tsx` (363 lines) — history, send, the
  action-driven invalidation across seven query keys, and the `useVoiceDictation` +
  `VoiceRecorderBar` composer that Expo cannot match
- `frontend/src/components/insights/FitnessInsightsSection.tsx`,
  `HealthInsightsSection.tsx` — the seven stats and the two Recharts groups Expo renders four of
- `frontend/src/components/insights/InsightsSectionCarousel.tsx` — the tabs/swipe wrapper open
  question 2 proposes not to port
- `frontend/src/hooks/useSubscription.ts` — `hasAiAccess = isPro || aiCallsRemaining > 0`
- `frontend/src/components/subscription/UpgradePrompt.tsx` — the `quotaExhausted` variant and
  its copy
- `frontend/src/core/api/aiInsights.ts`, `core/api/health.ts` (`weightApi`) — the two clients
  Expo needs equivalents of

## The conforming client (Expo)

- `mobile/src/screens/InsightsScreen.tsx` (150 lines) — **the file that disproves the going-in
  assumption**: `import { BarChart, LineChart, PieChart } from 'react-native-gifted-charts'`
  and three working charts. Also the two inline hexes and the narrow empty-state condition
- `mobile/package.json` — `react-native-gifted-charts@^1.4.75`, `react-native-svg@15.12.1`
- `mobile/src/lib/analytics.ts` — re-exports the shared calculations; `calculateTrends` is
  exported and unused; `CHART_COLORS` is the documented platform exception
- `mobile/src/core/api/auth.ts` + `mobile/src/context/AuthContext.tsx` — `ApiUser` omits
  `subscriptionStatus` and `aiCallsRemaining`, and `apiUserToUser` drops them; `role` still
  carries the removed `'trainer'`
- `mobile/src/lib/queryKeys.ts` — four keys against the web's twelve
- `mobile/src/components/shared/ProgressRing.tsx` — the SVG arc the wellness score ring reuses
- `mobile/src/components/shared/PeriodSelector.tsx` — exists, but typed to goal periods
- `mobile/src/navigation/RootNavigator.tsx` — the `presentation: 'modal'` pattern the coach
  screen would follow

## Shared

- `packages/shared/src/domain/analytics.ts` — one implementation of every insight calculation,
  consumed by both clients. Its header explains why `CHART_COLORS` stayed per-client
- `packages/shared/src/types/user.ts` — already declares `subscriptionStatus` and
  `aiCallsRemaining`, which is why Task 5 is a mapper fix and not an API change

## Backend — read to confirm no new API work

- `backend/src/routes/insights.ts` — five routes; four behind `requirePro`, `stats` not
- `backend/src/routes/chat.ts` — six routes, all behind `requirePro`
- `backend/src/routes/search.ts` — `POST /api/search`, **no** `requirePro`
- `backend/src/routes/weight.ts` + `controllers/weight.ts` — bare array, optional
  `startDate`/`endDate`, optional pagination
- `backend/src/middleware/requirePro.ts` — calls `tryConsumeAiCall`, so it **spends** a call
  rather than checking one; this is the whole of `shape.md` gap 4
- `backend/src/services/aiQuota.ts` — `FREE_TIER_LIMIT = 10`, monthly rollover inline, and the
  dev-mode bypass when Lemon Squeezy is unconfigured
- `backend/src/controllers/insights.ts` — the 503 when `GEMINI_API_KEY` is unset, which the port
  has to render

## Prior specs leaned on

- `agent-os/specs/2026-09-12-1230-mobile-foundation/shape.md` — the 32-engineer-week programme
  estimate this sizing is checked against, and the recorded decision that "subscription gating
  is kept at the API layer so the paywall is additive later"
- `agent-os/specs/2026-09-14-1150-parity-goals-card-and-form/` — the sibling parity spec; the
  Goals screen shares `useEnergy` and `useWorkouts` with this one, and both specs touch
  `staleTime` on those hooks
