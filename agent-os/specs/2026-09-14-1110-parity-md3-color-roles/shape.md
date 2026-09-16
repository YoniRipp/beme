# Finish the MD3 Colour Role Map — Shaping Notes

Status: shaped, not implemented. Audit-only PR; no application code changes.

## The problem in one sentence

`buildPaperTheme` (`mobile/src/theme.ts:99`) maps **nine** of React Native Paper's
**thirty-three** MD3 colour keys; the other twenty-four keep Paper's stock Material
purple, and six of them are on screen right now.

## What is actually mapped

```
primary · secondary · background · surface · surfaceVariant
outline · onSurface · onSurfaceVariant · error
```

Its docstring says the omission is deliberate — "every MD3 role this doesn't touch keeps
Paper's own default". That was a reasonable call when the file was a stub. It is not one
now: Paper's defaults are not neutral, they are a *different brand*. `MD3DarkTheme`'s
reference palette is built on `primary40 = #6750A4`, and the app ships with
`DEFAULT_SETTINGS.theme = 'dark'`, so the purple is what most users see.

## The six that are visibly wrong today

Each of these was traced from a mobile call site through Paper 5.15.3's own source, not
inferred from the MD3 spec.

| What the user sees | Role | Paper's value (dark / light) | Rendered by |
|---|---|---|---|
| "Log Food" / "Add Workout" in **purple text on the lime pill** | `onPrimary` | `#381E72` / `#FFFFFF` | `Button mode="contained"` — 9 call sites (`components/Button/utils.js`) |
| Selected segment of **every** SegmentedButtons is a **purple block** | `secondaryContainer` + `onSecondaryContainer` | `#4A4458` + `#E8DEF8` / `#E8DEF8` + `#1D192B` | `SegmentedButtons` on Energy, Settings, GoalForm, FoodEntryForm, WorkoutForm (`SegmentedButtons/utils.js:80,123`) |
| "+ Add" buttons are **purple blocks** | same pair | same | `Button mode="contained-tonal"` — 2 call sites |
| The delete-confirmation sheet has a **purple-grey ground** | `elevation.level3` | `rgb(49,44,56)` / `rgb(238,232,244)` | `ConfirmDialog` → Paper `Dialog` (`Dialog/Dialog.js:86`), used on Energy, Body and Goals |
| Its **backdrop is a purple wash**, not the app's scrim | `backdrop` | `rgba(50,47,55,0.4)` | `Portal` → `Modal` (`Modal.js`) |
| The rule between exercise rows is **lilac-grey**, not the warm hairline | `outlineVariant` | `#49454F` / `#CAC4D0` | `Divider` in `WorkoutFormScreen` (`Divider.js:49`) |
| The food-search results card is a **lilac white** | `elevation.level1` | `rgb(37,35,42)` / `rgb(247,243,249)` | `FoodEntryFormScreen.tsx:230` — the one `<Card>` with no `mode`, so it defaults to `elevated` → `Surface` |

`elevation.level1`–`level5` deserve calling out separately: Paper's own source comments
say those five RGB values are `primary40`/`primary80` composited over the surface at
5/8/11/12/14% — they are *literally the purple*, baked into opaque strings so React
Native's shadow handling doesn't break. There is no way to inherit them and not inherit
Material purple.

## The seventh, and the only one that is our own fault

Everything above is Paper's default leaking through. This one is a value **we wrote**, and
it is the highest-priority item in this spec because it is the only defect here that a user
can see that nobody else can be blamed for.

`mobile/src/components/shared/ProgressRing.tsx:44` hardcodes the unfilled ring track:

```tsx
<Circle … stroke="#e5e7eb" … />
```

`#e5e7eb` is Tailwind's `gray-200` — a cool light grey that appears nowhere in the app's
warm palette in either theme. Every other colour in that component is correctly themed
through `useThemedStyles`; the track is the one that was missed.

