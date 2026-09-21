# Plan — Workouts Parity: Recording Training

Status: not started. Audit only — no application code was changed for this spec.

Phased deliberately, cheapest correctness first: Task 1 stops the client losing saves,
Task 2 gives it the catalog, Task 3 gives it per-set logging, Task 4 gives it voice, Task 5
gives it weight. Each is independently shippable.

**Every task is `mobile/` + `packages/shared/` only. No backend work anywhere in this
plan** — each task below names the endpoint it consumes and every one of them already
ships.

## Task 1 — Stop losing saves (hours, not days)

*Endpoint: `POST/PATCH /api/workouts` — exists. UI task.*

- [ ] Move `WorkoutFormScreen` onto `react-hook-form` + `zodResolver(workoutFormSchema)`
      from `@trackvibe/shared/schemas`. All three packages are already in
      `mobile/package.json` and unused. `FoodEntryFormScreen` has the same problem — worth
      coordinating with whoever owns Energy, but do not widen this task to cover it.
- [ ] Field-level errors under each input. Duration is the one that matters:
      `MIN_WORKOUT_DURATION` 1 to `MAX_WORKOUT_DURATION` 480, matching the web.
- [ ] Surface the server's message on failure. `request` throws the shared `ApiError`
      carrying the API's `{ error: { code, message } }`; the current `catch` replaces it
      with a fixed string. A 400 must name the offending field.
- [ ] Make the date editable — a native date picker, not a text field. Today the value is
      `existing?.date || new Date()` behind `editable={false}`, so no workout can be
      backfilled or rescheduled from the phone.
- [ ] Weight label from `settings.units` via the shared `getWeightUnit` (moved to
      `packages/shared` in the week-summary spec's Task 4 — take a dependency on it or move
      it here, whichever lands first).
- [ ] Regression tests: a workout with a blank duration is rejected **in the form**, with a
      message, and never reaches the network; a chosen date round-trips as local
      `YYYY-MM-DD` (`toLocalDateString`, never `toISOString`).

## Task 2 — The exercise catalog and the picker

*Endpoints: `GET /api/exercises`, `GET /api/exercises/:id`, `POST /api/exercises` — all
exist. UI + client-layer task, no API work.*

- [ ] `mobile/src/core/api/exercises.ts` — `list()` with `EXERCISE_CATALOG_LIMIT` (already
      exported from `@trackvibe/shared/constants`), `get(id)`, `add(body)`. Mirror
      `frontend/src/core/api/exercises.ts` exactly; the response is a bare array, not
      paginated.
- [ ] `apiExerciseToCatalogExercise` into `mobile/src/features/body/mappers.ts`, beside the
      workout mappers, nulls folded to `undefined` as on the web.
- [ ] Move the catalog's name-matching helpers — `normalizeName`, `singularize`,
      `looseNameKey` and the exact/loose index build — from
      `frontend/src/hooks/useExercises.ts` into `packages/shared/src/domain/`. They are
      subtle (the `-es`/`-ss` plural rules are commented at length) and must not exist
      twice. `EQUIPMENT_FILTERS` / `MUSCLE_FILTERS` and their label maps move with them.
- [ ] `mobile/src/hooks/useExercises.ts` — same surface as the web's: `exercises`,
      `isLoading`, `error` as a display string, `reload`, `getExercise`, `getImageUrl`,
      `filterExercises`, `createExercise`, `isCreating`. `staleTime: 10 * 60 * 1000`, and
      `queryKeys.exercises` added to `mobile/src/lib/queryKeys.ts`.
- [ ] `createExercise` writes the cache with `setQueryData` and re-sorts by name — never
      invalidate, or the picker blanks ~900 rows to show one.
- [ ] `ExercisePickerSheet` as a native bottom sheet: search field, the two facet rows,
      paged rendering (the web pages 40 at a time on scroll — on native use a `FlatList`
      with `windowSize`, which is the idiomatic equivalent, not a port of the scroll
      handler), a thumbnail per row, and a distinct error state with retry so a failed
      catalog fetch never reads as "your exercise doesn't exist".
- [ ] The create-custom-exercise form inside the sheet: name plus the closed muscle and
      equipment vocabularies from `createCustomExerciseSchema` (2–80 chars,
      `CATALOG_MUSCLE_GROUPS`, `CATALOG_EQUIPMENT`), copy saying the exercise is shared with
      everyone, and immediate selection on create. A duplicate name resolves to the existing
      catalog row and is not an error — the server already does this.
- [ ] Wire the picker into the exercise rows of `WorkoutFormScreen`, replacing the free-text
      name field. Keep typing possible: the web keeps `ExerciseNameInput`'s inline
      autocomplete alongside the sheet.
- [ ] Exercise thumbnails on the form rows and on `MobileWorkoutCard`, resolved through
      `getImageUrl`, with the icon fallback when the name does not resolve — the reason the
      loose-name matcher exists is that dictated and hand-typed names rarely match the
      catalog spelling.

## Task 3 — Per-set logging

*Endpoint: `PATCH /api/workouts/:id` — exists; `repsPerSet` / `weightPerSet` /
`completedPerSet` are already in `exerciseSchema` and already round-trip through Expo's
mappers. Pure UI task.*

- [ ] A `SetRow` equivalent: set number, weight stepper, reps stepper, both also directly
      typable, an optional completion tick and an optional remove control. Presentational —
      the parent owns the values, as on the web.
- [ ] Port `normalizeExerciseForLogging` and `finalizeExercise` verbatim, including the
      legacy fallback that ticks every set of a workout that was marked complete before
      per-set data existed.
