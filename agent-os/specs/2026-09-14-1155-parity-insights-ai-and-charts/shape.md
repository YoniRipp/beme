# Insights Parity: The AI Half Is Missing, the Charts Are Not — Shaping Notes

## Why this exists

`frontend/` (web + PWA) and `mobile/` (Expo) are meant to be the same app on a phone. This
spec covers Insights: `frontend/src/pages/Insights.tsx` + `frontend/src/components/insights/`
against `mobile/src/screens/InsightsScreen.tsx`.

**The web client is the reference.** Where Expo's approach may be the better one, this spec
records it as an open question with a recommendation rather than deciding it.

## Correcting the going-in assumption, before anything is planned on top of it

The audit went in expecting Expo's Insights to be an empty state with no charting library —
which would have made "Insights parity" a from-scratch build and a live `global/tech-stack`
decision about which React Native charting library to adopt.

**Neither is true, and the plan below would be wrong if it pretended otherwise.**

`mobile/package.json` on `origin/main` declares `react-native-gifted-charts@^1.4.75` and its
peer `react-native-svg@15.12.1`. `mobile/src/screens/InsightsScreen.tsx` imports `BarChart`,
`LineChart` and `PieChart` from it and renders all three today. The library decision was made
and shipped; what is left is whether to keep it (see Decisions).

What *is* absent from Expo is the AI half of the screen — and that is most of the screen.

## What each client renders

| Feature | Web | Expo | Backend endpoint | Exists? |
|---|---|---|---|---|
| Workout frequency, 12 wk | bar (Recharts) | bar (gifted-charts) | none — computed client-side from `/api/workouts` | n/a |
| Workout type distribution | pie + labels | pie + legend | none — client-side | n/a |
| Calorie trend, 30 d | line | line | none — client-side from `/api/food-entries` | n/a |
| Weight progress, 30 d | line | **missing** | `GET /api/weight-entries` | **yes** |
| "vs last week" trend badge | yes | **missing** | none — `calculateTrends`, already shared | n/a |
| Fitness stats | 3 values | 2 values | none — client-side | n/a |
| Health stats | 4 values | 2 values | none — client-side | n/a |
| AI insights: score, summary, highlights, suggestions | yes | **missing** | `GET /api/insights` | **yes** |
| Period selector 7/14/30/90 + refresh | yes | **missing** | `POST /api/insights/refresh` | **yes** |
| Freshness auto-refresh | yes | **missing** | `GET /api/insights/freshness` | **yes** |
| Today's recommendations | yes | **missing** | `GET /api/insights/today` | **yes** |
| Semantic search over your data | yes | **missing** | `POST /api/search` | **yes** |
| AI coach chat | yes (`AiChatPanel`, 363 lines) | **missing** | `POST /api/chat`, `GET`/`DELETE /api/chat/history` | **yes** |
| Voice dictation into the coach | yes | **missing** | `POST /api/voice/*` | yes, but see sizing |
| Subscription gating (`hasAiAccess`) | yes | **no concept of it** | `GET /api/auth/me` returns the fields | **yes** |
| Server-computed daily stats | not used | not used | `GET /api/insights/stats` | yes, unused by both |

**Nothing Expo is missing needs new API work.** Every gap in that table is client work against
an endpoint that is live and already consumed by the web or exposed to the MCP server.

Both clients already call the same `getFitnessInsights` / `getHealthInsights` /
`getWorkoutFrequencyData` / `getCalorieTrendData` from `packages/shared/src/domain/analytics.ts`
— one implementation, two renderers. `CHART_COLORS` is deliberately per-client: the web
resolves `hsl(var(--chart-N))` through CSS custom properties, which React Native cannot.

## The gaps

### 1. Local charts and stats — small, and no API work

- **Weight progress is missing.** Expo has no `useWeight` hook and no weight module in
  `mobile/src/core/api/`. `GET /api/weight-entries` exists; the web consumes it through
  `weightApi` in `frontend/src/core/api/health.ts`. An API client, a hook, a line chart.