It sat on the frozen-hex allowlist in `noFrozenPaletteImports.test.ts` with a justification
that was **true when written**:

> the component has no current call sites (`"<ProgressRing"` greps empty), so it is not a
> live dark-mode defect today

PR #303 gives it its first call site — the weekly goal ring on `BodyScreen` — inside a card
whose background is `colors.surface`. Dark is the default theme, so `#e5e7eb` on `#191715`
is a **14.44:1** light-grey hoop on a near-black card. The #303 agent correctly declined to
touch the component (the palette is this spec's) and rewrote the justification so the tree
does not carry a false claim.

### The proposed fix is wrong, and the numbers say so

#303 names `colors.surfaceMuted`. Checked against the web rather than taken as given, and
it does not hold up. The web has **five** ring/track call sites and every one of them uses
the same thing:

```
ui/progress-ring.tsx:46        stroke="hsl(var(--muted))"
insights/AiInsightsSection.tsx:57   stroke="hsl(var(--muted))"
goals/GoalCard.tsx:57          stroke="hsl(var(--muted))"
home/MacroCircles.tsx:49       stroke="hsl(var(--muted))"
pages/Energy.tsx:396           stroke="hsl(var(--muted))"
```

`--muted` is not `--paper-2`. `ColorRoles.surfaceMuted` maps to `--paper-2`, and in dark
mode the two are five lightness points apart — which is the whole ballgame, because the
track has to be visible against the card it sits on:

| track candidate | dark value | on `surface` `#191715` | light value | on `#ffffff` |
|---|---|---|---|---|
| `surfaceMuted` (`--paper-2`) — **as proposed** | `#1b1a18` | **1.03** | `#f5f0eb` | 1.13 |
| `--muted` — **what the web uses** | `#292624` | 1.19 | `#f0edea` | 1.17 |
| `border` (`--hairline`) | `#2e2b28` | 1.27 | `#e0dcd6` | 1.37 |
| `#e5e7eb` — today | `#e5e7eb` | 14.44 | `#e5e7eb` | 1.24 |

At **1.03:1** the proposed track differs from the card by five units per channel. It would
trade a too-loud wrong colour for an invisible one — a ring with no visible remainder, which
reads as "complete" at every value. That is arguably a worse bug than the one it fixes,
because it fails silently.

### So `ColorRoles` needs a `muted` role

There is no role for `--muted` today, which is exactly why #303 reached for the nearest
neighbour. Add it alongside `scrim` and `shadow` (see Gaps) and point the track at it.

If adding a third role is judged too much for this pass, **`border` is the correct interim**
— it is closer to `--muted` than `surfaceMuted` is in *both* themes, and it is the one
existing role that stays visible on a dark card. `surfaceMuted` is the single choice that
fails in the theme that ships as the default.

## Why the existing guards didn't catch it

`mobile/src/theme/__tests__/noFrozenPaletteImports.test.ts` and `rawTextNamesItsFont.test.ts`
are AST scans over `mobile/src`. They are good tests and they close real holes. They cannot
catch this one, for a structural reason worth writing down:

- Both look for **things the app's code wrote** — a hex literal, a frozen-palette import,
  a raw `<Text>` with no font. This bug is the **absence** of a write. There is no
  offending token anywhere in `mobile/src` to find.
- The offending colour values live in `node_modules/react-native-paper/lib/.../v3/tokens.js`,
  which `collectSourceFiles` explicitly skips.

There is a second, narrower blind spot, and `ProgressRing` is a worked example of it: **an
allowlist entry justified by "nothing uses this yet" expires silently.** The frozen-hex
guard's allowlist is a `Record<file, Record<hex, reason>>` where the reason is a free-text
string nothing reads. `ProgressRing`'s entry said "the component has no current call sites
(`"<ProgressRing"` greps empty)" — a claim that was true, is now false, and that no test
re-checked when #303 added the call site. The guard stayed green through the exact
transition that invalidated it.

That particular claim is *mechanically checkable*: "this component has no call sites" is a
grep. An allowlist entry whose stated reason has stopped being true is a defect the guard
can catch on itself.

A sharper irony: `useAppTheme.test.tsx` already contains exactly the right *shape* of
assertion — a numeric WCAG check over the resolved value, written after a near-identical
bug — and it passes while the button renders purple. It measures
`colors.primary` against `colors.primaryForeground`, and `ColorRoles.primaryForeground`
has only three consumers in the whole app (`LoginScreen`, `SignupScreen`, `PeriodSelector`),
all of them hand-rolled. Paper's `Button` reads `paperTheme.colors.onPrimary`. **The
contrast test measures a pair the in-app buttons do not use.**

## Decisions

### Every role gets an explicit value; nothing inherits

The fix is not "map the six that are visible". It is "map all thirty-three and make
inheriting impossible", because the six became visible only when someone happened to use
the component that reads them. `Menu`, `FAB`, `Appbar`, `Snackbar`, `Banner`, `Switch` and
`Checkbox` are all unused today and all read roles in the unmapped set; the next screen to
use one re-introduces the bug.

### The web's palette already answers every question

`packages/shared/src/tokens/colors.ts` is a hex transcription of `frontend/src/index.css`,
and it is **correct** — all thirty light and dark values were re-derived from the CSS HSL
during this audit and every one matched to the byte. The mapping below reads from it, plus
two additions (`scrim`, and an alpha helper) noted under Gaps.

### `secondary → food` is wrong and comes out

`buildPaperTheme` currently maps MD3 `secondary` to `palette.food` (terracotta). Two
problems:

1. `agent-os/standards/frontend/design-tokens.md` says in as many words: *"Terracotta is
   reserved for food/energy — don't spend it as a generic accent."* MD3 `secondary` is the
   definition of a generic accent — Paper spends it on chips, tonal buttons and dialog
   icons regardless of domain.
2. The web's own `--secondary` is `34 24% 92%` — a warm neutral, not terracotta at all.

`food` stays a first-class role in `ColorRoles` for the Energy surfaces that mean it. It
just stops being the app-wide secondary.

### The tonal/selected family maps to the web's `bg-primary/10` pattern

The web has one consistent selected-segment treatment, and it is not a filled pill:

```
frontend/src/components/shared/PeriodSelector.tsx   border-primary bg-primary/10 shadow-sm
frontend/src/components/insights/AiInsightsSection.tsx  bg-primary/10 text-primary
```

That is exactly MD3's container semantic — a 10% tint of the accent with the accent itself
as the foreground. So `primaryContainer`/`secondaryContainer` both become the accent at
10% alpha and their `on*` partners become the accent. React Native accepts `#RRGGBBAA`, so
this is a literal transcription, not an approximation, and it follows the user's accent
choice for free because `useAppTheme` already resolves `primary` from `accentHex`.

`mobile/src/components/shared/PeriodSelector.tsx` is the proof this is the intent: it
already hand-overrides its selected `Chip` to `colors.primary` / `colors.primaryForeground`
to escape the purple. Once the roles are mapped, that override is dead code.

### `elevation.*` becomes the surface, and shadow comes from the shadow scale

The web never tints a card background by depth — `card.tsx` is `bg-card shadow-card`, a
flat surface plus a box-shadow. Paper's tonal-elevation model is the opposite. Mapping all
six levels to `palette.surface` gives the web's behaviour and removes the purple in one
move. The actual depth cue belongs to the shadow scale, which is a separate concern —
see `2026-09-14-1112-parity-radius-elevation-spacing`.

`level0` stays `'transparent'`; that is not a colour, it is Paper's "no surface" sentinel.

## The full map

Light and dark both read from the resolved `ColorRoles` palette, so one table covers both.
`α(x, n)` means "role `x` at `n` alpha", i.e. an eight-digit hex.

### Already mapped — keep

| Role | → | Note |
|---|---|---|
| `primary` | `palette.primary` | accent-resolved in `useAppTheme` |
| `background` | `palette.background` | `--paper` |
| `surface` | `palette.surface` | `--card` |
| `surfaceVariant` | `palette.surfaceMuted` | `--paper-2` |
| `outline` | `palette.border` | `--hairline` |
| `onSurface` | `palette.text` | `--ink` |
| `onSurfaceVariant` | `palette.textMuted` | `--ink-3` |
| `error` | `palette.danger` | `--destructive` |

### Changed

| Role | from | → | Why |
|---|---|---|---|
| `secondary` | `palette.food` | `palette.textMuted` | Terracotta is domain-reserved; Paper spends `secondary` only on `DialogIcon`, where the web would use muted ink |

### Newly mapped — the twenty-four

| Role | Paper default (dark / light) | → | Reachable today via |
|---|---|---|---|
| `onPrimary` | `#381E72` / `#FFFFFF` | `palette.primaryForeground` | `Button` contained, `IconButton` contained, `FAB` |
| `primaryContainer` | `#4F378B` / `#EADDFF` | `α(primary, 0.10)` | `FAB`, `Button` (future) |
| `onPrimaryContainer` | `#EADDFF` / `#21005D` | `palette.primary` | same |
| `secondaryContainer` | `#4A4458` / `#E8DEF8` | `α(primary, 0.10)` | **SegmentedButtons selected, `Button` contained-tonal, `Chip` selected, `IconButton`** |
| `onSecondaryContainer` | `#E8DEF8` / `#1D192B` | `palette.primary` | same |
| `onSecondary` | `#332D41` / `#FFFFFF` | `palette.surface` | nothing today; pairs with `secondary` |
| `tertiary` | `#EFB8C8` / `#7D5260` | `palette.food` | nothing today |
| `onTertiary` | `#492532` / `#FFFFFF` | `palette.primaryForeground` | nothing today |
| `tertiaryContainer` | `#633B48` / `#FFD8E4` | `palette.foodSoft` | nothing today |
| `onTertiaryContainer` | `#FFD8E4` / `#31111D` | `palette.food` | nothing today |
| `surfaceDisabled` | `rgba(230,225,229,0.12)` / `rgba(28,27,31,0.12)` | `α(text, 0.12)` | `Button`/`Chip`/`SegmentedButtons`/`TextInput` disabled |
| `onSurfaceDisabled` | `rgba(230,225,229,0.38)` / `rgba(28,27,31,0.38)` | `α(text, 0.38)` | same |
| `onBackground` | `#E6E1E5` / `#1C1B1F` | `palette.text` | `List`, `Text` outside a `Surface` |
| `onError` | `#601410` / `#FFFFFF` | `palette.surface` | `TextInput` error, `Snackbar` |
| `errorContainer` | `#8C1D18` / `#F9DEDC` | `α(danger, 0.10)` | `HelperText`, `Banner` |
| `onErrorContainer` | `#F9DEDC` / `#410E0B` | `palette.danger` | same |
| `outlineVariant` | `#49454F` / `#CAC4D0` | `palette.border` | **`Divider`** |
| `inverseSurface` | `#E6E1E5` / `#313033` | `palette.text` | `IconButton`, `Snackbar`, `Tooltip` |
| `inverseOnSurface` | `#313033` / `#F4EFF4` | `palette.background` | same |
| `inversePrimary` | `#6750A4` / `#D0BCFF` | `palette.primary` | `Snackbar` action label |
| `shadow` | `#000000` | `palette.shadow` (new) | `Surface` on Android |
| `scrim` | `#000000` | `palette.scrim` (new) | `Drawer` |
| `backdrop` | `rgba(50,47,55,0.4)` | `α(scrim, 0.5)` | **`Portal`/`Modal` → every `ConfirmDialog`** |
| `elevation.level0` | `'transparent'` | `'transparent'` | sentinel, unchanged |
| `elevation.level1`–`level5` | `rgb(37,35,42)` … `rgb(52,49,63)` / `rgb(247,243,249)` … `rgb(233,227,241)` | `palette.surface` | **`Card` default mode, `Dialog`, `Searchbar`, `Button` elevated, `Menu`, `Appbar`, `BottomNavigation`** |

`shadow` and `scrim` are the only two entries with no counterpart in `ColorRoles` today —
see Gaps.

## Gaps this opens in `packages/shared/src/tokens`

Small, and all mechanical transcriptions of CSS that already exists:

- **`scrim`** — the web has `--scrim` (`20 14% 8%` light = `#171312`, `0 0% 0%` dark) and
  both `dialog.tsx` and `sheet.tsx` overlay with `bg-scrim/50`. `ColorRoles` has no
  equivalent. Add it.
- **`muted`** — `--muted` (`32 18% 93%` = `#f0edea` light, `30 7% 15%` = `#292624` dark).
  Distinct from `surfaceMuted`/`--paper-2`, and the web spends it on every progress-ring
  track (5 call sites) plus `progress.tsx`'s bar. This is the role `ProgressRing` needs and
  the reason its fix was mis-aimed. Note in the header comment that `--muted` and
  `--paper-2` are *different colours* and which one is which — the near-identical names are
  what made the wrong one look right.
- **`shadow`** — the web's light shadows are `hsl(28 20% 20% / …)` (a warm near-black,
  `#3d3229`), dark is pure black. Add it, so Android elevation is not hardcoded to `#000`.
