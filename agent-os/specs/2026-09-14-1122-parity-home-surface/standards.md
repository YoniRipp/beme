# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/api-client` | Expo gains a whole `core/api/health.ts`; nothing may `fetch` an endpoint directly |
| `frontend/data-fetching` | Five new React Query hooks on Expo — keys, `staleTime`, cache writes, error strings |
| `frontend/components` | Four new Expo cards; they reuse `MetricCard` / `ProgressRing`, they don't start a second primitive set |
| `frontend/mobile-ui` | The 2×2 quick-log grid, 44 px touch targets, card anatomy, one voice entry point |
| `frontend/design-tokens` | Every colour goes through the theme; `mobile/` fails the build on inline hex |
| `global/domain-conventions` | Local `YYYY-MM-DD` dates, kilograms, Sunday-start weeks |
| `global/critical-rules` | Adding five cards to a screen is a large UI change: analyse first, don't restart |
| `global/testing` | New hooks and API wiring get tests; Expo tests must not leave a QueryClient alive |
| `backend/data-lifecycle` | Every new per-user read must be bounded — and the web's weight read currently isn't |

## Key points carried into the work

**API client**

- The chain is `core/api/` → hook → screen. Expo's `core/api/health.ts` is transcribed from
  the web's, so the two clients call the same endpoints with the same parameters.
- No component calls `fetch`. Expo's single wrapper is `mobile/src/core/api/client.ts`.

**Data fetching**

- Query keys come from `mobile/src/lib/queryKeys.ts`, never inline. The new keys mirror the
  web's registry (`frontend/src/lib/queryClient.ts:25-38`) name for name, including the
  parameterised `waterToday(date)` and its `waterTodayAll` invalidation prefix.
- `staleTime` is always explicit, and matches the web's per-query choice: 30 s for water,
  2 min for weight and cycle, 5 min for streaks and profile.
- Mutations write the cache with `setQueryData`. Water in particular must keep the web's
  out-of-order guard (`frontend/src/hooks/useWater.ts:49,66,73`) — a slow reply for "3" must
  not overwrite a later "5", and taps outrun responses more on a phone, not less.
- Hooks expose actions returning `Promise<void>` and errors as display strings.

**Mobile UI**

- Vertical scroll, one column, card-based. Every new card is a Paper `Card` with the app's
  radius and border, not a styled `View`.
- Touch targets ≥ 44 px — the water ± controls and every quick tile.
- Safe areas: `MobileScreen` already pads for `useSafeAreaInsets().bottom`; anything new stays
  inside it.
- **One voice entry point per viewport.** Expo currently has zero. Noted, not fixed here — it
  is a navigation-shell gap and belongs to whoever owns nav.
- Calories get visual emphasis; the fuel card's ring is the largest thing on the screen.

**Design tokens**

- Never inline a hex colour in `mobile/src`. The AST guards in `mobile/src/theme/__tests__`
  fail the build on it, and they exist because seven files had already drifted. Everything
  goes through `useThemedStyles` / `useAppTheme`.

**Domain conventions**

- Dates are local calendar `YYYY-MM-DD` — water is keyed by `toLocalDateString(new Date())`,
  never a UTC slice.
- Weight is kilograms.
- Week is Sunday–Saturday for the streak and trend copy.

**Data lifecycle**

- Per-user reads stay bounded. Water is one row keyed by date; streaks are five rows (one per
  type, `backend/src/models/streak.ts:24-29`); weight and cycle get a date window.
- The web's `weightApi.list()` with no window is the counter-example, not the pattern. Expo
  does not copy it, and Task 9 fixes the web.

**Critical rules**

- Never break existing functionality and never remove a working feature — no web card is
  deleted to make the two clients match.
- No API shape changes. The web client and the MCP server consume these endpoints, and the
  Expo app is now a third consumer of the same shapes.
</content>
