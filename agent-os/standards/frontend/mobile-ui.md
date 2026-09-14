# Mobile UI

This is a mobile app that runs in a browser. Design for a thumb, not a mouse.

- Vertical scrolling, one column. No desktop dashboard grids.
- Card-based: every food, workout, and exercise item is a card — `rounded-2xl`, `shadow-card`, generous padding.
- Spacing scale: `4 · 8 · 12 · 16 · 24 · 32`px. Never let content touch the screen edge.
- Touch targets ≥ 44px. Icon-only buttons still need a 44px hit area.

## Safe areas

Fixed- and sticky-position elements must respect the notch, the home indicator and — in
landscape — the side cutouts. The insets are named once in `index.css`, the same way colours
are, and read from there. Never inline a `style`, and never call `env()` in a component:

```
:root {
  --safe-top:    env(safe-area-inset-top, 0px);
  --safe-right:  env(safe-area-inset-right, 0px);
  --safe-bottom: env(safe-area-inset-bottom, 0px);
  --safe-left:   env(safe-area-inset-left, 0px);
}

.pt-safe  →  padding-top: var(--safe-top)
.pb-safe  →  padding-bottom: var(--safe-bottom)
.px-safe  →  padding-left / -right: var(--safe-left) / var(--safe-right)
```

The variable, not `env()`, is the thing to reach for: `env()` cannot be overridden, so a test
can never set it, and a headless browser always reports `0`. `e2e/safe-area.spec.ts` drives the
variables to a notched phone's values — that is only possible because there is one definition.

**The utilities set their padding outright.** Put them on an element that has no padding of its
own on that edge (a fixed bar, a drawer, a content wrapper). Where the element already pads that
edge, compose instead, or the utility silently deletes the padding everywhere else:

```
py-3 pt-[calc(0.75rem+var(--safe-top))]      ✓ keeps the 12px, adds the notch
py-3 pt-safe                                  ✗ 12px becomes 0 on every phone without a notch
```

Anything pinned above the bottom nav offsets from it:
`bottom-[calc(var(--safe-bottom)+9.75rem)]`

None of this works without `viewport-fit=cover` in the viewport meta (`index.html`). Without it
every `env(safe-area-inset-*)` resolves to `0`, the whole vocabulary above is inert, and content
renders under the status bar in the installed iOS PWA. `index.test.ts` guards the meta tag.

## Navigation

`BottomNavigation` is fixed to the bottom, icon + label, thumb-reachable, with a centre mic that opens the Voice Agent.

**One voice entry point per viewport.** On mobile that is the bottom nav's centre mic; on desktop, where the bottom nav is hidden, it is the Voice Agent FAB — which appears on every page **including Home**. Don't add a second control to a screen that already has one: Home used to carry a mic hero card above the nav mic, and the card's own subtitle had to explain that the two did the same thing.

## Card anatomy

```
FoodCard          [image] · name · portion · calories      e.g. Chicken Breast / 200g / 330 kcal
WorkoutCard       name · exercise list · sets × reps       e.g. Push Day / Bench Press / 4 × 8
ExerciseList      per row: [image] · name · sets · reps    e.g. Bench Press / 4 sets × 8 reps
```

Food and workout names are the largest text in a card; calories and sets×reps are secondary but readable. Calories get visual emphasis. Exercises within a workout are clearly separated and scannable.

## Images

Use `<ImagePlaceholder type="food" | "exercise" size="sm" | "md" | "lg" imageUrl={...} />`. It renders the image when `imageUrl` resolves and a tinted lucide icon when it doesn't.

There are no placeholder image files — the fallback is a rendered component, so never point an `<img src>` at a placeholder asset. Passing an undefined `imageUrl` is the correct way to get the fallback.

## Common UI bugs to fix on sight

Broken alignment · text overflow · inconsistent spacing · elements touching screen edges · touch targets under 44px · layouts that don't reflow on small screens.

Images are square with rounded corners and a consistent size — see the Images section above for the fallback. Never render a broken image or an empty box.