- **An alpha helper.** Six of the mappings above are "role at N%". Put one
  `withAlpha(hex, alpha): string` in the tokens package rather than six eight-digit
  literals that drift when the accent changes. It has to be a function, not a constant,
  because `primary` is accent-resolved at runtime.

## The guard that prevents recurrence

Three layers, in ascending order of value.

### 1. Assert the resolved theme has no Paper defaults left

The only assertion that distinguishes "mapped" from "inherited" is one made against the
built theme object, comparing every key against Paper's base:

```
for each role in Object.keys(MD3DarkTheme.colors):
    buildPaperTheme(MD3DarkTheme, darkColors).colors[role] !== MD3DarkTheme.colors[role]
```

with a small, *reasoned* allowlist (`elevation.level0` is legitimately `'transparent'` in
both). This is the `useAppTheme` contrast test's own logic — measure what is resolved, not
what was intended — applied one layer out. It fails the moment Paper adds a role in a minor
version, which is the correct behaviour: a new MD3 role is a new decision, not a default to
inherit silently.

### 2. Assert contrast on the pairs Paper actually renders

Extend the existing WCAG test from `colors.primary`/`colors.primaryForeground` to the
`paperTheme.colors` pairs that end up on screen: `primary`/`onPrimary`,
`secondaryContainer`/`onSecondaryContainer`, `surface`/`onSurface`,
`background`/`onBackground`, `error`/`onError`. Across all four accents and both schemes,
as it already does. This is the assertion that would have caught the original bug —
`#381E72` on `#b5ef57` is 3.06:1 and fails AA.

