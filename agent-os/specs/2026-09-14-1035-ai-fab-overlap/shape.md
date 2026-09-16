# The AI Coach button floats on top of real controls

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **medium** — cosmetic on one screen, covers a button on another.

## The mismatch

The AI Coach FAB (the white circle with the sparkle, rendered by `Base44Layout` when
`hasAiAccess`) is `position: fixed` at the right edge and overlaps page content beneath
it on the phone viewport.

Observed on iPhone 17 Pro (iOS 26.5, 402×874pt):

- **Home** — it sits over the top-right corner of the **"Log weight"** quick-log tile.
  The tile is still tappable elsewhere, so this reads as sloppy rather than broken.
- **Food** — it sits over the **"Copy day"** button in the Journal header row, covering
  part of a control the user is meant to press.
- **Workouts** — it lands inside the "Add your first workout" empty-state card, next to
  its "+ Add a workout" call to action.

## Why it happens

```tsx
// Base44Layout.tsx
className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom,0px)+9.75rem)] z-40 h-12 w-12 …"
```

A fixed offset up from the bottom, with nothing reserving space for it in the page flow.
Whatever happens to be at that height on the right-hand side gets covered. On iOS the
`env(safe-area-inset-bottom)` term is currently `0` as well (see the `viewport-fit=cover`
task), so it sits lower than intended on notched devices.

## Fix

Options, roughly in order of how much they change:

1. Reserve the space — give the right-hand column enough padding that nothing lands under
   the FAB, the way `main`'s `pb-32` already reserves room for the bottom bar.
2. Move it into the bottom bar as a fifth affordance, so there is one floating control on
   screen rather than two (the mic is already there).
3. Auto-hide it on scroll.

Whichever is chosen, the mic and the AI Coach button should be positioned as one system —
they are the only two floating controls and they currently know nothing about each other.

## Acceptance criteria

- [ ] The FAB does not overlap any interactive element on Home, Food, Workouts, Goals, Insights, Water or Profile at 390pt and 402pt wide
- [ ] It still clears the bottom bar and the home indicator
- [ ] Checked with `hasAiAccess` both true and false