- **Five stats are missing across the two groups** — most common workout type, sleep
  consistency (std dev) and average macros (P/C/F) — although the shared insight functions the
  screen *already calls* return every one of them. Pure render work, zero API cost.
- **The "vs last week" trend badge is missing.** `calculateTrends` is re-exported from
  `mobile/src/lib/analytics.ts` and never used by anything.
- **The empty-state condition is too narrow.** Expo: `workouts.length === 0 && foodEntries.length === 0`.
  Web: workouts *or* food *or* check-ins *or* weight. A user who has only logged sleep sees
  "No data yet" on Expo and their stats on the web. Expo's empty state also offers no action;
  the web offers "Log something" → Home.
- **No screen header.** Expo's Insights is a bare `ScrollView` — the only tab that doesn't use
  `MobileScreen`. The web has kicker "Insights", title "Patterns", subtitle "Trends from your
  recent activity."
- **Two inline hexes** in the screen: `color="#ef4444"` on the calorie line and
  `textColor="#fff"` on the pie. `mobile/CLAUDE.md` forbids inline hex and there are AST guards
  in `mobile/src/theme/__tests__`. (The `CHART_COLORS` literals in `mobile/src/lib/analytics.ts`
  are the documented platform exception and stay.)

### 2. The AI half — absent on Expo, and it is most of the screen

`grep -ri "subscription|hasAiAccess|premium|upgrade|aiInsights|chat" mobile/src` returns
**nothing**. There is no AI surface on Expo at all: no insights section, no recommendations,
no semantic search, and **no AI coach** — the answer to "does the chat exist on Expo" is a flat
no, not "a reduced version".

On the web that is 831 lines across `AiInsightsSection.tsx` (468) and `AiChatPanel.tsx` (363),
plus the `aiInsights` and `chat` API clients. It is the top half of the page and the reason the
page exists as more than a chart dump.

### 3. Gating — a deliberate decision, with a consequence nobody has priced

The web gates on `hasAiAccess = isPro || aiCallsRemaining > 0` (`frontend/src/hooks/useSubscription.ts`)
and renders `UpgradePrompt` otherwise. Expo has no subscription concept:
`mobile/src/core/api/auth.ts`'s `ApiUser` omits `subscriptionStatus` and `aiCallsRemaining`, and
`apiUserToUser` in `mobile/src/context/AuthContext.tsx` drops them — **even though
`packages/shared/src/types/user.ts` declares both fields and `backend/src/models/user.ts`
returns them.** The data is already on the wire; the mobile mapper throws it away.

This is not drift. `agent-os/specs/2026-09-12-1230-mobile-foundation/shape.md` decided
"subscription gating is kept at the API layer so the paywall is additive later rather than a
rewrite."

**Is the quota unenforced on native?** No — and this is worth stating precisely, because an
unenforced quota would be a billing problem rather than a UI one. `requirePro`
(`backend/src/middleware/requirePro.ts`) guards every AI route server-side and is what actually
decrements the counter. A client that skips the check cannot spend more than its ten calls; it
just gets a raw 403 where the web gets a polite card. Expo today cannot even do that, because
it never calls an AI endpoint. So the gating gap is a **UX gap, not a revenue leak** — the port
must handle 403 `free_quota_exhausted` and 503 "AI not configured" as first-class states rather
than hiding a button behind a boolean.

### 4. The billing problem is real, but it is on the web, and it is the reverse of the one expected

Found while checking whether Expo enforces the same limits. `requirePro` does not *check* the
quota — it **consumes** one, via `tryConsumeAiCall`, on every request to every route it guards.
That includes `GET /api/insights/freshness`, a two-`SELECT` liveness check that calls no model,
and `GET /api/chat/history`, which reads rows the user already paid to create.

One visit to the web Insights page, for a free user with ten calls a month:

| Request | Calls burnt |
|---|---|
| `GET /api/insights?days=30` | 1 |
| prefetch of the other three periods (7/14/90), fired on first success | 3 |
| `GET /api/insights/today` | 1 |
| `GET /api/insights/freshness` | 1 |
| **total, before the user has typed anything** | **6 of 10** |

