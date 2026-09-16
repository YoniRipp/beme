# Mobile Design Tokens

The Expo client draws from the same palette as the web. `frontend/src/index.css` is the
source of truth; `packages/shared/src/tokens/colors.ts` is that file transcribed to hex
(React Native has no `hsl()`), and `packages/shared/src/tokens/__tests__/webPaletteParity.test.ts`
holds the two together — it parses the CSS and fails if they drift.

Read `frontend/design-tokens` first. This is the mobile half, not a replacement.

## `roundness` is not this app's radius

Paper does not use the theme's `roundness` as a corner radius. It uses it as a **unit** and
multiplies it by a different fixed factor per component, so `roundness: 12` renders:

| component | factor | renders | the web's value |
|---|---|---|---|
| `Button` | 5x | 60 -> clamps to a pill | 12 (`rounded-md`) |
| `SegmentedButtons` | 5x | 60 -> pill | 10 (`rounded-sm`) |
| `Card` | 3x | 36 | 22 (`rounded-2xl`) |
| `Dialog` | 7x | 84 -> clamps | 14 (`rounded-lg`) |
| `Chip` | 2x | 24 | 18 (`rounded-xl`) |
| `Searchbar` (bar mode) | 7x | 84 -> pill | 12 (`rounded-md`) |

**No value of `roundness` fixes this**, so do not try to tune it. The web's six radii are
12, 10, 22, 14, 18 and 12, which are not in the ratio 5 : 5 : 3 : 7 : 2 : 7 — its buttons
would need `roundness = 2.4`, its cards `7.33`, its dialogs `2`. Changing the constant trades
one wrong component for another.

A style on the component wins over Paper's internal value, so that is where the web's number
goes: `mobile/src/components/ui/` wraps `Card`, `Button` and `IconButton` and pins each.
`roundness` stays at `radius.md` as the fallback for the Paper components nothing wraps.

## The primitive layer

`mobile/src/components/ui/` mirrors `frontend/src/components/ui/` by name, so
`frontend/components`'s "reach for `ui/` first" reads across both clients. `components/shared/`
keeps the composite and domain pieces, exactly as it does on the web.

Two guards hold it, both in `mobile/src/theme/__tests__/`:

- `cardsUseThePrimitive.test.ts` — no hand-rolled card surface (a `surface` fill, a hairline
  border and a card-sized corner) outside `ui/`, and nothing outside `ui/` imports `Card`,
  `Button` or `IconButton` straight from Paper. Importing them directly silently opts back
  into all three wrong defaults, and an unstyled Paper `Card` inherits the 36px corner
  without any local style for the first guard to see.
- `spacingUsesTheScale.test.ts` — spacing and radii come from the scale. Spacing accepts any
  Tailwind step, including the half-steps the web genuinely uses (`gap-1.5`, `mt-0.5`,
  `py-2.5`, `p-3.5`); radii accept only the five real steps, because a corner that is merely
  a multiple of 4 is drift. `rounded-full` and a circle (a radius at half a literal
  `width`/`height` in the same object) are exempt structurally rather than by allowlist.

Both take allowlist entries with a written reason per entry, never a blanket skip.

## Shadows: mobile renders them now

The shared `elevation` token had no importers in any package, so the Expo app rendered no
shadows at all — flat rectangles with a 1px border, against the web's `bg-card shadow-card`.
`shadowStyle(step, shadowColor)` in `packages/shared/src/tokens/spacing.ts` builds the five
properties React Native needs; `ui/Card` uses the `sm` step, matching `card.tsx`.

Two things about it that look like mistakes and are not. `shadowRadius` is `blur / 2`,
because CSS blur describes the whole gaussian and RN's radius half of it. And the colour must
be passed in from `colors.shadow` (`#3d3229` light, `#000000` dark) — it is not defaulted,
because a shadow that quietly falls back to black is what that role was added to prevent.
Android reads only the `elevation` integer and ignores the colour entirely, so the web's warm
hue survives on iOS alone.

