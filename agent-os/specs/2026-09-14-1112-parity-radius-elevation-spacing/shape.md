# Radii, Elevation and the Missing Primitive Layer — Shaping Notes

Status: shaped, not implemented. Audit-only PR; no application code changes.

## Scope

The shape half of the design system: corner radii, elevation/shadow, spacing, and the
component primitives each client builds on. Colour is a separate spec
(`2026-09-14-1110-parity-md3-color-roles`).

One sentence: **the web has a primitive layer and mobile doesn't**, so on the web a radius
is decided once in `components/ui/card.tsx` and on mobile it is re-decided in every file —
except where React Native Paper decides it instead, by multiplying a number nobody chose it
to be multiplied by.

## Finding 1 — `roundness: 12` is not 12 anywhere

`buildPaperTheme` sets `roundness: radius.md` (12). Paper's MD3 components do not use
`roundness` as a radius; they use it as a *unit* and multiply it, with a different fixed
factor each:

| Paper component | factor (source) | resolves to | web equivalent | delta |
|---|---|---|---|---|
| `Button` | 5× (`Button/Button.js:133`) | 60 → clamps to a full pill on a ~40px control | `rounded-md` = 12 (`button.tsx`) | pill vs gently rounded rectangle |
| `SegmentedButtons` | 5× (`SegmentedButtons/SegmentedButtonItem.js:72`) | 60 → pill | `rounded-sm` = 10 (`tabs.tsx`) | pill vs near-square |
| `Card` | 3× (`Card/Card.js:158`) | 36 | `rounded-2xl` = 22 | +64% |
| `Dialog` | 7× (`Dialog/Dialog.js:84`) | 84 → clamps | `rounded-lg` = 14 | very round vs modest |
| `Chip` | 2× (`Chip/Chip.js:117`) | 24 | `rounded-full` / `rounded-xl` = 18 | close, by luck |
| `Searchbar` bar mode | 7× (`Searchbar.js:132`) | 84 → pill | `rounded-md` = 12 (`input.tsx`) | pill vs rectangle |

The important consequence: **no value of `roundness` fixes this.** The factors are fixed
in Paper, and the web's own radii for those six elements are 12, 10, 22, 14, 18 and 12 —
they do not sit in the ratio 5 : 5 : 3 : 7 : 2 : 7. Tuning `roundness` trades one wrong
component for another. The web's buttons need `roundness = 2.4`, its cards need `7.33`,
its dialogs need `2`.

So the fix is not a better constant. It is to stop letting Paper's ratio decide.

`mobile/src/components/shared/SearchBar.tsx` already discovered this and passes
`borderRadius: radius.md` in its own style, which wins over Paper's internal value. That is
the right escape hatch used once, ad hoc, in one file.

## Finding 2 — the radius scale is missing the step cards are made of

| | sm | md | lg | xl | 2xl | 3xl |
|---|---|---|---|---|---|---|
| web (`tailwind.config.js`, derived from `--radius: 0.875rem`) | 10 | 12 | 14 | 18 | **22** | **30** |
| shared (`packages/shared/src/tokens/spacing.ts`) | 10 | 12 | 14 | 18 | — | — |

The four steps that exist are exact. The two that are missing are the top of the scale, and
`rounded-2xl` is not a rarity: it is used **33 times** on the web, and
`agent-os/standards/frontend/mobile-ui.md` names it as *the* card radius — "every food,
workout and exercise item is a card — `rounded-2xl`, `shadow-card`, generous padding".

Mobile therefore cannot express the one radius its own standard mandates. All four of its
card components fall back to `radius.lg` (14):

```
components/shared/MetricCard.tsx:37        borderRadius: radius.lg
components/shared/MobileFoodCard.tsx:20    borderRadius: radius.lg
components/shared/MobileGoalCard.tsx:30    borderRadius: radius.lg
components/shared/MobileWorkoutCard.tsx:23 borderRadius: radius.lg
```

`rounded-3xl` (30) has **zero** usages on the web, so leaving it out is defensible.
Leaving out `2xl` is not. Add `xxl: 22`; skip `3xl` until something needs it, and say why in
the comment rather than adding a step nobody uses.

## Finding 3 — there is an elevation token and nothing has ever used it

`packages/shared/src/tokens/spacing.ts` exports:

```ts
export const elevation = {
  xs: { offsetY: 1, blur: 2, opacity: 0.04 },
  sm: { offsetY: 1, blur: 3, opacity: 0.06 },
  md: { offsetY: 4, blur: 8, opacity: 0.06 },
  lg: { offsetY: 12, blur: 32, opacity: 0.08 },
} as const;
```

Consumers, across all three packages: **none.** Not one import. The only `elevation:` key
anywhere in `mobile/src` is `elevation: 0` in `SearchBar.tsx`, switching Paper's shadow
*off*.