### 3. Assert the shared tokens still equal the web's CSS

`packages/shared/src/tokens/colors.ts` was transcribed from `frontend/src/index.css` by
hand. Today it is perfect. Nothing stops the next palette edit from making it wrong, and
`colors.test.ts` only checks that the role keys exist and are hex-shaped. A test that
parses the `:root` / `.dark` blocks out of `index.css`, converts HSL to hex, and compares
against `lightColors`/`darkColors` turns a silent drift into a red build. It is worth more
than this entire fix, because it is the only thing that keeps the fix true.

### The blocker under all three: **mobile's tests never run in CI**

`.github/workflows/ci.yml`'s `mobile` job runs `npx tsc --noEmit` and stops. There is no
`npm test` step. `mobile/package.json` has `"test": "jest"` and seven suites under
`src/theme/__tests__/`, and **none of them have ever run on a pull request.** The two AST
guards that exist "because seven files had drifted" are, in CI terms, decorative.

`packages/shared` is worse: it has a `"test": "vitest run"` script and no CI job at all.
The frontend job's vitest is rooted at `frontend/`, so it does not pick up
`packages/shared/src/**/__tests__`. Its token tests, `accent.test.ts` and the six domain
suites are also unrun.

**Fixing CI is a precondition, not a follow-up.** Adding a guard to a suite nothing
executes changes nothing.