## Never inherit an MD3 role

`buildPaperTheme` (`mobile/src/theme.ts`) maps **every** one of React Native Paper's MD3
colour keys. An unmapped role is not "unstyled" — Paper's MD3 themes are generated from
`primary40 = #6750A4`, so an unmapped role renders in Material purple. Nine of thirty-three
were mapped once, and six of the other twenty-four were on screen: purple text on the lime
CTA, a purple block behind every selected segment, a purple-grey dialog on a purple wash, a
lilac divider.

- A role Paper adds in a future version is a **decision**, not a default to inherit.
  `mobile/src/theme/__tests__/everyMd3RoleIsMapped.test.ts` walks Paper's own keys and fails
  on anything left at a default, so the decision is forced at upgrade time.
- Two assertions there, not one: every role differs from Paper's base, **and** every role
  traces back to a `ColorRoles` value. The first alone accepts an invented colour; the
  second alone accepts an inherited one that happens to be black.
- Don't reach for a per-call-site colour prop (`buttonColor`, `textColor`, a
  `backgroundColor` style on a Paper element) to escape a default. That is the workaround
  `PeriodSelector` carried for a release; fix the role instead. A genuine semantic
  difference — `ConfirmDialog`'s destructive action in `colors.danger` — is not a workaround
  and stays.

## Pick the role the web actually spends, not the nearest name

Trace the web call site before choosing. Two roles that read as synonyms:

| role | css | what it is |
|---|---|---|
| `surfaceMuted` | `--paper-2` | the ground under a muted **section** |
| `muted` | `--muted` | the **track/fill** — every progress ring and bar the web renders (`goals/GoalCard.tsx`, `home/MacroCircles.tsx`, `home/WaterTracker.tsx`, …), and its empty week-strip day boxes |

Against the `surface` card in dark — the theme that ships as the default — `surfaceMuted` is
**1.03:1** and `muted` is **1.19:1**. A ring drawn on the first has no visible remainder, so
it reads as complete at every value. Two separate agents picked the wrong one by name.

Compute the contrast. It is arithmetic, and it is the difference between a quiet colour and
an invisible one.

## New colours are tokens first

A colour that isn't in `ColorRoles` doesn't go in a component, and doesn't go in the theme
map either — an unmapped MD3 role is a one-off colour that somebody else chose. Add the role
to `packages/shared/src/tokens/colors.ts`, with its CSS counterpart named in the header
comment, then reference it.

- Never inline a hex. `mobile/src/theme/__tests__/noFrozenPaletteImports.test.ts` fails the
  build on one, and on any import of the frozen `colors`/`lightColors`/`darkColors` exports.
  Read the live theme: `useThemedStyles((colors) => …)` or `useThemeContext()`.
- A colour at partial opacity is `withAlpha(role, n)` from the tokens package — a function,
  not a constant, because `primary` is resolved at runtime from the user's accent.

## An allowlist entry is a claim, not a note

The frozen-hex guard's exemptions are claims about the codebase. `ProgressRing`'s was "the
component has no current call sites"; a later PR added one and the guard stayed green
through exactly the change that invalidated it. Where a reason is mechanically checkable,
express it as a condition (`unusedComponent: 'X'`) so it expires loudly. Free text is for
exemptions that make no claim that can stop being true.

## Test what is resolved, not what was intended

A `.toBeDefined()` on a colour passes throughout the bug it was written for. Assert over the
value the app actually resolves — and over the value the **rendering component** reads:
`useAppTheme.test.tsx` measured `colors.primaryForeground` at 14:1 while Paper's `Button`
painted `paperTheme.colors.onPrimary` in purple. Right shape of assertion, wrong pair.

Contrast thresholds are per pair with a stated reason. A blanket 4.5:1 is either unmeetable
(the web's own `bg-primary/10 text-primary` is 4.10:1 on the blue accent) or so low it
asserts nothing.
