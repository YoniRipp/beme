# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/domain-conventions` | Week is Sunday→Saturday; weight is kilograms in the domain, so the display unit is a presentation concern the card must resolve from settings |
| `global/critical-rules` | Replacing the header block of a shipping screen is a large UI change: analyse, name the problem, then change |
| `global/testing` | New helpers get tests; `npm run lint` is `tsc --noEmit` in the package you touched |
| `frontend/mobile-ui` | Card anatomy, the 4·8·12·16·24·32 spacing scale, ≥44px touch targets, one summary per screen |
| `frontend/components` | `WorkoutCard` is a canonical piece — extend the Expo equivalent rather than adding a second card |
| `frontend/data-fetching` | `toggleWorkoutCompleted` is a hook action returning `Promise<void>`, and the mutation writes the cache with `setQueryData` |
| `frontend/design-tokens` | No new colours; the ring, chips and card read from the theme |

## Key points carried into the work

- **Week is Sunday→Saturday.** `WEEK_SUNDAY` and `getPeriodRange('weekly')` in
  `@trackvibe/shared/domain` are the only correct sources. Both clients already agree on the
  window; Expo just spells it inline.
- **Dates are local `YYYY-MM-DD` on the wire.** `parseLocalDateString` / `toLocalDateString`
  are already used on both sides; nothing here should reach for `toISOString()`.
- **Shared logic goes to `packages/shared`, not into a second copy.** `types/workout.ts`,
  `lib/dateRanges.ts` and `computeGoalProgress` are already shared by both clients — the
  `formatDate` / `getWeightUnit` move in Task 4 follows that path rather than duplicating
  eleven lines into `mobile/`.
- **Hooks expose actions, not mutation objects**, wrapped in `useCallback` and returning
  `Promise<void>`. `toggleWorkoutCompleted` must match the web's signature exactly.
- **Mutations write the cache** with `setQueryData` — mobile's `useWorkouts` already does
  this for add/update/delete and the toggle rides the same update mutation.
- **≥44px touch targets.** The completion toggle and the delete icon are the two at risk;
  Paper's `IconButton` at `size={18}` renders a 40px target by default.
- **Every number needs a label.** The web's ring is a `progressbar` with a spoken value and
  each day chip carries an `sr-only` sentence. `mobile/src` currently has no
  `accessibilityLabel` or `accessibilityRole` anywhere — the port is the moment to start,
  not a later sweep.

## Standards conflicts worth flagging

- `global/testing` says unit tests **co-locate** (`auth.ts` → `auth.test.ts`) and that both
  sides use **Vitest**. `mobile/` uses **Jest** (`jest-expo`) and puts tests in `__tests__/`
  folders. The standard predates mobile being a shipping client. Follow the existing mobile
  convention so the suite keeps running, and let the owner decide whether the standard or
  the package moves.