Opening the coach spends a seventh on `GET /api/chat/history`. Two page visits exhaust a free
user for the month, and `hasAiAccess` keeps returning true meanwhile because `aiCallsRemaining`
is only refreshed when the user object reloads — so the UI offers a feature the server will
refuse.

**Severity: high, and it is pre-existing on the shipping client — this spec does not fix it.**
It is recorded here because it is the deciding input for how Expo's AI section should behave.
If Expo copies the web's prefetch-all-periods and poll-freshness pattern, a user with both
clients installed burns their month at twice the rate. Open question 3 proposes the narrow fix.

### 5. Neither client surfaces a failed Insights fetch

Reported for honesty rather than as a parity gap: the web's `ContentWithLoading` on Insights
gets `loading` and `skeleton` but **no `error` prop**, so a failed workouts or food fetch
renders "No patterns yet" — the same misleading empty state Expo shows. Both are wrong in the
same way. Cheap to fix on both while the files are open; it is in the plan as a one-liner, not
as parity work.

## Decisions

- **Split the work in two and ship the cheap half first.** The local charts and stats are a
  day and depend on nothing. The AI section depends on a paywall answer. Shipping them together
  makes the charts wait on a decision they have nothing to do with.
- **Keep `react-native-gifted-charts`.** See the tech-stack note below — this is the one
  decision here that `global/tech-stack` says belongs to the owner, so it is written up as a
  recommendation with the alternatives, not as a settled matter.
- **Conform Expo to the web**, with no `frontend/` changes except the shared extraction in
  Task 3, which must not alter the web's rendered output.
- **The stats card follows the web's split** — Fitness and Health as two groups — because the
  web's grouping is the reference and it survives a 390px column fine.
- **No carousel on Expo.** The web wraps each section in `InsightsSectionCarousel` (tabs +
  swipe + arrows). On a phone a vertical stack of cards is what every other Expo screen already
  does. Recorded as open question 2, because the web *is* the reference and this deviates.
- **`POST /api/search` is not Pro-gated** (`backend/src/routes/search.ts` has no `requirePro`),
  so semantic search can ship to every Expo user whatever the paywall answer is. It is the one
  AI-adjacent surface with no gating question attached.

## Charting library — a `global/tech-stack` decision, stated as one

The decision is **already made and shipping**: `react-native-gifted-charts@^1.4.75`, added with
the Expo revival and used by the three existing charts. So the question is not "which library
do we pick" but "do we keep the one in the tree". Surfacing it anyway, because adding or
swapping a dependency is the owner's call and because a plan that quietly assumes the answer is
the kind of thing that gets discovered late.

**Recommendation: keep it.** Reasoning:

- It is already in `package.json`, already rendering three charts, and its only peer
  (`react-native-svg@15.12.1`) is the exact version Expo SDK 54 pins — so it works in **Expo Go**.
  `mobile/CLAUDE.md` is explicit that leaving Expo Go changes everyone's workflow and must not
  happen silently.
- The remaining chart this spec needs is one more line chart. That is the same component that
  already draws the calorie trend. Swapping libraries to add a duplicate of a chart we already
  render is cost with no payoff.
- Its weaknesses are real but not binding here: it is a single-maintainer package, its
  TypeScript types are loose, and its axis-label handling at 390px is fiddly (the current screen
  works around it with an 8px `chartLabel` style). None of that is worse than a migration.

Alternatives, for the record:

| Option | Why you'd want it | Why not now |
|---|---|---|
| `victory-native` (XL, Skia-backed) | Best-in-class rendering and gestures; actively maintained by Formidable/Shopify | Needs `@shopify/react-native-skia`, a native module — **leaves Expo Go** unless a dev client is adopted. That is a workflow change for everyone, and `mobile/CLAUDE.md` says not to do it without saying so. |
| `react-native-chart-kit` | Simplest API, SVG-only, Expo Go safe | Effectively unmaintained; fewer chart types than we already use |
| Hand-rolled on `react-native-svg` | Zero new dependency, total control; the web's `ScoreRing` is exactly this and Expo's `ProgressRing` already proves the pattern | Fine for the wellness score ring; not worth it for axes, ticks and tooltips |

