# Typography — Weights That Don't Exist, and Text That Names No Font

Status: shaped, not implemented. Audit-only PR; no application code changes.

## Scope

The type half of the design system: which faces each client loads, which weights it can
actually render, the typescale mapping, and letter-spacing. Colour is
`2026-09-14-1110-parity-md3-color-roles`; radii/elevation/spacing is
`2026-09-14-1112-parity-radius-elevation-spacing`.

## Finding 1 — mobile asks for five weights and loads two

`mobile/App.tsx` loads exactly three static faces:

```
Inter_400Regular · Inter_500Medium · Fraunces_500Medium
```

`mobile/src/theme.ts` exports them as `fonts.regular`, `fonts.medium`, `fonts.display`.

Weights actually named in `mobile/src` styles:

| weight | count | face loaded? |
|---|---|---|
| `'800'` | 15 | **no** |
| `'700'` | 6 | **no** |
| `'600'` | 6 | **no** |
| `'500'` | 2 | yes |
| `'400'` | 1 | yes |

**27 of 30 weight declarations name a weight with no file behind it.**

This is not a subtle trap — `theme.ts`'s own docstring states the rule precisely:

> `@expo-google-fonts/*` ships one static file per weight rather than a single variable
> font, so (unlike CSS) there is no `font-weight` that retargets which file renders — the
> weight you want has to be the specific family name you loaded and reference here.

The codebase documents the rule and then breaks it 27 times. Each `@expo-google-fonts`
weight registers as its **own family name**, so a single-face family cannot honour a
`fontWeight` request; what it does instead (synthesise, ignore, or fall back to the system
face) differs by platform and RN version and **needs a device to confirm** — but the
specification is wrong either way, and no reading of it produces Inter SemiBold.

The web needs, by usage: `font-medium` 114 · `font-bold` 112 · `font-semibold` 95 ·
`font-extrabold` 34 · `font-normal` 10. Mobile can express two of those five.

## Finding 2 — the three most-seen text styles in the app name no font at all

| file | style | what it is |
|---|---|---|
| `navigation/MainTabs.tsx:29` | `tabBarLabelStyle: { fontSize: 10, fontWeight: '700' }` | the six tab labels, on every screen |
| `navigation/MainTabs.tsx:33` | `headerTitleStyle: { fontWeight: '800', color: colors.text }` | every tab screen's header |
| `navigation/RootNavigator.tsx:36` | `headerTitleStyle: { color: colors.text, fontWeight: '800' }` | every modal screen's header |

None sets `fontFamily`. All three render in the platform's system face — SF Pro on iOS,
Roboto on Android — not Inter or Fraunces.

**The `rawTextNamesItsFont` guard cannot catch this.** It fires only on files that
`import { Text } from 'react-native'`; `MainTabs.tsx` imports no `Text` at all, so it is
exempt by construction. React Navigation's `tabBarLabelStyle` / `headerTitleStyle` are text
styles that never pass through a `<Text>` import, and they are the guard's blind spot.

That matters more than it sounds. The guard's own docstring explains it exists because
Task 5 "loaded Fraunces + Inter, wired them into Paper, and shipped 17 green tests — and the
app still rendered its sign-in screen in the system font". The same class of miss is still
live, one layer over, on the tab bar and every screen header.

Web equivalents, for the target values:

```
tab label   frontend/src/components/layout/BottomNavigation.tsx:30
            text-caption font-bold uppercase tracking-[0.06em]
            → Inter 700, 10px, uppercase, +0.06em

app bar     frontend/src/components/layout/Base44Layout.tsx:228
            font-display text-lg font-semibold tracking-tight
            → Fraunces 600, 18px
```

Mobile's tab label gets the size right (10) and the weight number right (700) and then
renders it in the wrong face, un-uppercased and untracked.

## Finding 3 — the Fraunces mapping matches a CSS rule the web's own components override

`buildPaperTheme` gives Fraunces at weight 500 to `displayLarge`, `displayMedium`,
`displaySmall` and `titleLarge`, reasoning — correctly, as far as it goes — from
`index.css`:

```css
h1, .h-display { font-family: var(--font-serif); font-weight: 500; }
h2, .h-title   { font-family: var(--font-serif); font-weight: 500; }
```

But that base rule is overridden at both surfaces that actually render a title:

| surface | class string | resolves to |
|---|---|---|
| `ui/page.tsx` `PageHeader` `<h1>` | `font-sans text-[28px] font-extrabold` | **Inter 800, 28px** — not Fraunces at all |
| `Base44Layout.tsx:228` `<h2>` (mobile app bar) | `font-display text-lg font-semibold` | **Fraunces 600, 18px** |
| `Base44Layout.tsx:264` `<h2>` (desktop app bar) | `font-display text-[22px] font-medium` | Fraunces 500, 22px |

