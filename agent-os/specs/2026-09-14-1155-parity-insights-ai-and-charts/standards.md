# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/tech-stack` | The charting library. It is already in the tree, but keeping vs swapping is the owner's call and `shape.md` writes it up as one |
| `global/critical-rules` | Insights is most of a page on the shipping web client; the port must not change it |
| `global/domain-conventions` | Weight in kilograms; local-calendar `YYYY-MM-DD` for the chart's date window; week is Sunday–Saturday inside `calculateTrends` |
| `global/testing` | `frontend/`'s insights suites must pass unchanged if anything moves to `packages/shared` |
| `frontend/data-fetching` | Query keys centralised (the web inlines `['ai-insights', days]`; Expo must not copy that), `staleTime` always explicit, hooks expose errors as display strings |
| `frontend/api-client` | Every AI call goes through a `core/api/` module — no `fetch` in a screen |
| `frontend/components` | New Expo insight sections are components under `mobile/src/components/`, not 500 lines in one screen file |
| `frontend/design-tokens` | The two inline hexes in `InsightsScreen.tsx` |
| `frontend/mobile-ui` | One column, card-based, 44px touch targets, safe areas — the AI section adds a lot of controls to a 390px screen |
| `backend/data-lifecycle` | Why the weight chart passes `startDate` instead of reading the user's whole history |
| `mobile/CLAUDE.md` | No inline hex; no native module that forces a custom dev client; shared logic goes in `packages/shared` |

## Key points carried into the work

- **The web client is the reference, and two deviations are declared up front.** A vertical
  stack instead of the web's carousel (open question 2) and a `startDate`-filtered weight read
  instead of the web's unbounded one. Both are written down; neither is decided mid-task.
- **Adding a dependency is a `global/tech-stack` decision.** In this case the decision was
  already made — `react-native-gifted-charts` ships today — so `shape.md` states the
  recommendation (keep it), the alternatives, and the one thing that would change the answer
  (adopting a custom dev client). The plan adds **no** new dependency: the wellness score ring
  is hand-rolled on `react-native-svg`, which is already a peer of the chart library.
- **Query keys come from `queryKeys`, and `staleTime` is always explicit.** The web's AI
  section predates that rule and inlines its keys. Porting the behaviour does not mean porting
  the violation.
- **Per-user data stays bounded.** The weight chart draws 30 days, so it asks for 30 days. The
  existing charts read food and workouts through the shared bounded pager and are left alone.
- **Never inline a hex colour in `mobile/`** — AST guards in `mobile/src/theme/__tests__` fail
  the build. `CHART_COLORS` in `mobile/src/lib/analytics.ts` is the documented exception,
  because gifted-charts needs literal values and cannot resolve `hsl(var(--chart-N))`.
- **Don't change API shapes.** Nothing in this spec needs to: every endpoint it consumes is
  already live and already consumed by the web or the MCP server.
- **Failure is a state, not a crash.** Three the port must render: 403
  `free_quota_exhausted`, 503 "AI not configured" (`backend/src/controllers/insights.ts` returns
  it when `GEMINI_API_KEY` is unset), and an ordinary fetch failure — which today renders as
  "no data" on *both* clients.
- **Voice belongs to the voice sub-project.** The web's coach has a mic; Expo has no speech
  stack. Ship text-only rather than a dead button, and say so.
