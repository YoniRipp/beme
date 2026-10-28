# Custom exercises belong to someone — Shaping Notes

## Why this exists

A user who adds a movement the catalog does not have — "Zercher carry from a tyre" — adds it
**for every user of TrackVibe**. That is not a bug anybody introduced by accident; it is a
decision, stated twice in the code:

- `backend/src/routes/exercises.ts:4` — *"The catalog is shared: a POST here adds the exercise
  for every user, not just the author."*
- `backend/migrations/1776400000000_add-exercise-is-custom.js` — *"The row itself is global — a
  custom exercise one user adds is available to everyone, which is the point."*

The owner has decided to reverse it. This spec is that reversal, and it is written with the
original decision in view rather than pretending it was an oversight.

**What is being reversed, precisely.** `exercises` already carries `created_by` and `is_custom`
(`backend/src/db/schema.ts:371-372`), so the row knows who contributed it — but
`exerciseModel.list` (`models/exercise.ts:108-140`) filters on `q`, `muscleGroup`, `equipment`,
`level` and `discipline` and **never on either of them**. The columns record provenance and
control nothing. Add to that `name text NOT NULL UNIQUE` (`schema.ts:357`) and the shared
namespace is not just shared, it is first-come-first-served: the first account to add "Press"
owns that word for the product.

## What is NOT the problem — checked first

The brief said "add workouts manually that are maybe not even in the db". **Logging a workout
with an off-catalog exercise already works, on both clients, and has all along.**
`workouts.exercises` is `jsonb NOT NULL DEFAULT '[]'` (`schema.ts:77`) with no foreign key to
`exercises`, and the exercise name is a free-text field —
`mobile/src/screens/WorkoutFormScreen.tsx:284` (`accessibilityLabel="Exercise name"`, plain
`onChangeText`). Type anything; it saves; it is yours.

Recorded because it changes the shape of the work: nothing here is about workouts. The gap is
entirely in the **catalog**, which is the thing the picker reads.

## What already exists — verified, not assumed

- **The admin role is real and wired.** `users.role text NOT NULL CHECK (role IN ('admin',
  'user')) DEFAULT 'user'` (`schema.ts:49`), a `requireAdmin` middleware, and a full admin
  exercise CRUD already mounted: `GET`/`POST`/`PATCH`/`DELETE /api/admin/exercises`
  (`backend/src/routes/admin.ts:111-131`).
- **`role` already reaches both clients.** `USER_COLS` selects it (`models/user.ts:40`) and
  `ApiUser.role` is declared on the Expo client (`mobile/src/core/api/auth.ts:7`). So "is this
  user an admin" needs no API change to answer.
- **Both clients already have an add-exercise form.** `CreateExerciseForm` in
  `mobile/src/screens/ExercisesScreen.tsx:149-246` and the web's
  `frontend/src/components/body/ExercisePickerSheet.tsx:201`. Neither shows ownership, because
  until now there was none to show.
- **There is an index waiting for this.**
  `idx_exercises_created_by ON exercises (created_by) WHERE is_custom`, added by the same
  migration that declared the rows global.

## Decisions

- **`owner_id`, not a reinterpretation of `created_by`.** `NULL` means global, set means
  private to that user. A new column rather than reusing the existing pair because the two
  answer different questions — `created_by` is provenance ("who contributed this"), `owner_id`
  is visibility ("whose private row is this") — and because every row that exists today has
  `created_by` populated while needing to stay global. One column cannot mean both.
- **Existing custom rows stay global.** They were shared deliberately and people are picking
  them; making them private retroactively removes movements from pickers mid-use, and rows
  whose author was deleted (`created_by` is `ON DELETE SET NULL`) would belong to nobody and
  vanish. A new column defaulting to `NULL` delivers this with no backfill at all — the safe
  outcome is also the lazy one.
- **`ON DELETE CASCADE` on `owner_id`.** A private exercise should die with its owner, and it
  can: `workouts.exercises` is free-form `jsonb` with no FK, so deleting the catalog row
  orphans no logged history. This also gives the new per-user data the lifecycle story
  `global/critical-rules` rule 6 asks for.
