# Plan — Radii, Elevation and the Missing Primitive Layer

Status: **not started.** This PR ships the spec only.

## Sequencing

- **After `2026-09-14-1110-parity-md3-color-roles` (#308).** The primitives in Task 3 wrap
  Paper components and pin their surface colours; building them against a theme that still
  resolves `elevation.level1` to purple means writing colour overrides into the primitives
  and deleting them a week later. #308 also fixes the CI gap that Task 6's guard depends on.
- **Before, or alongside, #302–#307.** Those six specify screen-level parity for Home,
  workouts, food, goals and the shell. Each will touch at least one of the four card
  components that Task 4 collapses into a single primitive. Landing this first means they
  edit one file instead of four; landing it after means Task 4 has to re-merge whatever they
  changed. If the sequencing can't be held, Task 3 (add the primitives) is the part worth
  rushing — Task 4 (adopt them) can trail.

## Task 1 — Complete the radius scale

- [ ] `packages/shared/src/tokens/spacing.ts`: add `xxl: 22` to `radii`.
- [ ] Extend the comment: it already explains that `xl` once fell through to Tailwind's
      default and came out smaller than `lg` (commit `1f7ba25`). Add why `2xl` is being
      added now — `mobile-ui.md` names `rounded-2xl` as *the* card radius and the web uses
      it 33 times — and why `3xl` (30) is deliberately **not** added: zero usages on the
      web today, and an unused scale step is a step that drifts.
- [ ] `packages/shared/src/tokens/__tests__/colors.test.ts` already asserts the radius
      scale is ascending. Add `radii.xxl` to that array so the new step is covered by the
      existing ordering check.

## Task 2 — Make the elevation token usable by React Native

- [ ] `packages/shared/src/tokens/spacing.ts`: the current
      `{ offsetY, blur, opacity }` shape cannot be handed to a React Native style. Add the
      two missing pieces:
      - a shadow **colour** per scheme — the web composites `hsl(28 20% 20%)` (`#3d3229`)
        in light and `hsl(0 0% 0%)` in dark. If `scrim`/`shadow` land in `ColorRoles` via
        #308's Task 2, read from there rather than adding a third home for the same value.
      - an Android `elevation` integer per step. Android has no offset/blur/opacity model,
        so this is a judgement call per step, not a derivation — write the reasoning down.
- [ ] Add a `shadowStyle(step, shadowColor)` helper returning
      `{ shadowColor, shadowOffset, shadowOpacity, shadowRadius, elevation }`. RN's
      `shadowRadius` is not CSS `blur`; the conventional mapping is `blur / 2`. Put that
      relationship in the comment — it is the kind of thing that gets "corrected" back.
- [ ] Note in the comment that the token keeps only the outer of each CSS shadow's two
      layers (it already says so) and that RN cannot express two layers on one view, so
      this is a deliberate approximation rather than an oversight.

## Task 3 — Add `mobile/src/components/ui/`

Mirror `frontend/src/components/ui/` by name so `components.md` reads across both clients.

- [ ] `Card` — wraps Paper `Card`, pinning `borderRadius: radii.xxl` (22),
      `borderWidth: 1`, `borderColor: colors.border`, `backgroundColor: colors.surface`,
      and `shadowStyle('sm')`. Matches `frontend/src/components/ui/card.tsx`'s
      `rounded-2xl border border-border bg-card shadow-card`.
      Must pass `mode="contained"` or set an explicit background — the default `elevated`
      mode is the one that reaches `elevation.level1`.
- [ ] `Button` — wraps Paper `Button`, pinning `borderRadius: radii.md` (12) to match
      `button.tsx`'s `rounded-md`, overriding Paper's `5 × roundness`. Cover the three
      variants in use: `contained`, `contained-tonal`, `outlined`.
- [ ] `IconButton` — wraps Paper `IconButton` with a container of at least 44px. Paper
      computes `size + 2 * PADDING` with `PADDING = 8`, so `size={18}` gives 34. Either pass
      `containerSize`/an explicit style, or hold `size` at 18 for the glyph and add padding.
      **Keep the glyph at 18** — the parity issue is the hit area, not the icon.
- [ ] Do **not** add a `Screen`/`Page` primitive in this task. `components/shared/MobileScreen.tsx`
      already exists and moving it is churn that hides the diff that matters.
- [ ] Each primitive gets a docstring naming the web file it mirrors and the exact class
      string it is matching, the way the shared tokens name their CSS source.

## Task 4 — Adopt the primitives

One component per commit, so a visual regression is bisectable.

- [ ] `components/shared/MetricCard.tsx` — drop the local `card` style, use `ui/Card`.
- [ ] `components/shared/MobileFoodCard.tsx` — same.
- [ ] `components/shared/MobileGoalCard.tsx` — same.
- [ ] `components/shared/MobileWorkoutCard.tsx` — same.
- [ ] Screens with inline `<Card mode="contained">` (`HomeScreen`, `EnergyScreen`,
      `SettingsScreen`, `InsightsScreen`, `FoodEntryFormScreen`) move to `ui/Card`.
      `FoodEntryFormScreen.tsx:230` is the one with **no** `mode` — it is currently the
      only card reaching `elevation.level1`, so it changes appearance most.
- [ ] Paper `Button` call sites move to `ui/Button`; the 8 `IconButton size={18}` sites move
      to `ui/IconButton`.
- [ ] `components/shared/SearchBar.tsx` keeps `borderRadius: radius.md` — it is already
      correct and `Searchbar` is not worth a primitive for one call site. Leave a comment
      saying the value is deliberate and matches `input.tsx`.

## Task 5 — Document that `roundness` is a fallback

- [ ] `mobile/src/theme.ts`: extend `buildPaperTheme`'s docstring with the multiplier table
      from `shape.md` and state plainly that no single `roundness` satisfies the web's radii,
      so components that matter override it via `components/ui/`.
- [ ] Keep `roundness: radius.md`. Lowering it to make `Button` right makes `Card` and
      `Dialog` worse. The comment exists to stop exactly that change.

## Task 6 — Spacing and radius literal guard

Lands **last**, after Task 4, or it fails on code that hasn't migrated yet.

- [ ] New suite `mobile/src/theme/__tests__/spacingUsesTheScale.test.ts`, built on the
      existing `paletteGuardSupport.ts` helpers — `collectSourceFiles` and
      `parseSourceFile` are already exported and this needs no new machinery.
- [ ] Flag numeric literals assigned to spacing keys (`padding*`, `margin*`, `gap`,
      `rowGap`, `columnGap`) and to `borderRadius`, where the value is not in the scale.
- [ ] Follow `collectHexColorLiterals`'s design note: match on the **value shape and key
      role**, not an allowlist of key names, so `paddingStart`/`insetBlock`-style additions
      don't slip through.
- [ ] Allowlist, per (file, value), with a reason — the pattern
      `ALLOWED_HEX_LITERALS` already uses:
      - `InsightsScreen.tsx` `borderRadius: 5` — half of a 10×10 legend dot; RN's only way
        to write `rounded-full`. **Not** a scale violation.
      - anything else surviving Task 4, each with a written reason rather than a blanket skip.
- [ ] The error message must name the file, line, value and nearest scale step, and point at
      `spacing`/`radii` from `@trackvibe/shared/tokens`.
- [ ] Consider whether `borderRadius: <n>` where `n === width / 2` should be exempt
      structurally rather than by allowlist — it is the idiomatic circle. Cheap to detect
      when both are literals in the same object; skip it if the AST work outgrows the value.

## Task 7 — Standards

- [ ] `agent-os/standards/frontend/components.md`: widen "Reach for `components/ui/` first"
      to name both clients. It is currently written in terms of `<div>` and shadcn, so it
      reads as web-only, which is part of why mobile grew four cards and no `Card`.
- [ ] `agent-os/standards/frontend/mobile-ui.md` opens "This is a mobile app that runs in a
      browser." That has been false since 2026-09-12. Correct it, and note that
      `rounded-2xl`/`shadow-card`/44px apply to the Expo client too — the file's rules are
      already right, only its framing is stale.
- [ ] `agent-os/standards/frontend/design-tokens.md`: add the radius `xxl` step and a line
      that Paper's `roundness` is not the app's radius.
- [ ] Run `npm run sync:agents` if any change lands in `CLAUDE.md`; CI has an
      `agent-context` job that fails when `AGENTS.md` is out of sync.

## Verification

- [ ] `cd mobile && npx tsc --noEmit`
- [ ] `cd mobile && npm test` — requires #308's Task 1, which adds the missing CI step
- [ ] `npm test --workspace @trackvibe/shared`
- [ ] `cd frontend && npx tsc --noEmit` — should be untouched; if it isn't, something
      crossed the client boundary
- [ ] Grep checks that are cheap and catch a half-done migration:
      `borderRadius: radius.lg` should return zero card hits; `elevation` should have real
      importers for the first time.
- [ ] **Needs a simulator, cannot be confirmed from code**: that 22px + shadow reads right
      at ~390px next to the web, that the 44px icon-button containers don't break the
      layouts they sit in (`MobileWorkoutCard`'s row is the tightest), and that shadows
      render acceptably on Android's `elevation` model, which ignores offset and colour.
</content>
