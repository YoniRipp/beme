# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/domain-conventions` | Dates are local `YYYY-MM-DD`; weight is kilograms; **voice-first** — a logging capability that is only reachable by form is half-shipped |
| `global/critical-rules` | Rewriting the native client's primary capture screen is a large UI change: analyse, name the problem, then change |
| `global/testing` | The mappers' spread-not-enumerate property is already pinned by tests and must stay pinned once the form can edit those fields |
| `global/tech-stack` | Task 4 may want an audio dependency — read this before adding one, and see the Expo Go constraint below |
| `frontend/data-fetching` | `useExercises`, `useWeight`: `core/api/ → mappers → hook → screen`, keys from `queryKeys`, explicit `staleTime`, `setQueryData` on mutate |
| `frontend/api-client` | `mobile/src/core/api/exercises.ts` and the weight client — no `fetch` from a screen |
| `frontend/components` | The picker is a sheet, not a new primitive; the set row is presentational and the parent owns the values |
| `frontend/mobile-ui` | ≥44px targets on steppers and set ticks; **one voice entry point per viewport**; card anatomy for the picker rows |
| `frontend/design-tokens` | No new colours; `mobile/src/theme/__tests__` has AST guards that fail the build on a raw hex |
| `backend/*` | **Deliberately not listed.** No task in this plan touches the backend; every endpoint already ships |

## Key points carried into the work

- **Voice is the primary input method**, per `global/domain-conventions`. The native client
  having none of it is the largest single gap in this spec, even though the editor bug is
  the most urgent one.
- **Dates are local `YYYY-MM-DD` on the wire.** `toLocalDateString` / `parseLocalDateString`
  from `@trackvibe/shared/domain`, never `toISOString().slice(0, 10)`. This matters twice
  here: the new date picker, and the weight client's `startDate` / `endDate` params.
- **Weight is kilograms.** Body weight is unit-free on the web and stays that way.
- **Shared logic goes to `packages/shared`, never copied.** Three moves are proposed —
  the catalog's name-matching helpers, `getWeightUnit` / `formatDate`, and the voice
  executor. Each follows the path `types/workout.ts`, `lib/dateRanges.ts`,
  `schemas/workout.ts` and `schemas/voice.ts` already took: real implementation in
  `packages/shared`, a one-line re-export left at the old web path so no import site breaks.
- **The client's limits must never be looser than the server's.** `LIMITS` in
  `packages/shared/src/constants/limits.ts` says so explicitly, and the duration bug in
  Task 1 is what happens when a client has no limits at all.
- **Hooks expose actions, not mutation objects**, wrapped in `useCallback`, returning
  `Promise<void>`, with errors as display strings.
- **Per-user data stays bounded** (`CLAUDE.md` rule 6). The weight list endpoint takes a
  date range — use it rather than reading a user's whole history into a screen.
- **Stay in Expo Go.** `mobile/CLAUDE.md`: don't add a native module needing a custom dev
  client without saying so. This is why voice capture is recommended through the audio
  endpoint rather than an on-device recogniser.
- **Never inline a hex colour in `mobile/`.** There are AST guards in
  `mobile/src/theme/__tests__` that fail the build, and they exist because seven files had
  already drifted.

## Standards conflicts worth flagging

- `global/testing` says unit tests **co-locate** and that both sides run **Vitest**.
  `mobile/` runs **Jest** (`jest-expo`) with tests in `__tests__/` folders. The standard
  predates mobile being a shipping client. Follow the package's existing convention and let
  the owner decide which one moves.
- `frontend/components` names `ExerciseList` as a canonical reusable piece, but nothing in
  `frontend/src` imports it. Don't port it on the strength of the standard alone.
