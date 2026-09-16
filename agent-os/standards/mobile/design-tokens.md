# Mobile Design Tokens

The Expo client draws from the same palette as the web. `frontend/src/index.css` is the
source of truth; `packages/shared/src/tokens/colors.ts` is that file transcribed to hex
(React Native has no `hsl()`), and `packages/shared/src/tokens/__tests__/webPaletteParity.test.ts`
holds the two together — it parses the CSS and fails if they drift.

Read `frontend/design-tokens` first. This is the mobile half, not a replacement.

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