- [ ] Debounced persist (the web uses 700ms) with a flush on unmount, and re-seed only when
      a different workout id opens — the web's comment explains that seeding on object
      identity puts logged sets back to how they were when the cache echoes.
- [ ] Derive the workout's `completed` from per-set progress, as the web does
      (`doneSets === totalSets`).
- [ ] `MAX_SETS` 20 and the `LIMITS` clamps on weight and reps.
- [ ] Rest timer: port `useRestTimer`'s wall-clock deadline logic, 90s default, auto-start
      on completing a set, stop on un-ticking. Haptics via Expo's own API. See `shape.md`
      open question 2 before reaching for local notifications.
- [ ] "Last time" hint per exercise, built from the workouts already in the React Query
      cache — no extra request.
- [ ] Per-exercise actions: replace (opens the picker, keeps the logged sets), add/edit
      note, move up, move down, remove.
- [ ] Keep the spread-not-enumerate property of `mergeExerciseEdits` and
      `apiExerciseToExercise`, and keep their tests passing. Now that the form edits per-set
      arrays, add a test that editing set 2 of 3 leaves sets 1 and 3 alone.

## Task 4 — Voice workout logging

*Endpoints: `POST /api/voice/understand` (transcript **or** base64 audio),
`GET /api/jobs/:id` for the async audio path, `POST /api/voice/transcribe` — all exist. No
API work. Blocked on two open questions (`shape.md` 5 and 6) before the shell is built.*

- [ ] **Decide capture first** (`shape.md` decisions). Recommended: record with an
      Expo-managed audio API, send base64 + `mimeType` to `POST /api/voice/understand`, poll
      `/api/jobs/:id`. No custom dev client, so the app stays in Expo Go.
- [ ] Move `frontend/src/lib/voiceActionExecutor.ts` to `packages/shared/src/domain/`.
      It is pure logic over an injected `VoiceExecutorContext` of hook actions — exactly the
      shape that ports — and the action schemas it validates against are already shared in
      `packages/shared/src/schemas/voice.ts`. The web re-exports from its old path, as
      `frontend/src/schemas/voice.ts` and `types/workout.ts` already do.
- [ ] Keep the workout handlers' behaviour intact through the move, including
      `findWorkoutByTitle` + `mergeExerciseOverrides` — "log my push day" with no exercises
      named reuses the most recent workout of that title as a template. Pin it with tests in
      `packages/shared` before moving, if it is not already covered.
- [ ] `mobile/src/hooks/useVoiceActions.ts` — build the context from mobile's `useWorkouts`
      (and `useEnergy` / `useGoals`, which mobile also has), mirroring
      `frontend/src/hooks/useVoiceActions.ts`.
- [ ] Mic UI: **do not invent a placement.** Take it from the tab work (#306) and do not add
      a second entry point — `frontend/mobile-ui` is explicit that there is one per viewport.
      Coordinate with the food agent, who needs the same shell.
- [ ] A real Pro-gated state rather than an opaque 403 (`shape.md` open question 5). This is
      the piece most likely to make Task 4 bigger than it looks.
- [ ] Microphone permission copy, and a graceful denial path.

## Task 5 — Weight tracking

*Endpoints: `GET/POST/PATCH/DELETE /api/weight-entries` — all exist and are unused by the
native client. Pure client work.*

- [ ] `mobile/src/core/api/health.ts` (or `weight.ts`) mirroring the web's `weightApi`,
      including the `startDate` / `endDate` query params — the list endpoint takes a date
      range and the mobile client should use it rather than pulling the whole history, per
      `CLAUDE.md` rule 6.
- [ ] `queryKeys.weightEntries` in `mobile/src/lib/queryKeys.ts`.
- [ ] `mobile/src/hooks/useWeight.ts` with the same surface as the web's: `weightEntries`,
      `weightLoading`, `weightError` as a display string, `addWeight`, `deleteWeight`,
      `latestWeight`. `staleTime: 2 * 60 * 1000`, `setQueryData` on mutate, and the same
      same-date replacement the web does on add.
- [ ] Kilograms in the UI, matching the web (`shape.md` decisions) — do not reach for
      `settings.units` here.
- [ ] **Stop at the hook.** The card belongs to Home (#302 / #307); hand the hook over
      rather than placing a second weight widget.

## Task 6 — Not in scope, recorded so it is not lost

- Starter templates and save-your-own. The web ships `STARTER_TEMPLATES` and persists user
  templates in `localStorage`. Needs an AsyncStorage equivalent and a decision about syncing
  (`shape.md` open question 4).
- The image lightbox.
- The weight chart on Insights.

## Verification

- [ ] `mobile: npx tsc --noEmit`, `mobile: npm test`
- [ ] `frontend: npx tsc --noEmit` and `npx vitest run` — the shared moves in Tasks 2 and 4
      touch the web's `useExercises` and its voice executor, which is the riskiest part of
      this plan for the shipping client
- [ ] `packages/shared: npx tsc --noEmit` and its tests
- [ ] `backend: npx tsc --noEmit` — expected untouched; run it to prove it
- [ ] Manual: create a workout with the duration field untouched (must fail in the form, not
      at the server); create one dated yesterday; log 3 sets at different weights and confirm
      the web shows all three; add a movement not in the catalog and confirm it appears for a
      second account on the web. **Needs a device or simulator — cannot be confirmed from
      code.**

## Deliberately not done

- **No API changes.** Every capability in this plan is already served by a shipping
  endpoint.
- **Expo's mappers are not aligned down to the web's.** Open question 1 — the web's
  `length === sets` guard deletes data on read and Expo's spread does not.
- **No second mic, no second weight card.** Both are cross-cutting; see the constraints.
- **No palette work.** Design-system agent.