So: **the Expo app renders no shadows at all.** Its cards are flat rectangles with a 1px
border. The web's are `bg-card shadow-card` — raised, with a soft warm shadow, on 33 card
instances. Two clients, two different depth models.

The token is also under-specified for its only intended consumer. React Native needs
`shadowColor` + `shadowOffset` + `shadowOpacity` + `shadowRadius` on iOS and a single
`elevation` integer on Android. The token supplies neither a colour nor an Android value,
and its own comment concedes it keeps only the *outer* of each CSS shadow's two layers.
Whoever implements this has to finish the token, not just import it.

## Finding 4 — mobile has no primitive layer, which is why 1–3 exist

This is the root cause and worth stating on its own.

The web has `frontend/src/components/ui/` and `frontend/CLAUDE.md` calls it "**the** design
system". `agent-os/standards/frontend/components.md` is explicit: *"Reach for
`components/ui/` first. A new styled `<div>` that duplicates `card.tsx` or `button.tsx` is a
bug."* One `card.tsx` decides `rounded-2xl border border-border bg-card shadow-card`, and 33
call sites inherit it.

Mobile has `components/shared/`, which holds finished domain components — `MetricCard`,
`MobileFoodCard`, `MobileGoalCard`, `MobileWorkoutCard`, `MobileScreen`, `ProgressRing`,
`SearchBar`, `PeriodSelector`, `ConfirmDialog` — and no primitives underneath them. Each of
the four cards re-declares the same three lines in its own `StyleSheet`:

```
backgroundColor: colors.surface
borderRadius: radius.lg
borderWidth: 1, borderColor: colors.border
```

That is four copies of `card.tsx` with no `card.tsx`. It is the mobile equivalent of the
styled `<div>` the standard calls a bug, and it is why fixing the card radius today means
editing four files and hoping the fifth author greps first.

The same absence explains the ad-hoc `borderRadius` in `SearchBar.tsx`, the four different
answers to "what is a card", and the fact that nothing consumes the elevation token — there
is no single place a shadow would go.

## Finding 5 — Paper's default icon-button hit area is 34px

`IconButton size={18}` appears at 8 call sites. Paper computes the container as
`size + 2 * PADDING` where `PADDING = 8` (`IconButton/IconButton.js:20,81`), so the touch
target is **34×34**.

`agent-os/standards/frontend/mobile-ui.md`: *"Touch targets ≥ 44px. Icon-only buttons still
need a 44px hit area."* The web honours it — `quick-tile.tsx` is `h-11 w-11`, exactly 44.
On a native client, where there is no mouse fallback at all, 34px is worse than it is on the
web.

This belongs to the design system rather than to any one screen because it is the default
of a primitive: the fix is one `size`/`containerSize` decision, not eight.

## Decisions

### A `components/ui/` layer for mobile, mirroring the web's

Three primitives cover everything above: `Card`, `Button`, `Screen`. Each wraps the Paper
component and pins the radius, border and elevation the web's equivalent uses, so the
per-file `StyleSheet` copies collapse and Paper's `roundness` multipliers stop mattering.

Put them in `mobile/src/components/ui/`, matching `frontend/src/components/ui/` by name, so
the two clients' trees read the same and `components.md`'s "reach for `ui/` first" rule
applies verbatim to both.

`components/shared/` keeps the composite/domain pieces, exactly as it does on the web.

### `roundness` stays, but stops being load-bearing

Leave `roundness: radius.md`. It still governs the Paper components nothing wraps, and
lowering it would make those *more* wrong, not less. The primitives override what they own.
Record in `buildPaperTheme`'s docstring that `roundness` is a fallback, not the app's radius,
with the multiplier table above — the next person to "fix" it by changing the constant needs
to see why that doesn't work.

### Mobile follows the *standard's* shadow scale, not the web's actual usage

Complication, reported rather than smoothed over: **the web does not follow its own shadow
standard.**

`design-tokens.md` says shadows come from `shadow-xs · shadow-card · shadow-card-md ·
shadow-card-lg`. `tailwind.config.js` *adds* those four but does not remove Tailwind's
stock `sm`/`md`/`lg`, and the codebase reaches for the stock ones more often:

| app scale | count | | Tailwind stock | count |
|---|---|---|---|---|
| `shadow-card` | 15 | | `shadow-sm` | 16 |
| `shadow-card-lg` | 11 | | `shadow-md` | 15 |
| `shadow-xs` | 2 | | `shadow-lg` | 9 |
| `shadow-card-md` | 1 | | | |
| **29** | | | **40** | |

These are different shadows. `shadow-card` is `var(--shadow-sm)` — two layers of
`hsl(28 20% 20%)`, a warm near-black. Tailwind's `shadow-sm` is one layer of
`rgb(0 0 0 / 0.05)`, neutral. So "what shadow does a card have on the web" has two answers
depending on which file you open.