So the two titles a phone user sees on the web are **Inter 800** and **Fraunces 600**.
Mobile's four Fraunces-500 variants match neither.

This also explains the 15 stray `fontWeight: '800'` declarations: someone was matching
`PageHeader`'s `font-extrabold` and had no 800 face to do it with. The intent was right;
the vocabulary didn't exist.

## Finding 4 — letter-spacing is Material's, not the app's

`configureFonts` deliberately moves only `fontFamily`/`fontWeight` and keeps Paper's own
per-variant `letterSpacing`. Those values are MD3's:

| Paper variant | letterSpacing | web counterpart |
|---|---|---|
| `display*`, `headline*`, `titleLarge`, `titleMedium` | 0 | h1 `−0.02em`, h2 `−0.015em`, `.text-display-lg` `−0.025em` |
| `bodyMedium` / `bodySmall` | +0.25 / +0.4 | body: none |
| `labelMedium` / `labelSmall` | +0.5 | nav label `+0.06em` (≈ +0.6px at 10px) |
| `titleSmall` / `labelLarge` | +0.1 | — |

Net: mobile's display and title type is **looser** than the web's (0 against negative
tracking), its body type is **looser** (positive against none), and its label tracking
happens to land close to the web's by coincidence.

Keeping Paper's metrics was a defensible default and is documented as deliberate. It is
still a parity gap, and the display end is the visible one — the web's headings are
deliberately tight (`tracking-tight` appears on all three title surfaces above).

## Finding 5 — the shared typography tokens have zero consumers, and cannot be used as written

`packages/shared/src/tokens/typography.ts` exports `fontFamily`, `fontSize`, `fontWeight`.
Importers across all three packages: **none.** Only `colors`, `spacing`, `radii` and
`ColorRoles` are consumed from the tokens package, and only by mobile.

For `fontFamily` that is structural, not neglect:

```ts
export const fontFamily = { sans: 'Inter', serif: 'Fraunces' } as const;
```

Those are the **CSS** family names. Expo registers `Inter_400Regular` /
`Fraunces_500Medium`. Mobile cannot use these values, which is exactly why `theme.ts`
declares its own `fonts` constant instead. The token as written can only ever serve the
web, and the web doesn't import it either.

`fontWeight` has the same problem in reverse: it maps names to numbers, but on Expo a
weight is a *family name*, not a number.

## Decisions

### Load the weights the app already asks for

Add to `App.tsx`'s `useFonts`:

- `Inter_600SemiBold` — 95 web usages, 6 mobile declarations
- `Inter_700Bold` — 112 web usages, 6 mobile declarations
- `Fraunces_600SemiBold` — the mobile app bar title

**Do not add an 800.** The web's `font-extrabold` (34 usages) is itself unbacked: `index.html`
requests Inter at `wght@300;400;500;600;700`, so nothing serves 800 and the browser is
synthesising or clamping. Matching a synthesised weight with a real 800 face would make
mobile *heavier* than the reference. Mobile maps 800 → `Inter_700Bold` and the web's
`font-extrabold` gets raised separately. See open questions.

Each added face is a bundled font file; `Fraunces_600SemiBold` is the one whose value should
be weighed against its size, since it serves a single surface.

### `fonts` grows to name every face, and stays the only vocabulary

```
fonts.regular   Inter_400Regular
fonts.medium    Inter_500Medium
fonts.semibold  Inter_600SemiBold
fonts.bold      Inter_700Bold
fonts.display   Fraunces_500Medium
fonts.displaySemibold  Fraunces_600SemiBold
```

Then every `fontWeight: '600' | '700' | '800'` in `mobile/src` becomes a `fontFamily:
fonts.*`. Keep the numeric `fontWeight` alongside it — Paper's typescale sets one and
removing it silently changes nothing on iOS but can matter on Android — but the family is
what decides the rendering.

### The typescale mapping follows the components, not the base CSS rule

- `titleLarge` → `fonts.displaySemibold` (Fraunces 600), matching the app bar `<h2>`.
- `display*` keep Fraunces 500 — `Base44Layout.tsx:264` is Fraunces 500 and these are the
  large-display end.
- `headlineMedium` (28px) → `fonts.bold`, matching `PageHeader`'s Inter-at-28px. This is the
  page-title variant and it should be Inter, not Fraunces.
- Everything else keeps Inter at Paper's existing regular/medium split.

`buildPaperThemeFonts.test.ts` encodes the current mapping and its docstring argues for it
from the base CSS rule. That reasoning needs updating, not just the assertions — a test that
says "these four and only these four get Fraunces" is the artefact that will make someone
revert this.

### Navigation text gets explicit families, and the guard learns to see it

Set `fontFamily` on all three navigation text styles, matched to the web:

