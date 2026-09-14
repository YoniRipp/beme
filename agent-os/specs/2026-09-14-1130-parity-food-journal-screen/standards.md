# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/domain-conventions` | Meal types, week boundaries, and the per-100g vs per-portion rule the totals depend on |
| `frontend/data-fetching` | A new profile query + hook on Expo; explicit `staleTime`; centralised query keys; `setQueryData` on mutate |
| `frontend/api-client` | `core/api/profile.ts` is the only place `/api/profile` is fetched from |
| `frontend/components` | The collapsible group is a component in `components/energy/`, not more JSX inside the screen |
| `frontend/mobile-ui` | Card anatomy for `MobileFoodCard`, 44px touch targets on the period chips and group headers |
| `frontend/design-tokens` | Every colour through `useThemedStyles` — `mobile/src/theme/__tests__` fails the build on a frozen hex |
| `global/critical-rules` | Moving sleep out of a tab and onto the scroll is a large UI change: name the problem before changing it |
| `global/testing` | Pure helpers get unit tests in `packages/shared`; the screen keeps its Jest tests green |

## Key points carried into the work

- **Meal types are `breakfast | lunch | dinner | snack`, lowercase on the wire.** Both
  clients already do this. Entries with no `mealType` fall back to time-of-day inference
  and that fallback stays — old rows have no meal type.
- **Week is Sunday to Saturday.** Monthly bucketing groups by Sunday-weeks for the same
  reason; `getPeriodRange` and `WEEK_SUNDAY` in `@trackvibe/shared/domain` are the only
  source for both.
- **Dates are local `YYYY-MM-DD`.** Distinct-day counting keys off the day string, never
  off a `Date` object — a `Set` of `Date`s counts entries, not days, which is the exact
  trap `Energy.tsx:216-218` documents.
- **`food_entries` values are already scaled to the logged portion.** Totals sum the entry
  rows as they are; nothing on this screen re-scales from a `foods` row.
- **Always set `staleTime` explicitly** even though `mobile/src/lib/queryClient.ts` has a
  60s default — and match the web's `2 * 60 * 1000` for energy, `5 * 60 * 1000` for profile.
- **Query keys come from `mobile/src/lib/queryKeys.ts`.** `profile` is a new entry there,
  never an inline array.
- **Mutations write the cache with `setQueryData`,** so the journal does not flash a
  spinner after an edit. Both clients already do this; the new profile mutation follows.
- **Logic both clients need goes in `packages/shared`, not copied.** Three helpers move
  there in this work (period totals, period grouping, macro-goal maths) and the web is
  repointed at each in the same change — a shared module with one caller drifts.
- **No API shape changes.** Every endpoint this spec touches already exists and is consumed
  by the web client and the MCP server.