Mobile follows **the standard** (`shadow-card` → `elevation.sm`), because that is the
documented intent and because `card.tsx` itself uses `shadow-card`. The 40 stock-Tailwind
usages on the web are a real web-side inconsistency but not this spec's to change — the web
is the reference and stays as it is. Raised as an open question below.

### Spacing needs enforcement, not a new scale

The scale already agrees — see "What already matches". What is missing is anything stopping
a literal. 44 numeric spacing values sit in `mobile/src` beside 74 token references, and six
are off-scale entirely: `2` (×3), `3`, `6` (×2), `10`, `14` (×2), `40`.

```
components/shared/MobileFoodCard.tsx:48,52   marginTop: 2, marginTop: 3
components/shared/MobileGoalCard.tsx:62      marginTop: 2
components/shared/MobileWorkoutCard.tsx:53   marginTop: 2
navigation/MainTabs.tsx:38                   paddingTop: 6
screens/InsightsScreen.tsx:30                gap: 6
screens/FoodEntryFormScreen.tsx:92           paddingVertical: 10
screens/LoginScreen.tsx:68                   padding: 14
screens/SignupScreen.tsx:63                  padding: 14
screens/WorkoutFormScreen.tsx:40             padding: 16, paddingBottom: 40
```

An AST guard in the shape of the two that already exist is the durable answer, with an
allowlist for the genuine exceptions (below).

## What already matches — verified, not assumed

- **The spacing scale is identical.** Shared `spacing` is `4 · 8 · 12 · 16 · 24 · 32`;
  `mobile-ui.md` names `4 · 8 · 12 · 16 · 24 · 32`; `tailwind.config.js` does not override
  `theme.extend.spacing`, so the web is on Tailwind's stock 4px scale, which is the same
  increments. Nothing to reconcile — this was expected to be a finding and isn't.
- **The four radius steps that exist are exact.** `sm 10 · md 12 · lg 14 · xl 18` matches
  `calc(var(--radius) − 4 / − 2 / + 0 / + 4)` against `--radius: 0.875rem`, and
  `colors.test.ts` already pins the ascending order after a real prior regression
  (commit `1f7ba25`).
- **`SearchBar.tsx`'s `borderRadius: radius.md` is correct**, matching `input.tsx`'s
  `rounded-md`. It got there by hand rather than by system, but the value is right.
- **`borderRadius: 5` in `InsightsScreen.tsx:31` is not a violation.** It is half of a
  10×10 legend dot — React Native's only way to write `rounded-full`. Flagged here so a
  future radius guard allowlists it deliberately instead of someone "fixing" it to
  `radius.sm` and squaring off the dot.
- **`Card mode="contained"` and `mode="outlined"` already resolve to mapped colour roles**
  (`surfaceVariant` and `surface`); only the default `elevated` mode leaks. 10 of 11 `Card`
  call sites pass an explicit `mode`.

## Open questions for the parent session

1. **Which shadow is a card's shadow on the web?** The standard says `shadow-card`; the code
   says `shadow-sm` about as often. This spec picks the standard. If the intent is actually
   Tailwind's stock scale, then `design-tokens.md` is wrong and the shared `elevation`
   token was transcribed from the wrong source. Recommendation: keep the standard, and treat
   the 40 stock usages as a separate web cleanup — but someone who knows the design intent
   should confirm before mobile hard-codes a match.
2. **Should mobile's cards have shadows at all?** Flat-with-a-border is a defensible native
   idiom, and iOS's own lists are flat. Parity says match the web. Expo's current
   flat-bordered look may genuinely be better on device — but per the ground rules that is
   not this spec's call. Recommendation: match the web, because a border *and* a shadow is
   what `card.tsx` does (`border border-border` + `shadow-card`), so this is additive rather
   than a change of idiom.
3. **`xxl` vs `2xl` as the token name.** The shared scale uses word-ish keys (`sm/md/lg/xl`)
   and `spacing` already uses `xxl`. Tailwind uses `2xl`. Recommendation: `xxl`, for
   consistency inside the package, with the CSS name in the comment.
4. **Does the primitive layer justify its own standards file?** `components.md` is written in
   terms of `<div>` and shadcn. Recommendation: widen it rather than fork it, so there is
   one rule about primitives rather than two that can drift.

## Constraints

- **Web is the reference.** Every target value traces to `tailwind.config.js`,
  `frontend/src/index.css` or a `frontend/src/components/ui/` primitive.
- **Never break existing functionality.** Introducing `components/ui/` must not require a
  big-bang migration; the four card components can adopt it one at a time, and the guard in
  Task 6 lands last for that reason.
- **No API shapes change.** Presentation only.
- The existing AST guards must stay green; a spacing guard joins them rather than replacing
  them.
</content>