- tab label → `fonts.bold`, 10px, `textTransform: 'uppercase'`, `letterSpacing: 0.6`
- both `headerTitleStyle` → `fonts.displaySemibold`, 18px

Then extend `rawTextNamesItsFont.test.ts` to cover React Navigation style props, so the next
navigator added is caught. See Task 5.

### Fix the shared typography token or delete it

It has no consumers and one of its three exports is unusable on the client that would want
it. Two honest options, and the spec picks the first:

1. **Make it platform-aware** — keep `fontSize` (genuinely shared, unitless, already
   correct), and replace `fontFamily`/`fontWeight` with a structure that names both the CSS
   family and the Expo registered family per role. Then mobile's `fonts` constant is derived
   from the token instead of duplicating it.
2. **Delete `fontFamily`/`fontWeight`** and let each client own its own font vocabulary,
   keeping only `fontSize` shared.

Option 1, because the point of the package is one source of truth and a per-role table is
the only shape that can serve two font systems. But it is close, and option 2 is not wrong.

## What already matches — verified, not assumed

- **The typescale mapping is complete.** `configureFonts` covers all 15 MD3 variants; none
  falls through to Paper's default face. `buildPaperThemeFonts.test.ts` pins every one of
  them, plus the invariant that fonts don't vary with light/dark. This was expected to be
  partial and isn't.
- **The font pair is right.** Both clients are Fraunces (display) + Inter (body). Mobile
  loads real Google Fonts packages, not lookalikes.
- **Every Paper variant mobile uses lands on a real web size.** `displaySmall` 36 = `4xl`,
  `headlineSmall` 24 = `2xl`, `titleMedium` 16 = `base`, `titleSmall`/`bodyMedium`/
  `labelLarge` 14 = `sm`, `bodySmall`/`labelMedium` 12 = `xs`, `labelSmall` 11 = `eyebrow`.
  `headlineMedium` 28 is off the *named* scale but is exactly `PageHeader`'s `text-[28px]`.
  Ten for ten.
- **Raw `fontSize` literals in mobile are almost all on-scale**: 28 (= `PageHeader`), 24, 16,
  14, 11, 10 all correspond to real web sizes. The one violation is
  `InsightsScreen.tsx:27` `fontSize: 8`, below the `caption: 10` floor.
- **`LoginScreen` and `SignupScreen` do name their fonts** — 6 and 4 `fontFamily`
  declarations respectively. They are the surfaces the guard was written for and they are
  clean.
- **Fonts are gated correctly.** `App.tsx` returns `null` until `useFonts` resolves, so no
  screen paints in the system face and reflows. The comment explaining why the family names
  are hardcoded rather than threaded through `buildPaperTheme` is correct reasoning.

## Open questions for the parent session

1. **The web's `font-extrabold` is unbacked.** `index.html` requests Inter at
   `300;400;500;600;700`; 34 usages ask for 800. The browser is synthesising or clamping to
   700 — which of the two needs a browser to confirm and is deliberately not guessed here.
   Recommendation: mobile maps 800 → `Inter_700Bold` now, and the web either adds `800` to
   the Google Fonts URL or changes those 34 to `font-bold`. Either way that is a web change
   and the web is the reference, so it isn't decided here.
2. **How tight should mobile's headings be?** Matching the web means overriding
   `letterSpacing` on the display/title variants to roughly `−0.02em × fontSize`. That
   contradicts `configureFonts`'s documented "only family and weight move" rule. Paper's
   metrics are Material's, not neutral. Recommendation: override tracking on the four
   display/title variants only, leave body and label alone, and update the docstring so the
   exception is deliberate rather than looking like drift.
3. **Is `Fraunces_600SemiBold` worth its bundle size** for one surface (the app bar title)?
   The alternative is Fraunces 500 there, one step lighter than the web. Recommendation:
   add it — the app bar title is on every screen — but it is a real trade and someone should
   own it.
4. **Should `fontSize: 8` become 10, or should the chart label stay smaller than the
   scale's floor?** Chart axis labels are a genuine exception on the web too (SVG text
   isn't in the type scale). Recommendation: raise to `caption` (10) and, if it doesn't
   fit, reduce the number of ticks rather than the type size.

## Constraints

- **Web is the reference.** Every target traces to `index.html`, `index.css`,
  `tailwind.config.js`, `BottomNavigation.tsx`, `Base44Layout.tsx` or `ui/page.tsx`.
- **Expo Go must keep working.** `@expo-google-fonts/*` are plain asset packages with no
  native module, so added weights do not require a custom dev client — the constraint in
  `mobile/CLAUDE.md` holds.
- **Never break existing functionality.** Adding faces is additive; the risk is in changing
  what a variant renders, which is why Task 4 goes variant by variant.
- Bundle size grows by one font file per added weight. Named, not hidden.
</content>
