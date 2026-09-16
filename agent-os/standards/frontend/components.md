# Component Architecture

Small, focused, reusable. No monolithic page components.

Components are grouped by domain under `src/components/` (`body/`, `energy/`, `goals/`, `voice/`, …), with `ui/` for shadcn primitives, `shared/` for cross-domain pieces, and `layout/` for shells.

Canonical reusable pieces — extend these rather than re-inventing:

```
FoodCard · WorkoutCard · ExerciseList · BottomNavigation · ImagePlaceholder
```

- **Reach for `components/ui/` first — on both clients.** A new styled `<div>` that duplicates `card.tsx` or `button.tsx` is a bug, and so is a new `StyleSheet` that duplicates `mobile/src/components/ui/Card.tsx`. The Expo client has the same directory, by the same name, for the same reason.
  This rule read as web-only for a long time, because it is written in terms of `<div>` and shadcn. That is not a small thing: while it did, mobile grew *fourteen* hand-rolled card surfaces and no `Card`, at three different radii. `mobile/src/theme/__tests__/cardsUseThePrimitive.test.ts` now enforces it there, because a convention a careful author misses is not a convention.
- **Pages compose, they don't style.** Layout and data wiring in `pages/`, presentation in components.
- **Feature logic lives in `features/<domain>/`** (api, mappers, derived state like `useGoalProgress`), not inside components.
- Import via the `@/` alias, never long relative chains.

## Performance

- No unnecessary re-renders — memoize callbacks passed to list children.
- Keep DOM nesting shallow; deep wrapper stacks make scrolling janky on mid-range Android.
- Long lists render as cards, not tables.
