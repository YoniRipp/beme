# Workouts Parity — Recording Training: The Editor, the Picker, Voice and Weight

## Scope

Everything about **capturing** training on the native client, as opposed to looking at it.
The list surface — sections, filters, the weekly ring — is the companion spec
(`2026-09-14-1140-parity-workouts-week-summary`, PR #303). This one covers:

1. The add/edit workout flow — `frontend/src/components/body/WorkoutModal.tsx`
   (1,450 lines, two modes) against `mobile/src/screens/WorkoutFormScreen.tsx`
   (240 lines, one form).
2. The exercise picker and custom exercises — `ExercisePickerSheet.tsx`.
3. Voice workout logging, which `CLAUDE.md` calls the primary input method.
4. Weight tracking, which sits beside training on the web.

**The web is the reference.** Three places where Expo's approach is arguably better are
recorded as open questions rather than decided here.

## The headline answer

**No — a user cannot edit sets, reps and weight per exercise on Expo today, only per
exercise as a whole.** `WorkoutFormScreen` gives each exercise one `Sets`, one `Reps` and
one `Weight (kg)` box. There is no set 1 / set 2 / set 3, no way to record 100kg × 5 then
90kg × 8, and no way to tick a set off as it is finished. The wire fields for all of that —
`repsPerSet`, `weightPerSet`, `completedPerSet` — are accepted by the API, are read and
written correctly by Expo's mappers, and are simply never shown to the user.

That is the difference between a cosmetic gap and unusable strength tracking. A user who
logs a session on the web and opens it on the phone sees "3 sets × 10 reps · 60kg" for what
was actually 60/60/65 across three sets; a user who edits that workout on the phone keeps
the hidden data (the mappers are careful) but can never correct it.

## Start here: Expo cannot save a new workout unless the user types a duration

`WorkoutFormScreen` initialises `duration` to `''` for a new workout and sends:

```ts
durationMinutes: parseInt(duration) || 0,
```

`createWorkoutSchema` in `backend/src/schemas/routeSchemas.ts` is
`z.number().int().min(1).max(1440)`. Zero fails. The POST comes back 400, and the screen's
`catch` shows a fixed `Failed to save workout` — the server's field-level message is
discarded, so nothing points at the duration field.

There is no client-side validation to catch it first: the screen's only check is "at least
one exercise has a name". The shared `workoutFormSchema` — which does validate duration
against `LIMITS.MIN_WORKOUT_DURATION` / `MAX_WORKOUT_DURATION` and whose header comment says
it lives in `packages/shared` "so both clients validate identically" — is not imported
anywhere in `mobile/src`. Neither are `react-hook-form`, `@hookform/resolvers` or `zod`,
all three of which are already in `mobile/package.json`.

So the default path through the native client's primary create flow fails, and says nothing
useful when it does.

## Capability comparison

| Capability | Web | Expo | Backend ready? |
|---|---|---|---|
| Create / edit / delete a workout | yes | yes | yes |
| Title, type, duration, notes | yes | yes | yes |
| **Set the date** | `<input type="date">` | `editable={false}` — pinned to today for new, unchangeable for existing | yes, `date` on POST/PATCH |
| Exercises: name, sets, reps, weight | yes | yes | yes |
| **Per-set reps / weight** | steppers + typed input per set, `MAX_SETS` 20 | not editable; carried through untouched by `mergeExerciseEdits` | yes, `repsPerSet` / `weightPerSet` on `exerciseSchema` |
| **Tick a set complete** | yes, drives the workout's `completed` flag | no | yes, `completedPerSet` |
| **Exercise picker** (~900-row catalog, search, equipment + muscle facets, photos, infinite scroll) | `ExercisePickerSheet.tsx` | none — a free-text field | yes, `GET /api/exercises` |
| **Add a custom exercise** | inline form in the picker → shared catalog | none | yes, `POST /api/exercises` |
| Inline name autocomplete against the catalog | `ExerciseNameInput`, 8 suggestions, arrow-key nav | none | yes |
| Exercise photos / lightbox | yes | none (a dumbbell glyph) | yes, `imageUrl` on the catalog |
| **"Last time" hint** (previous performance of the same movement) | yes, from the workout history already in cache | none | n/a — client-side |
| **Rest timer** | auto-starts on completing a set, 90s default, wall-clock driven, haptic | none | n/a — client-side |
| Reorder / replace / remove an exercise, per-exercise notes | per-exercise dropdown menu | remove only | yes |
| Starter templates + save-your-own | `STARTER_TEMPLATES` + localStorage | none | n/a — client-side |
| Validation | `zodResolver(workoutFormSchema)` from `@trackvibe/shared/schemas` | one toast, "Add at least one exercise" | n/a |
| Weight unit | `getWeightUnit(settings.units)` | hardcoded `Weight (kg)` | n/a |
| **Log a workout by voice** | centre-mic → `VoiceAgentPanel` → `add_workout` | no mic, no voice code at all | yes, `POST /api/voice/understand` |
| **Edit / delete a workout by voice** | `edit_workout`, `delete_workout` | no | yes, same endpoint |
| **Log body weight** | `WeightLogModal` on Home | no weight code at all | yes, `POST /api/weight-entries` |
| **See a weight trend** | `WeightProgress` on Home, chart on Insights | no | yes, `GET /api/weight-entries` |

Every "no" in that table is served by an endpoint that already exists. **There is no new
API work anywhere in this spec** — the gap is entirely client-side. What varies is size:
the form work is hours, the picker is days, the logger is the biggest single piece, and
voice needs a capture decision (below) before any of it is costed.

## The exercise catalog is shared, so this is a data problem too

Per `agent-os/specs/2026-08-15-1200-single-role-nav-and-custom-exercises/`, a custom
exercise is written to the **shared** `exercises` table — "everyone gets it, not just the
author" — with `is_custom` marking it and a duplicate name resolving to the existing row.

That decision cuts the other way while only one client can create them. A user who adds
"Zercher Squat" on the web sees it in the web picker forever; on the phone the same
movement has to be retyped by hand every session, drifts in spelling, resolves to no
catalog photo, and never matches the web's entry. Expo cannot even *browse* the catalog —
`mobile/src/core/api/` has no `exercises.ts` and `mobile/src/lib/queryKeys.ts` has no
`exercises` key — so the two clients today present different catalogues of the same shared
table: ~900 rows with photos on one, and whatever the user can remember to type on the
other.

## Voice: the gap is total, and the cost is a capture decision

`CLAUDE.md` calls voice the primary input method. Expo has none of it — no mic, no
recorder, no executor. `grep -rn "voice\|speech\|mic" mobile/src` returns nothing.

Half the machinery is already shared and would work unchanged:

- `packages/shared/src/schemas/voice.ts` already defines and validates the
  `add_workout` / `edit_workout` / `delete_workout` actions, with the same
  "so both clients validate identically" note as the workout form schema.
- `POST /api/voice/understand` takes either a **transcript** (processed synchronously) or
  **base64 audio + mimeType** (enqueued, polled at `/api/jobs/:id`).
  `POST /api/voice/transcribe` is plain speech-to-text.

Two halves are web-only:

- `frontend/src/lib/voiceActionExecutor.ts` — the handlers that turn an action into
  `addWorkout` / `updateWorkout` / `deleteWorkout`, including the nice touch where
  "log my push day" with no exercises reuses the most recent workout of that title as a
  template (`findWorkoutByTitle` + `mergeExerciseOverrides`).
- Capture. `useSpeechRecognition` picks between three paths, and its native path is
  **Capacitor** (`@capacitor-community/speech-recognition`) — which the root `CLAUDE.md`
  now says is legacy and does not build. So the shipping web path is the browser one, and
  Expo needs its own.

Capture is the fork in the road, and `mobile/CLAUDE.md` constrains it: *"Don't add native
modules that need a custom dev client without saying so — the app currently runs in Expo
Go."* On-device speech recognition needs exactly that. Recording audio and posting it to
the endpoint that already accepts base64 audio does not.

**Note:** voice is not only a workouts concern. The food agent is covering voice food
logging separately; this spec scopes itself to the workout actions and to the shared
plumbing both would sit on. Whoever lands first should build the shell; the second should
add their handlers to it. Do not build two mics.

## Weight: absent, and it is not on the Body page

Worth being precise, because the brief expected it near this area: on the web, weight is
**not** on the Body page. It lives in `components/home/WeightProgress.tsx` and
`WeightLogModal.tsx` (the Home page) and in a chart on `pages/Insights.tsx`. The Body page
never imports `useWeight`.

Expo has nothing: no `useWeight`, no weight client, no `weightEntries` query key, no
screen. `GET/POST/PATCH/DELETE /api/weight-entries` all exist and are unused by the native
client.

Because the surface is Home, this overlaps the Home parity work (#302, #307). This spec
carries the domain layer — client, mapper, hook, unit handling — and leaves the placement
of the card to whoever owns Home, so the two do not both build it.

## What Expo does right, and must not lose

`mergeExerciseEdits` and `apiExerciseToExercise` in `mobile/src/features/body/mappers.ts`
spread the exercise rather than re-listing its fields, precisely so per-set data the form
cannot edit survives a save. Both carry comments explaining that hand-listing the fields is
"exactly what silently destroyed per-set data", and `WorkoutFormScreen.test.tsx` pins it.
The port must keep that property once the form *can* edit those fields.

## Decisions

- **Ship in phases, cheapest correctness first.** The date field, the shared schema and the
  unit label are hours; the picker is days; the logger is the biggest piece. Do them in that
  order so the client stops losing saves before it grows features.
- **Adopt `workoutFormSchema` from `@trackvibe/shared/schemas`** with
  `react-hook-form` + `zodResolver`, which mobile already depends on. This is the single
  change that fixes the duration failure, and it makes the two clients reject the same
  inputs for the same reasons.
- **Surface the server's message on failure.** The shared transport throws `ApiError` with
  the server's envelope; `WorkoutFormScreen`'s catch throws it away. A 400 should name the
  field.
- **The date becomes editable.** A read-only date is not a styling difference — it means the
  native client cannot log yesterday's session, which is the single most common backfill.
  Use a native date picker rather than a text field.
- **Port `ExercisePickerSheet` as a native bottom sheet**, with the same search, the same
  `EQUIPMENT_FILTERS` / `MUSCLE_FILTERS` facets, the same "Add \"<query>\"" empty state and
  the same inline create form. Creating selects the movement immediately — the user came to
  log it, not to file it.
- **`useExercises` and `core/api/exercises.ts` come to mobile**, following the chain
  `core/api/ → features/body/mappers.ts → hooks/useExercises.ts`, with `queryKeys.exercises`
  added to `mobile/src/lib/queryKeys.ts` and `setQueryData` on create — never a refetch of
  ~900 rows. The name-matching helpers (`normalizeName`, `looseNameKey`, `singularize`) are
  non-trivial and already carefully commented; move them to `packages/shared` rather than
  copying them.
- **Per-set logging comes last and comes whole.** Half of it — set rows without the
  completion tick, or the tick without the debounced persist — is worse than none, because
  the workout's `completed` flag is derived from per-set progress on the web.
- **Templates are the lowest priority.** They are a nice-to-have on the web and their
  storage is `localStorage`, so the port needs an AsyncStorage equivalent and a decision
  about whether saved templates should sync. Out of scope here; note it and move on.
- **Voice capture goes through the endpoint, not through a native speech module.** Record
  with an Expo-managed audio API and POST base64 audio to
  `POST /api/voice/understand`, then poll `/api/jobs/:id` — the path the endpoint already
  supports. That keeps the app inside Expo Go, as `mobile/CLAUDE.md` requires, and it is
  the same server-side understanding the web gets. On-device recognition would be lower
  latency and is worth revisiting, but it costs a custom dev client and that is not a
  decision to make inside a parity task.
- **The voice executor moves to `packages/shared`, it is not copied.**
  `voiceActionExecutor.ts` is pure logic over an injected context of hook actions
  (`VoiceExecutorContext`), which is exactly the shape that ports. The mic UI is per-client;
  the handlers are not.
- **Weight ships as a domain layer here, not as a screen.** `core/api/health.ts`'s
  `weightApi`, a `useWeight` hook with the same surface as the web's, and
  `queryKeys.weightEntries`. Whoever owns Home places the card.
- **Body weight stays in kilograms, matching the web.** `WeightLogModal` labels the field
  `Weight (kg)` and `WeightProgress` renders `kg` throughout — neither consults
  `settings.units`, and `domain-conventions.md` says weight is kilograms. Copy that. Note
  in passing that the web *does* honour `settings.units` for **exercise** weight
  (`getWeightUnit` in `WorkoutCard` / `WorkoutModal`), so an imperial user gets lbs on a
  bench press and kg on the scale. That inconsistency is the web's; do not import it and do
  not "fix" it here.

## Open questions — do not decide while implementing

1. **The two mappers disagree about malformed per-set arrays.** The web's
   `apiWorkoutToWorkout` drops `repsPerSet` / `weightPerSet` / `completedPerSet` when
   `length !== sets`; Expo's keeps them, with a comment arguing that "a per-set array whose
   length disagrees with `sets` is a form-validation concern, never a licence for the mapper
   to throw the user's data away." **Recommendation: Expo is right.** The web's guard means
   a length drift silently deletes logged sets on read, and `workoutFormSchema` already
   refuses to submit a mismatched array, so the invariant is enforced where it belongs.
   Adopting it changes the reference client, so it needs the owner. Until then, the port
   must not "align" Expo's mapper down to the web's.
2. **The rest timer's known limitation is fixable on native and not on web.**
   `useRestTimer` documents that a locked phone is told the rest is over when it wakes, not
   at the deadline, and that fixing it "needs the service worker (or a native local
   notification) to own the schedule". Expo can schedule a real local notification.
   **Recommendation:** port the hook's wall-clock logic verbatim first, then file the native
   notification as a follow-up — it is a genuine platform advantage, not a divergence to
   hide.
3. **One screen or two modes?** The web opens an existing workout in the logger and a new
   one in the editor. Expo has a single stack screen. **Recommendation:** keep the single
   screen for create and add a separate logger route for an existing workout, so the phone's
   back gesture maps to one thing per screen. Confirm with the owner before building.
4. **Should saved templates sync?** See above. Local-only matches the web; syncing needs an
   endpoint that does not exist.
5. **Voice is Pro-gated, and the native client has no subscription surface.** Both voice
   routes sit behind `requireAuth` + `requirePro`, and the web has
   `hooks/useSubscription`, `components/subscription/` and an upgrade path. `mobile/src`
   has none of that, so a free user tapping a mic would get an opaque 403.
   **Recommendation:** the mic ships with a real "this needs Pro" state, which means the
   subscription read has to land with it. Sizing that is the owner's call, and it may
   belong to whoever owns Settings rather than to this spec.
6. **Where does the mic live on Expo?** On the web it is the centre button of the bottom
   nav (`frontend/mobile-ui`: "one voice entry point per viewport"). Expo's `MainTabs` is a
   plain six-tab `createBottomTabNavigator` with no centre affordance, and the tab set is
   being reworked separately (#306). **Recommendation:** do not invent a second pattern
   here — take the placement from whoever lands the tab work, and keep this spec to the
   executor and the capture.

## Constraints

- **No API changes, anywhere in this spec.** `GET/POST /api/exercises`,
  `POST/PATCH /api/workouts`, `POST /api/voice/understand`, `GET /api/jobs/:id` and the four
  `/api/weight-entries` routes all exist and all already serve the web.
  `POST /api/exercises` is idempotency-guarded and resolves a duplicate name to the existing
  row, so the mobile picker inherits that behaviour for free.
- **Custom exercises are global.** Per `2026-08-15-1200-single-role-nav-and-custom-exercises`
  they are written to the shared `exercises` table — not a per-user table — which is also
  what keeps them inside `CLAUDE.md` rule 6. The mobile create form must say so, as the web's
  does.
- **Stay in Expo Go.** `mobile/CLAUDE.md` forbids adding a native module that needs a custom
  dev client without flagging it. This is the binding constraint on how voice captures
  audio.
- **Don't add a second mic.** The food agent is covering voice food logging; whichever lands
  first builds the shell.
- **Don't build the weight card twice.** Home parity is #302 / #307.
- **Do not touch the palette.** Design-system agent.
- **`ExerciseList.tsx` in `frontend/src/components/body/` is unreferenced** — it is named as
  canonical in `frontend/components` standards but nothing imports it. Not a port target.
