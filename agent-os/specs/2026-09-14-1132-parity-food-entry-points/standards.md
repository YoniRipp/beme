# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/domain-conventions` | "Voice is the primary path for food logging" is a *domain rule*, not a preference — it is why Task 1 exists and why it is sized first. Also meal types, local dates, and the per-100g vs per-portion split every new entry path crosses |
| `global/tech-stack` | Two tasks add a dependency. One of them (`expo-audio` vs an on-device speech module) may take the app out of Expo Go, which `mobile/CLAUDE.md` says must be surfaced, not assumed — hence D1 |
| `frontend/api-client` | New Expo clients for water, voice, batch and duplicate-day all go behind `core/api/`; nothing calls `fetch` from a screen |
| `frontend/data-fetching` | `useWater`'s optimistic write and out-of-order guard; `addFoodEntriesBatch` / `duplicateDay` return `Promise<void>` and write the cache with `setQueryData`; every query gets an explicit `staleTime`; keys come from `queryKeys` |
| `frontend/components` | The voice sheet, the bulk sheet, the scanner and the copy-day dialog are components under `components/energy/`, not more JSX inside a screen |
| `frontend/mobile-ui` | Voice is the primary action on a meal card and Add is secondary; 44px targets on the water tiles and the journal-header buttons; the scanner is full-bleed and respects the safe area |
| `frontend/design-tokens` | Every colour through `useThemedStyles` — the AST guards in `mobile/src/theme/__tests__` fail the build on a frozen hex |
| `backend/errors` | Nothing is written server-side, but three gated routes need their real failure modes handled: `403 free_quota_exhausted`, `413`, `503` |
| `global/testing` | Every module moved into `packages/shared` brings its tests with it |

## Key points carried into the work

- **Voice is not a nice-to-have.** `global/domain-conventions` states that a food-logging
  capability should be reachable by voice, not only by form. Expo has no voice at all, so
  it fails that rule outright — that is the framing for Task 1, not "a missing button".
- **Adding a dependency is a decision, not a detail.** `expo-camera` sits inside the Expo Go
  runtime and costs nothing beyond a permission string. An on-device speech module does
  not, and taking the app out of Expo Go "changes everyone's workflow"
  (`mobile/CLAUDE.md`). D1 is written up as a decision with a recommendation and left to
  the owner.
- **Meal types are `breakfast | lunch | dinner | snack`, lowercase on the wire.** The
  parser moving into `packages/shared` uses a Title-Case display union; normalise at the
  boundary rather than widening the shared domain type.
- **Entries without `mealType` fall back to time-of-day inference, and that fallback stays.**
  Old rows have no meal type.
- **Dates are local `YYYY-MM-DD`,** through `toLocalDateString`. Load-bearing here, not
  incidental: the batch body, the duplicate-day body and every water route are date-keyed.
- **`food_entries` stores values already scaled to the logged portion**; `foods` stores per
  100 g/ml. Voice resolution, barcode fill and bulk import all cross that boundary and must
  scale on the way in.
- **API calls go through `core/api/`,** one module per domain, never from a component.
- **Mutations write the cache directly** with `setQueryData`. On water this is the whole
  point: the ring and the tiles must move on tap, not after a round-trip, and the
  `latestSetRef` guard exists so an out-of-order reply cannot walk the count backwards.
- **Logic both clients need goes in `packages/shared`, not copied** — the food-text parser,
  barcode lookup and recent-food ranking all move there, and the web is repointed at each
  in the same change. A shared module with a single caller is how the last drift started.
- **No API shape changes.** The web client and the MCP server consume the same endpoints,
  and the MCP server ships separately.
