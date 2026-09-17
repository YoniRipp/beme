# Plan — Typography Parity

Status: **not started.** This PR ships the spec only.

## Sequencing

- **Independent of #308 (colour) and #312 (radii/elevation).** Nothing here touches
  `buildPaperTheme`'s `colors` block or `roundness`, so the three can proceed in parallel.
  The one shared file is `mobile/src/theme.ts`, which all three edit in different places —
  whichever lands second should expect a trivial merge, not a conflict of intent.
- **Task 1 depends on #308's Task 1**, which adds the missing `npm test` step to the
  `mobile` CI job. Until that lands, `buildPaperThemeFonts.test.ts` and everything added
  here runs only on someone's laptop.
- **Overlaps #306** (shell tabs and names) at exactly one file: `navigation/MainTabs.tsx`.
  #306 changes *which* tabs exist; Task 5 here changes how their labels are *typed*. If
  #306 lands first, Task 5 applies unchanged to whatever tab set it leaves behind. If this
  lands first, #306 inherits the label style. Either order works — but not simultaneously,
  and #306 is the bigger change, so let it go first.

## Task 1 — Load the missing faces

- [ ] `mobile/package.json`: `@expo-google-fonts/inter` and `@expo-google-fonts/fraunces`
      are already dependencies. No new packages — the extra weights ship inside them.
- [ ] `mobile/App.tsx`: add `Inter_600SemiBold`, `Inter_700Bold`, `Fraunces_600SemiBold` to
      `useFonts`.
- [ ] Do **not** add an 800 face. The web's `font-extrabold` is itself unbacked (its Google
      Fonts URL stops at 700), so a real 800 would make mobile heavier than the reference.
      Write that reason into the comment beside the `useFonts` call — it is the kind of
      omission that looks like an oversight.
- [ ] Confirm the app still runs in Expo Go. `@expo-google-fonts/*` are asset-only packages
      with no native module, so it should — but `mobile/CLAUDE.md` makes this a hard
      constraint and it is cheap to check.

## Task 2 — Extend the `fonts` vocabulary

- [ ] `mobile/src/theme.ts`: add `semibold: 'Inter_600SemiBold'`, `bold: 'Inter_700Bold'`,
      `displaySemibold: 'Fraunces_600SemiBold'`.
- [ ] Update the docstring. It currently justifies exactly three faces. The new text should
      keep its (correct and load-bearing) explanation of why these are string literals
      rather than values threaded from `useFonts`, and add the weight→face table.

## Task 3 — Replace the 27 unbacked weight declarations

- [ ] Every `fontWeight: '600' | '700' | '800'` in `mobile/src` gains a `fontFamily`:
      600 → `fonts.semibold`, 700 → `fonts.bold`, 800 → `fonts.bold`.
- [ ] Keep the numeric `fontWeight` alongside. Removing it is a no-op on iOS but Android's
      font matching can use it, and leaving it costs nothing.
- [ ] Files, from the audit: `MetricCard`, `MobileFoodCard`, `MobileGoalCard`,
      `MobileWorkoutCard`, `MobileScreen`, `ProgressRing`, `HomeScreen`, `EnergyScreen`,
      `InsightsScreen`, `SettingsScreen`, `WorkoutFormScreen`, `FoodEntryFormScreen`,
      `GoalFormScreen`, plus the two navigation files in Task 5.
- [ ] Where the style is on a Paper `<Text variant=...>`, check whether the variant already
      carries the right face before adding an override — several of these are fighting the
      typescale rather than extending it, and the right fix is sometimes to change the
      `variant`.

## Task 4 — Re-point the typescale at what the web's components render

- [ ] `titleLarge` → `fonts.displaySemibold` (Fraunces 600), matching
      `Base44Layout.tsx:228`'s app bar `<h2>`.
- [ ] `headlineMedium` → `fonts.bold` (Inter 700) at its existing 28px, matching
      `ui/page.tsx`'s `PageHeader` `<h1>` (`font-sans text-[28px] font-extrabold`, capped at
      700 per Task 1).
- [ ] `displayLarge` / `displayMedium` / `displaySmall` keep Fraunces 500.
- [ ] Everything else unchanged.
- [ ] **Rewrite `buildPaperThemeFonts.test.ts`'s docstring, not just its assertions.** It
      currently argues "those four (and only those four) get Fraunces" from `index.css`'s
      base `h1, h2` rule. That rule is real but both title components override it — the test
      is reasoning from the stylesheet where it should be reasoning from the rendered
      surface. Left as is, it is the artefact that makes someone revert Task 4.
