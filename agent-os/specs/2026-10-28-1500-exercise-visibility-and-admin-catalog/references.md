# Code Read Before Writing This Spec

A code audit on 2026-10-28 against `main` at `11b315f`. Nothing here came from a browser or a
simulator; no database was queried.

## The decision being reversed

Two places say the shared catalog is intentional. Both were read before the spec was written,
and the spec is framed as a reversal rather than a fix because of them:

- `backend/src/routes/exercises.ts:3-5` — *"The catalog is shared: a POST here adds the
  exercise for every user, not just the author."*
- `backend/migrations/1776400000000_add-exercise-is-custom.js` — *"The row itself is global — a
  custom exercise one user adds is available to everyone, which is the point."* The same
  migration adds `idx_exercises_created_by ON exercises (created_by) WHERE is_custom`.
- `backend/src/models/exercise.ts:190-197` — `createCustom`'s docblock, third statement of the
  same intent: *"The row is global on purpose."*

## The catalog as it stands

- `backend/src/db/schema.ts:355-375` — the `exercises` table. `name text NOT NULL UNIQUE` (357)
  is the constraint this spec swaps; `created_by uuid REFERENCES users(id) ON DELETE SET NULL`
  (371) and `is_custom boolean NOT NULL DEFAULT false` (372) are the columns that record
  provenance and control nothing.
- `backend/src/models/exercise.ts:108-140` — `list`. Filters on `q`, `muscleGroup`,
  `equipment`, `level`, `discipline`. **No owner predicate.** This is the finding.
- `:143` `findById`, `:184` `findByName` — neither takes a viewer.
- `:186` — `SELECT … WHERE lower(name) = lower($1) LIMIT 1`, the case-insensitive match that
  decides the new indexes must be on `lower(name)`.
- `:199-218` `createCustom` — `INSERT … ON CONFLICT (name) DO NOTHING` at `:208`. The clause
  that breaks when the constraint it infers is dropped. Also writes `equipment` into `category`
  as well, for older clients that read the equipment-valued column.
- `backend/src/services/exercise.ts:25-48` — `create`, and the resolve-by-name behaviour whose
  rationale is sound and whose query is not scoped.
- `backend/src/controllers/exercise.ts:12-31` — `list`, `get`, `add`. All three have `req.user`
  available; `list` and `get` pass no user to the service.
- `backend/src/routes/exercises.ts:15-17` — the three mounted routes, all `withUser`, plus
  `idempotencyMiddleware` and `validateBody(createCustomExerciseSchema)` on the POST.

## Admin, which is already built

- `backend/src/db/schema.ts:49` — `role text NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT
  'user'`.
- `backend/src/routes/admin.ts:111-131` — `GET`/`POST`/`PATCH`/`DELETE /api/admin/exercises`,
  all `requireAuth, requireAdmin`. **Nothing in either client calls any of them**; `ls
  frontend/src/pages/admin/` has Activity, Foods, Images, Overview, System, UserData and Users,
  and no Exercises page.
- `backend/src/models/user.ts:40` — `USER_COLS` selects `role`, so it is already on every auth
  response.
- `mobile/src/core/api/auth.ts:3-8` — `ApiUser.role` (line 7). The client can already tell an admin from
  a user with no API change. (It still declares a `'trainer'` arm; the trainer role was retired
  in migration `1776300000000` and `schema.ts:210` says no code reads it.)

## The clients

- `mobile/src/screens/ExercisesScreen.tsx:149-246` — `CreateExerciseForm`, "Add exercise".
  `:291` consumes `createExercise`/`isCreating` from the hook.
- `mobile/src/hooks/useExercises.ts:199-211` — the create mutation, and `mergeCreatedExercise`,
  which splices the new row into the cached list.
- `frontend/src/components/body/ExercisePickerSheet.tsx:174, 201` — the web's equivalent. The
  picker is a bottom sheet; the web has no exercise page, which is why
  `mobile/src/navigation/RootNavigator.tsx` registers `Exercises` as a modal rather than a tab.
- Neither client renders `isCustom` anywhere. There is no existing ownership affordance to
  match.

## The third consumer

- `backend/mcp-server/tools/exercises.js:5-29` — `search_exercises` and the by-id read, both
  plain `api.get('/api/exercises…')`.
- `backend/mcp-server/index.js:33` — `Authorization: Bearer ${TRACKVIBE_MCP_TOKEN}`.

**Conclusion that shaped the design:** the MCP server calls these endpoints *as a user*, so
scoping the list by the authenticated caller gives it correct behaviour with no change to that
package. It ships separately with its own lockfile and CI job, so avoiding a change there is
worth something.

## The negative result that shrank the work

**`workouts` has no relationship to `exercises` at all.** `schema.ts:70-82` —
`exercises jsonb NOT NULL DEFAULT '[]'`, no foreign key. `mobile/src/screens/WorkoutFormScreen.tsx:284`
takes the exercise name as free text.

Two consequences, both load-bearing:

1. **The brief's stated problem — "add workouts that are not in the db" — does not exist.** It
   already works on both clients.
2. **A private exercise can be hard-deleted safely.** Nothing references it; logged history
   copies the name. That is what makes `ON DELETE CASCADE` on `owner_id` the right choice
   rather than a soft delete.

## Prior work leaned on

- `agent-os/specs/2026-09-14-1204-parity-settings-sections/` — the sibling parity spec; its
  open question 2 is the precedent for "a shared helper beats two clients drifting", which is
  why `isMine` is derived server-side rather than computed twice.
- `docs/HANDOFF.md` — "Needs the owner" records that `exercises` is one of the tables the AI
  paths read. Scoping the list changes what the coach can see for a given user, which is the
  intended effect and is worth stating.
