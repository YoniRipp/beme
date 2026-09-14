# Plan — Finish the MD3 Colour Role Map

Status: **not started.** This PR ships the spec only.

Ordering matters: Task 1 first, because every later task adds a test and there is
currently no CI job that would run one.

## Sequencing against the other parity work

**This should land before #302, #303, #304, #305, #306 and #307.** Those six specify
screen-level parity for Home, workouts, food, goals and the tab shell. Every one of them
will add or restyle React Native Paper components, and until the role map is complete each
new `Button mode="contained"`, `SegmentedButtons` or `Card` they introduce arrives already
purple. Doing them first means each spec either absorbs a per-call-site colour override —
the exact workaround `PeriodSelector` already carries, and Task 4 exists to delete — or
ships visibly off-brand and gets re-touched later.

None of their findings are restated here; the dependency runs one way. This spec changes no
screen's structure, only what the theme resolves underneath it.

**#303 is the exception — it has already made one of these visible.** Its weekly goal ring
on `BodyScreen` is the first call site `ProgressRing` has ever had, which turned a dormant
hardcoded `#e5e7eb` into a light-grey hoop on a near-black card. #303 correctly left the
component alone and rewrote the stale allowlist justification instead. Task 1b is that fix,
pulled to the front of this plan; it is independent of the rest of the mapping and can land
on its own.

## Task 1 — Make mobile and shared tests actually run

- [ ] `.github/workflows/ci.yml`, `mobile` job: add a `npm test` step after the typecheck,
      `working-directory: mobile`. The script already exists (`"test": "jest"`).
- [ ] Expect the seven existing suites under `mobile/src/theme/__tests__/` to go green or
      to surface a real failure. **Do not fix a failure by weakening the test** — if the
      frozen-palette guard has drifted red while nobody was running it, that is a finding,
      not noise.
- [ ] Add a `shared` job: `npm test --workspace @trackvibe/shared`. Its
      `"test": "vitest run"` script has no CI caller today, so `tokens/__tests__`,
      `settings/__tests__` and the six `domain/__tests__` suites are all unrun.
- [ ] Note for whoever does this: `agent-os/standards/global/testing.md` says "Vitest both
      sides" and "unit tests co-locate, not in a `__tests__/` folder". Mobile is Jest with
      `__tests__/`. The standard predates mobile coming back and should be widened rather
      than mobile being reorganised — raise it, don't silently diverge.

## Task 1b — `ProgressRing`'s track (do this first of the colour work)

Ranked ahead of the rest of the mapping: every other item in this spec is Paper's default
leaking through, and this is a value we wrote that is now painting wrong on the default
theme. It is also the smallest diff here.

- [ ] `mobile/src/components/shared/ProgressRing.tsx:44` — replace `stroke="#e5e7eb"` with
      the resolved theme value. The component already calls `useThemeContext()`, so
      `colors.muted` is one identifier away; no new plumbing.
- [ ] **Use `colors.muted` (added in Task 2), not `colors.surfaceMuted`.** #303's write-up
      names `surfaceMuted`; that was a reasonable nearest-neighbour guess and it is wrong.
      `surfaceMuted` is `--paper-2`; the web's five ring tracks are all `hsl(var(--muted))`,
      and in dark mode `--paper-2` (`#1b1a18`) against the `colors.surface` card
      (`#191715`) is **1.03:1** — a five-unit difference, i.e. a ring with no visible
      remainder. `--muted` (`#292624`) gives 1.19. Put that number in the commit message so
      nobody re-simplifies it back.
- [ ] If Task 2's `muted` role is deferred, use `colors.border` — 1.27 dark / 1.37 light,
      closer to `--muted` than `surfaceMuted` in both themes. Do **not** ship `surfaceMuted`.
- [ ] Delete the `ProgressRing.tsx` entry from `ALLOWED_HEX_LITERALS` in
      `noFrozenPaletteImports.test.ts`. The guard should go red if the hex comes back.
- [ ] Sanity-check the sibling: `#303` reached for `surfaceMuted` because the role names are
      confusable. Grep for other `surfaceMuted` uses that are really "the muted track/fill"
      rather than "a muted section background" and fix them in the same pass.
- [ ] This is the one item here worth landing ahead of #303's merge if the sequencing allows
      — it is #303's screen that makes it visible.

## Task 2 — Add the three missing colour roles and the alpha helper

