# Reference Implementations Studied

Every claim in `shape.md` was read out of these files on both sides. Nothing came from a
screenshot, a simulator or a browser.

## The reference (web)

- `frontend/src/components/body/WorkoutModal.tsx` — the whole editor and logger:
  `mode: 'view' | 'edit'`, `WorkoutDetailView`'s debounced 700ms persist,
  `normalizeExerciseForLogging` / `finalizeExercise`, `MAX_SETS = 20`, the per-exercise
  dropdown (replace / note / move up / move down / remove), the previous-performance map,
  `<Input id="date" type="date">`, `STARTER_TEMPLATES` plus localStorage templates
- `frontend/src/components/body/SetRow.tsx` — `EditableSetValueInput`, the stepper +
  typed-draft pattern, the completion tick
- `frontend/src/components/body/ExercisePickerSheet.tsx` — search, the two facet rows,
  `PAGE_SIZE = 40` scroll paging, the distinct error state with retry, the
  `Add "<query>"` empty state, `CreateExerciseForm`, and select-immediately-on-create
- `frontend/src/hooks/useExercises.ts` — the catalog query, `normalizeName` /
  `singularize` / `looseNameKey` and the exact + loose indexes, `filterExercises`'s
  prefix-first ranking, `createExercise` with `setQueryData`
- `frontend/src/hooks/useRestTimer.ts` — the wall-clock deadline, and the documented
  limitation about a locked phone that Expo could actually fix
- `frontend/src/lib/voiceActionExecutor.ts` — `handleAddWorkout` / `handleEditWorkout` /
  `handleDeleteWorkout`, `findWorkoutByTitle`, `mergeExerciseOverrides`, and the
  `VoiceExecutorContext` shape that makes the module portable
- `frontend/src/hooks/useVoiceActions.ts` — how the context is assembled from hooks
- `frontend/src/hooks/useSpeechRecognition.ts` / `useNativeSpeech.ts` — the three capture
  paths, and the fact that the "native" one is Capacitor, which root `CLAUDE.md` now calls
  legacy
- `frontend/src/lib/voiceApi.ts` — the request shape for `/api/voice/understand`
- `frontend/src/hooks/useWeight.ts` and `frontend/src/core/api/health.ts` — `weightApi`,
  the date-range params, the same-date replacement on add
- `frontend/src/components/home/WeightProgress.tsx` / `WeightLogModal.tsx` — where weight
  actually lives on the web (Home, **not** Body) and that it is hardcoded to `kg`
- `frontend/src/lib/utils.ts` — `getWeightUnit`, used for exercise weight but not body
  weight

## The client being aligned (Expo)

- `mobile/src/screens/WorkoutFormScreen.tsx` — the single form, `parseInt(duration) || 0`,
  the `editable={false}` date, one sets/reps/weight box per exercise, the fixed
  `Failed to save workout` catch, and `mergeExerciseEdits`
- `mobile/src/features/body/mappers.ts` — `apiExerciseToExercise`'s deliberate spread and
  the comment explaining why there is no `length === sets` guard
- `mobile/src/screens/__tests__/WorkoutFormScreen.test.tsx` — what is already pinned about
  not destroying per-set data
- `mobile/src/hooks/useWorkouts.ts` — `buildWorkoutUpdateBody`, and the note about React
  Query's `notifyManager` timer hanging jest, which is why pure logic is exported and
  tested directly
- `mobile/src/core/api/client.ts` — the shared transport, `ApiError`, and the bearer/
  SecureStore posture
- `mobile/src/lib/queryKeys.ts` — four keys, no `exercises`, no `weightEntries`
- `mobile/package.json` — `react-hook-form`, `@hookform/resolvers` and `zod` are
  dependencies and nothing imports them
- `mobile/src/navigation/MainTabs.tsx` — a plain six-tab bar with no centre mic affordance
- `mobile/CLAUDE.md` — the Expo Go constraint that shapes the voice recommendation

## Shared ground both clients already stand on

- `packages/shared/src/schemas/workout.ts` — `workoutFormSchema`, written "so both clients
  validate identically" and imported by only one of them
- `packages/shared/src/schemas/voice.ts` — the `add_workout` / `edit_workout` /
  `delete_workout` action schemas, likewise already shared
- `packages/shared/src/constants/limits.ts` — `LIMITS`, `EXERCISE_CATALOG_LIMIT`, and the
  rule that a client limit must never be looser than the server's
- `packages/shared/src/types/workout.ts` — `Exercise` with `repsPerSet` / `weightPerSet` /
  `completedPerSet`, so the per-set shape is already common vocabulary

## Backend, to confirm nothing new is needed

- `backend/src/routes/exercises.ts` — `GET /api/exercises`, `GET /api/exercises/:id`,
  `POST /api/exercises` behind `withUser` → `idempotencyMiddleware` → `validateBody`
- `backend/src/routes/workout.ts` and `backend/src/schemas/routeSchemas.ts` —
  `createWorkoutSchema.durationMinutes` is `z.number().int().min(1).max(1440)`, which is the
  Task 1 bug; `exerciseSchema` carries the per-set arrays;
  `createCustomExerciseSchema` fixes the muscle and equipment vocabularies
- `backend/src/routes/voice.ts` + `backend/src/controllers/voice.ts` —
  `/api/voice/understand` takes a transcript synchronously or base64 audio via a Redis job
  polled at `/api/jobs/:id`; both routes are `requireAuth` + `requirePro`
- `backend/src/routes/weight.ts` — the four `/api/weight-entries` routes

## Prior specs leaned on

- `agent-os/specs/2026-08-15-1200-single-role-nav-and-custom-exercises/` — why custom
  exercises are a shared global catalog row rather than a per-user table, and the
  create-or-return-existing behaviour the mobile picker inherits
- `agent-os/specs/2026-08-11-0730-workout-per-exercise-editing/` — why the editor and the
  logger are separate modes
- `agent-os/specs/2026-09-14-1140-parity-workouts-week-summary/` (PR #303) — the companion
  spec; the `getWeightUnit` / `formatDate` move to `packages/shared` is proposed there and
  depended on here
