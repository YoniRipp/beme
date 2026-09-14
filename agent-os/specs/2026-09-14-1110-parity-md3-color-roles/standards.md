# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/design-tokens` | The whole spec. It is the source of truth for the palette, and its "terracotta is reserved for food/energy" rule is what removes `secondary → food` |
| `frontend/components` | "Reach for `components/ui/` first" is the web's version of "let the Paper theme paint it" — `PeriodSelector`'s hand-rolled selected chip is the mobile equivalent of a styled `<div>` that duplicates `card.tsx` |
| `frontend/mobile-ui` | Names the card treatment (`rounded-2xl`, `shadow-card`) that `elevation.*` mapping to `surface` restores |
| `global/testing` | Three new suites, plus the discovery that mobile's suites and `packages/shared`'s suites never run in CI. Also the one place the standard is now wrong (Jest vs Vitest, `__tests__/` vs co-located) |
| `global/critical-rules` | Every screen in the app changes colour. That is a large UI change: analyse first, name the problem, then change |
| `global/tech-stack` | No new dependency. `withAlpha` is ~10 lines in the tokens package rather than a colour library — Paper already bundles `color`, but reaching into a transitive dep is not a dependency decision anyone made |

## Key points carried into the work

- **New colours are tokens first.** `scrim` and `shadow` go into
  `packages/shared/src/tokens/colors.ts` before anything references them. A one-off colour
  in a component is a bug — and an unmapped MD3 role is a one-off colour that somebody
  else chose.
- **Never inline a hex colour** (`mobile/CLAUDE.md`). The AST guards enforce this and must
  stay green; the new mappings all read from `palette.*`, so none of them trip it. The one
  live violation, `ProgressRing`'s `#e5e7eb` track, comes off the allowlist in Task 1b
  rather than being re-justified.
- **An allowlist entry is a claim about the codebase, not a note.** `ProgressRing`'s
  exemption was justified by "no current call sites", which quietly stopped being true. A
  claim nothing re-evaluates is a comment; Task 5b makes the checkable ones checked.
- **Pick the role the web actually spends, not the nearest name.** `surfaceMuted`
  (`--paper-2`) and `muted` (`--muted`) read as synonyms and are not: at 1.03:1 on a dark
  card the first is invisible. Trace the web call site before choosing a role.
- **The web is the reference.** Every target value traces to `frontend/src/index.css` or a
  `frontend/src/components/ui/` primitive. Where the web has no counterpart
  (`workoutSoft`, `sleepSoft`, MD3's `tertiary` family) that is stated rather than papered
  over with an invented colour.
- **Test what is resolved, not what was intended.** `useAppTheme.test.tsx`'s docblock
  already argues this — a `.toBeDefined()` on `primaryForeground` would have passed
  throughout the bug it was written for. The same reasoning is why the new guard compares
  the built theme against Paper's base rather than against a hardcoded expected map.
- **A guard in a suite CI does not run is not a guard.** The two AST guards exist "because
  seven files had drifted"; the `mobile` CI job runs `tsc --noEmit` and nothing else. Task 1
  is first for that reason.
- **Don't change API shapes.** Nothing here touches the API. The Expo app is now a real
  consumer of the same endpoints as the web client and the MCP server.