## What already matches — verified, not assumed

Reported honestly because several of these were expected to be broken:

- **The shared hex palette is exact.** All 15 light and 15 dark values in
  `packages/shared/src/tokens/colors.ts` were re-derived from the HSL triples in
  `frontend/src/index.css` and every single one matched, including the two subtle ones
  (`textMuted` at the post-a11y `24 9% 42%`, and dark `primaryForeground` correctly
  resolving `var(--paper)` to `#110f0e`).
- **`accentHex` derives rather than duplicates.** `packages/shared/src/settings/accent.ts`
  computes its hex from `ACCENT_PALETTE`'s HSL at module load, so the accent colours cannot
  drift from their triples.
- **The accent trap is already handled.** `useAppTheme` correctly resolves `primary` *and*
  `primaryForeground` from `accentHex`, so mobile shows the same lime the live site shows
  rather than the base sage. Its docstring explains why. This is the part that was done
  right.
- **`useThemedStyles` is the correct shape** and the frozen-palette guard is genuinely
  strict — namespace imports, `require()`, and bare hex literals are all covered, with a
  per-(file, value) allowlist rather than whole-file skips.
- **Light mode hides the worst of it.** Paper's light `onPrimary` is `#FFFFFF`, which
  happens to be close to the app's `#fcfaf8`. Only the dark theme — the default — shows the
  purple. Anyone testing in light mode would not have seen this.