**Split recommendation:** keep gifted-charts for the data charts, and hand-roll the AI wellness
score ring on `react-native-svg` — it is one arc, `mobile/src/components/shared/ProgressRing.tsx`
already does it, and pulling a chart library in to draw a circle would be silly. Revisit
victory-native only if and when a custom dev client is adopted for another reason.

## Sizing — honest

Not a tweak. Also not the from-scratch build the brief anticipated, because the charts and the
library are already there. Per surface, one engineer who knows the codebase:

| Surface | Size | Why |
|---|---|---|
| Weight chart + missing stats + trend badge + empty state + header + hex cleanup | **S — 1 to 1.5 days** | Every value is already computed by shared code; one new API client and hook |
| AI insights section (score, summary, highlights, suggestions, periods, refresh, freshness) | **M — 2 to 3 days** | New `aiInsights` API client, query keys, three loading states, 403/503 handling, a score ring |
| Semantic search | **S — half a day** | One POST, a result list, no gating |
| AI coach chat, text only | **M/L — 3 to 4 days** | 363 lines on the web, plus action-driven cache invalidation across seven query keys, plus a keyboard-avoiding message list |
| AI coach chat, with voice dictation | **blocked, not estimated** | The web panel uses `useVoiceDictation` + `VoiceRecorderBar`. Expo has **no speech dependency and no voice code at all**; adding one likely means leaving Expo Go. This is the voice sub-project's problem, not Insights'. |

**Total: roughly 1.5 to 2 engineer-weeks for everything except voice** — and the AI half should
not start until open question 1 has an answer, because the answer changes what gets built.

Two honest caveats on that number. It assumes the AI section is a *port* of behaviour that
already works, which it is; and it excludes the paywall UX itself (an upgrade path on native is
an App Store / IAP question, not an Insights question). If the answer to open question 1 is
"build the native paywall too", this stops being an Insights estimate.

For context, `agent-os/specs/2026-09-12-1230-mobile-foundation/shape.md` sized the whole mobile
parity programme at 32 engineer-weeks across eight sub-projects, insights being one. This
estimate is consistent with that; nothing here suggests the programme was mis-sized.

## Open questions — for the owner

1. **What does a free Expo user see?** (a) Mirror the web — read `aiCallsRemaining`, show an
   upgrade card; needs the two dropped fields restored to `ApiUser` and `apiUserToUser`.
   (b) Show the section and handle the 403 when it lands. (c) Hide AI on Expo until in-app
   purchase exists, since App Store rules will not accept a Lemon Squeezy web checkout inside
   the app. **Recommendation: (a) for the read-only surfaces with (b) as the backstop**, and
   send the upgrade action to an external browser rather than building native checkout. (c) is
   the honest answer if App Store submission is near.
2. **Carousel or vertical stack for the chart sections on Expo?** The web is the reference and
   uses a tabbed carousel. **Recommendation: vertical stack** — it matches every other Expo
   screen and needs no gesture handling. Flagged because it is a visible deviation.
3. **Fix the quota burn (gap 4) before the port?** **Recommendation: yes, and narrowly** — make
   `GET /api/insights/freshness` and `GET /api/chat/history` non-consuming, since neither calls
   a model, and drop the web's prefetch of all four periods. Both are backend and web changes
   outside this spec, and doing them first means the Expo port doesn't inherit the burn.

## Constraints

- **No new backend endpoints.** Everything above exists and is consumed by the web today.
- `mobile/CLAUDE.md`: no inline hex; no native module that forces a custom dev client without
  saying so — which is exactly why voice dictation is out and victory-native is a "later".
- Expo's Paper palette / theme pass is owned elsewhere. The only colour touched here is the two
  inline hexes inside `InsightsScreen.tsx`.
- The MCP server consumes the same insight endpoints. Nothing here changes their shape.