- **The destination is chosen by role, not by a flag in the request.** An admin's `POST
  /api/exercises` writes `owner_id = NULL`; everyone else's writes `owner_id = <them>`. No
  review queue, no submission state, no new table. The client sends the same body either way,
  so a user cannot ask for a global row by crafting one.
- **Responses gain `isMine: boolean`, derived.** Additive, so no API-shape change, and it keeps
  user ids off the wire — the client needs to render a badge, not to know who owns what.

  It means **"private to you"**, not "you created it", and the difference is visible: an
  exercise an admin adds goes global, so `isMine` is `false` for that admin and no chip shows
  on a row they created a moment ago. That is correct — the chip answers "is this only mine?",
  which is the question a user looking at a shared picker actually has. Stated here because
  the field name invites the other reading, and `created_by` already holds the one it suggests.
- **No admin screen in this spec.** The role-driven destination means an admin adds exercises
  through the form they already use. `GET`/`PATCH`/`DELETE /api/admin/exercises` stay unused by
  any UI, exactly as they are today; see open question 3.

## The two things that will break if nobody reads this

### 1. `findByName` becomes a private-data leak

`services/exercise.ts:39` resolves a typed name against the whole table before inserting, and
the reason is good — *"Someone typing 'bench press' into the picker means the exercise they
want, not a second row spelled differently"*. The query behind it has no owner predicate:

```
SELECT … FROM exercises WHERE lower(name) = lower($1) LIMIT 1     -- models/exercise.ts:186
```

Once rows are private, typing a name another user privately owns **returns their row**, and the
picker then displays it. The lookup has to be scoped to the caller's visible set (global +
theirs). Two callers, both on the create path (`models/exercise.ts:216`,
`services/exercise.ts:39`), so it is contained — but it is silent if missed, and it leaks
exactly the data this spec exists to make private.

### 2. `ON CONFLICT (name)` stops resolving, and every creation 500s

`createCustom` inserts with `ON CONFLICT (name) DO NOTHING` (`models/exercise.ts:206-209`).
That clause infers the unique index behind `name text NOT NULL UNIQUE` — **the constraint this
spec drops.** Postgres does not fall back; it raises *"there is no unique or exclusion
constraint matching the ON CONFLICT specification"*, and the endpoint fails for everyone.

A partial unique index can be inferred, but only by repeating its predicate, and the two
destinations need different clauses:

| Insert | Index it must infer | `ON CONFLICT` clause |
|---|---|---|
| private | `UNIQUE (owner_id, lower(name)) WHERE owner_id IS NOT NULL` | `(owner_id, lower(name)) WHERE owner_id IS NOT NULL` |
| global (admin) | `UNIQUE (lower(name)) WHERE owner_id IS NULL` | `(lower(name)) WHERE owner_id IS NULL` |

Note both indexes are on `lower(name)` where today's constraint is on `name`. That is a
deliberate tightening: `findByName` already compares case-insensitively, so a plain `name`
index would let "Zercher Squat" and "zercher squat" coexist as two rows that the lookup treats
as one.

## Scope

1. `owner_id` on `exercises`, plus the constraint swap.
2. `GET /api/exercises` and `GET /api/exercises/:id` scoped to the caller.
3. `POST /api/exercises` destination chosen by role.
4. `findByName` scoped; `ON CONFLICT` repaired.
5. `isMine` on the response; a "Yours" chip and a line of destination copy on both clients.

## Open questions for the owner

1. **Should a private exercise be allowed to shadow a global name?** The indexes above permit
   it — you could have your own "Bench Press" alongside the catalog's. It is the honest answer
   for someone whose gym's "bench press" means something specific, but it means a picker can
   show two rows with one name, distinguished only by the chip. **Recommendation: allow it**,
   and let the chip carry the distinction; forbidding it needs a cross-partition check no index
   can express.
2. **What happens to a private exercise already used in logged workouts when its owner deletes
   it?** Nothing, today — `workouts.exercises` copies the name into `jsonb`, so history is
   unaffected and the movement simply stops being offered. Worth confirming that is wanted
   rather than a soft delete. **Recommendation: leave it**; the alternative keeps dead rows in
   a table that only grows.
3. **Does the unused admin exercise CRUD want a screen?** `GET`/`PATCH`/`DELETE
   /api/admin/exercises` have existed with no caller for some time, and a ~900-row catalog
   accumulates typos and junk. Out of scope here by the owner's choice.
   **Recommendation: schedule it separately** rather than growing this spec.