## Open questions for the parent session

1. **`primaryContainer` as alpha vs. as `primarySoft`.** `ColorRoles` already has
   `primarySoft` (`--sage-50`), which is a *sage* tint and therefore does not follow the
   user's accent the way `bg-primary/10` does on the web. This spec chooses the alpha
   composite for accent fidelity. The counter-argument is that Paper's `Surface` docs warn
   translucent backgrounds push shadows onto child nodes — which does not affect
   `SegmentedButtons`/`Chip`/tonal `Button` (no shadow), but would affect a `Card` if one
   ever used a container role. Recommendation: alpha.
2. **Whether the web should adopt `--secondary` for its selected segments.** Right now the
   web spells the pattern out longhand at each call site (`bg-primary/10 text-primary`)
   rather than as a token. Mobile is about to acquire a named role for it. That asymmetry
   is fine, but a `--primary-soft` token on the web would let both clients name the same
   thing. Not proposed here — web is the reference and gets to stay as it is.
3. **Paper's `Chip`/`Button` disabled states use alpha over the surface; the web uses
   `disabled:opacity-50` on the whole element.** These are not the same rendering. The
   mapping above matches MD3's mechanism with the app's ink; matching the web exactly would
   mean overriding opacity per component. Recommendation: accept the MD3 mechanism, since
   the colour is now the app's.

## Constraints

- **Web is the reference.** Every value above is read from `frontend/src/index.css` or a
  `frontend/src/components/ui/` primitive. Nothing is invented.
- **No API shapes change.** This is presentation only.
- `ColorRoles` gains three keys (`scrim`, `shadow`, `muted` — this line said "two" and
  omitted `muted`, which the Gaps section above adds and the ring fix depends on). All
  additive, so no existing
  consumer breaks.
- Fixing this without fixing CI leaves the next regression exactly as undetectable.