- [ ] Consider overriding `letterSpacing` on the four display/title variants to approximate
      the web's `tracking-tight` (`−0.02em × fontSize`). This contradicts `configureFonts`'s
      documented "only family and weight move" rule, so if it lands, the docstring must say
      the exception is deliberate. Body and label tracking stay on Paper's values.

## Task 5 — Give the navigation text a font, and teach the guard to check

- [ ] `navigation/MainTabs.tsx` `tabBarLabelStyle`: add `fontFamily: fonts.bold`,
      `textTransform: 'uppercase'`, `letterSpacing: 0.6`. Keep `fontSize: 10`. Matches
      `BottomNavigation.tsx:30` (`text-caption font-bold uppercase tracking-[0.06em]`).
- [ ] `navigation/MainTabs.tsx` and `navigation/RootNavigator.tsx` `headerTitleStyle`:
      `fontFamily: fonts.displaySemibold`, `fontSize: 18`. Matches `Base44Layout.tsx:228`.
- [ ] Extend `mobile/src/theme/__tests__/rawTextNamesItsFont.test.ts` to cover React
      Navigation text style props. The guard's current trigger is "file imports `Text` from
      `react-native`", which `MainTabs.tsx` does not, so it is exempt by construction.
      - Detect object literals assigned to `tabBarLabelStyle`, `headerTitleStyle`,
        `tabBarBadgeStyle`, `headerBackTitleStyle` and require a `fontFamily` property.
      - `paletteGuardSupport.ts` already exports the AST helpers; this needs a property-name
        walk, not new machinery.
      - Follow the existing pattern: match on the structural fact (a style object for a text
        prop), not on a list of file paths.
      - Add a fixture-based regression case, as both existing guards do, so the new rule is
        pinned independently of what files exist.
- [ ] Sanity check the guard is real: delete one `fontFamily` and confirm red.

## Task 6 — The one off-scale size

- [ ] `screens/InsightsScreen.tsx:27` `chartLabel: { fontSize: 8 }` is below the shared
      scale's `caption: 10` floor — the only true size violation in `mobile/src`.
- [ ] Raise to 10. If the axis labels then collide, reduce the tick count rather than the
      type size; 8px is unreadable on a phone and fails the spirit of the a11y pass that
      produced `--ink-3`.

## Task 7 — Fix or retire the shared typography token

- [ ] `packages/shared/src/tokens/typography.ts` has **zero** importers, and
      `fontFamily = { sans: 'Inter', serif: 'Fraunces' }` is unusable on Expo, where a face
      is `Inter_400Regular`. That is why it went unused.
- [ ] Restructure as a per-role table naming both vocabularies, e.g. each role carrying its
      CSS family + weight and its Expo registered family, so `mobile/src/theme.ts`'s `fonts`
      is *derived* from the token rather than duplicating it.
- [ ] Keep `fontSize` as is — unitless, correct, and genuinely shared. Add `28` under a name
      (`PageHeader` uses `text-[28px]` and Paper's `headlineMedium` is 28; it is a real size
      in both clients wearing a bracket value on one of them).
- [ ] Add a test that `fonts` in `mobile/src/theme.ts` and the token agree, so the
      derivation can't silently decouple.
- [ ] If the per-role table turns out clumsier than two small per-client constants, **say so
      and delete `fontFamily`/`fontWeight` instead**, keeping only `fontSize` shared. A
      token nobody can import is worse than no token.

## Task 8 — Standards

- [ ] `agent-os/standards/frontend/design-tokens.md` says only "Type pair: **Fraunces**
      (display) + **Inter** (body)". Add the weight vocabulary both clients may use, and the
      rule that on Expo a weight is a *family name*, not a number — the single fact that
      would have prevented all 27 declarations.
- [ ] Note the web's own unbacked `font-extrabold` there too, or in whatever issue comes out
      of open question 1, so it doesn't get re-derived by the next audit.
- [ ] `npm run sync:agents` if `CLAUDE.md` changes; CI's `agent-context` job fails on drift.

## Verification

- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `cd mobile && npm test` — needs #308's Task 1 for CI to see it
- [ ] `npm test --workspace @trackvibe/shared`
- [ ] `cd frontend && npx tsc --noEmit` — must be untouched
- [ ] Grep check: zero `fontWeight: '600'|'700'|'800'` without a `fontFamily` in the same
      style object.
- [ ] **Needs a device or simulator, cannot be confirmed from code**: that the added faces
      actually render (a missing `useFonts` entry fails silently into the system face), that
      the uppercase tab labels still fit six tabs at ~390px, and what iOS currently does with
      `fontWeight: '800'` on a single-face family — synthesise, ignore, or fall back. The
      last one is diagnosis, not a blocker: the mapping is wrong regardless of which it does.
</content>