- [ ] `packages/shared/src/tokens/colors.ts`: add `scrim`, `shadow` and `muted` to
      `ColorRoles`, `lightColors` and `darkColors`.
      - `scrim`: `--scrim` = `20 14% 8%` → `#171312` light, `0 0% 0%` → `#000000` dark
      - `shadow`: the shadow colour the web composites with — `hsl(28 20% 20%)` →
        `#3d3229` light, `#000000` dark (`.dark`'s `--shadow-*` are all `hsl(0 0% 0% / …)`)
      - `muted`: `--muted` = `32 18% 93%` → `#f0edea` light, `30 7% 15%` → `#292624` dark.
        The web's track/fill role — 5 ring `stroke`s plus `progress.tsx`'s bar.
      - Extend the file's `role -> css custom property` header comment with all three, and
        state explicitly that `muted` (`--muted`) and `surfaceMuted` (`--paper-2`) are
        **different colours**. The names are near-identical and that is what made the wrong
        one look right; the comment is the only place that confusion gets headed off.
- [ ] Add `withAlpha(hex: string, alpha: number): string` to the tokens package, returning
      eight-digit `#RRGGBBAA`. Must be a function: `primary` is accent-resolved at runtime,
      so a precomputed constant would freeze the default accent.
- [ ] Unit-test `withAlpha` for the three input shapes it can receive (`#abc`, `#aabbcc`,
      `#aabbccdd`) and for rounding at the boundaries (0 and 1).

## Task 3 — Map every MD3 role in `buildPaperTheme`

- [ ] `mobile/src/theme.ts`: replace the nine-entry `colors` block with the full
      thirty-three-key map from `shape.md`. Spell every key out — no spread-and-patch, so
      the file reads as a complete statement of intent.
- [ ] `secondary` moves off `palette.food` onto `palette.textMuted`. Leave a comment
      naming `agent-os/standards/frontend/design-tokens.md`'s "terracotta is reserved"
      rule so the change is not reverted as a mistake.
- [ ] `elevation`: `level0: 'transparent'`, `level1`–`level5` all `palette.surface`.
      Comment why — the web's card is `bg-card shadow-card`, a flat surface plus a
      box-shadow, never a depth-tinted background.
- [ ] Rewrite the docstring. It currently states the omission is deliberate; that sentence
      is the reason this bug survived review, and the replacement should say the opposite:
      every role is explicit, and a role added by a future Paper version must be decided,
      not inherited.

## Task 4 — Remove the workarounds the missing roles forced

- [ ] `mobile/src/components/shared/PeriodSelector.tsx`: drop `selectedChip` /
      `selectedText` and the `mode={selected ? 'flat' : 'outlined'}` switch. Paper's
      `Chip selected` now paints the right colours on its own. Verify against the web's
      `bg-primary/10 text-primary` before deleting — if it does not match, the role
      mapping is wrong, not the workaround.
- [ ] Grep for other per-call-site colour overrides on Paper components
      (`textColor=`, `buttonColor=`, `style={{ backgroundColor: colors.…}}` on a Paper
      element) and remove any that exist only to escape a default that is now mapped.
      `ConfirmDialog`'s `textColor={colors.danger}` is **not** one of these — a destructive
      action genuinely differs from the default and should stay.

## Task 5 — The no-inherited-defaults guard

- [ ] New suite `mobile/src/theme/__tests__/everyMd3RoleIsMapped.test.ts`.
- [ ] For both `buildPaperTheme(MD3LightTheme, lightColors)` and
      `buildPaperTheme(MD3DarkTheme, darkColors)`, walk every key of the base theme's
      `colors` (including the six nested `elevation.*`) and assert the built value differs
      from the base value.
- [ ] Allowlist entries must carry a reason string, like `ALLOWED_HEX_LITERALS` in the
      frozen-palette guard does. Only one is expected: `elevation.level0`, which is
      `'transparent'` in both because that is Paper's "no surface" sentinel, not a colour.
- [ ] The failure message must name the role, both values, and where to add the mapping —
      the existing guards' messages are the bar to clear.
- [ ] Iterate the **base theme's** keys, not a hardcoded list, so a role added in a future
      Paper minor fails the build instead of appearing silently in purple.

## Task 5b — Make the frozen-hex allowlist expire on its own

`ProgressRing` is the worked example: its entry was justified by "the component has no
current call sites", that stopped being true when #303 added one, and nothing re-checked it.
The guard stayed green through the exact transition that invalidated its own exemption.

- [ ] In `noFrozenPaletteImports.test.ts`, give `ALLOWED_HEX_LITERALS` entries an optional
      machine-checkable condition rather than only a free-text reason — start with the one
      shape that has already bitten: `unusedComponent: 'ProgressRing'`, asserted by scanning
      `mobile/src` for a JSX usage of that identifier and **failing if any is found**.
- [ ] Failure message should say the exemption expired and why, not that a hex is
      disallowed — the author needs to know the *justification* died, not just the symptom.
- [ ] Keep free-text reasons for entries that genuinely aren't checkable — the categorical
      chart colours in `lib/analytics.ts` are a real permanent exception and shouldn't be
      forced into a condition shape.
- [ ] After Task 1b there should be **no** `unusedComponent` entries left. That is fine and
      is the point: the mechanism exists so the next one expires loudly. Add the fixture
      regression case both existing guards use, so the rule is pinned even with zero live
      entries.
- [ ] Worth a line in the guard's docblock: an allowlist entry is a claim about the
      codebase, and a claim nothing re-evaluates is a comment, not a guard.

## Task 6 — Contrast on the pairs Paper renders

- [ ] Extend `mobile/src/theme/__tests__/useAppTheme.test.tsx`'s existing WCAG block to
      assert over `paperTheme.colors`, not just `colors`. Reuse its local
      `contrastRatio` — it is deliberately dependency-free and should stay that way.
- [ ] Pairs: `primary`/`onPrimary`, `secondaryContainer`/`onSecondaryContainer`,
      `surface`/`onSurface`, `background`/`onBackground`, `error`/`onError`,
      `primaryContainer`/`onPrimaryContainer`. All four accents, both schemes — the
      existing `it.each` already generates that matrix.
- [ ] `contrastRatio` parses six-digit hex with `slice`. The container roles are
      eight-digit after Task 2, so either composite the alpha over the known surface first
      (correct — that is what the eye sees) or teach the helper about the alpha channel.
      **Composite.** A ratio computed against a translucent colour is not a real ratio.
- [ ] Sanity check the test is real: `#381E72` on `#b5ef57` is 3.06:1, so a deliberate
      revert of the `onPrimary` mapping must turn this red.

## Task 7 — Token drift test

- [ ] New suite in `packages/shared/src/tokens/__tests__/`, e.g. `webPaletteParity.test.ts`.
- [ ] Read `frontend/src/index.css` from disk, parse the `:root` and `.dark` blocks, follow
      one level of `var(--x)` indirection (`--background: var(--paper)`,
      `--primary-foreground: var(--paper)` both need it), convert `H S% L%` to hex, and
      compare against `lightColors` / `darkColors` role by role.
- [ ] Drive it from the `role -> css custom property` table already written in that file's
      header comment, so the comment becomes executable instead of aspirational.
- [ ] `workoutSoft` and `sleepSoft` have no web counterpart — that is documented in the
      file and the test should skip them **by name, with the reason inline**, not by
      silently ignoring unmatched roles.
- [ ] Path resolution: the test reaches out of `packages/shared` into `frontend/`. That is
      acceptable for a parity test but should be a single named constant at the top with a
      comment, so it is obvious why a package is reading a sibling's source.
- [ ] Verify the test can fail: change one HSL lightness in a scratch copy and confirm red.

## Task 8 — Write the convention down

- [ ] `agent-os/standards/frontend/design-tokens.md` is web-only today (Tailwind classes,
      CSS variables). Either widen it or add `agent-os/standards/mobile/design-tokens.md`
      covering: never inherit an MD3 role; the shared tokens are the source of truth; a new
      Paper version's new role is a decision.
- [ ] If a new folder: `agent-os/standards/` currently has exactly `backend/`, `frontend/`,
      `global/`, and root `CLAUDE.md` says "Put new ones in those." Adding `mobile/` means
      updating that sentence and the standards table in the same commit, then running
      `/agent-os:index-standards` and `npm run sync:agents`.
- [ ] Add the row to `CLAUDE.md`'s standards table: *read it when — touching
      `buildPaperTheme` or any colour on either client.*

## Verification

- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `cd mobile && npm test` — all suites, including the two new ones
- [ ] `npm test --workspace @trackvibe/shared`
- [ ] `cd frontend && npx tsc --noEmit` and `npm run test -- --run` — nothing here should
      change, and if it does, something reached across the client boundary that shouldn't.
- [ ] Visual confirmation on a simulator is **required before merge** and cannot be done
      from code: the four screens with SegmentedButtons, a `ConfirmDialog` on Energy, the
      food-search results card in `FoodEntryFormScreen`, and the `Divider` in
      `WorkoutFormScreen` — in dark mode with the default green accent, then again in
      light mode.
- [ ] `BodyScreen`'s weekly goal ring specifically, in **dark** mode, at a partial value
      (say 2 of 5) so the unfilled arc is on screen. The whole question is whether the
      track is visible against the card without shouting; 1.19:1 is a deliberately quiet
      contrast and this is the one number in the spec that a screenshot can overrule.
</content>
