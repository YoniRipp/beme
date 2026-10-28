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
  any UI, exactly as they are today; see open question 1.
- **A private exercise may shadow a global name.** You can have your own "Bench Press"
  alongside the catalog's, because a gym's "bench press" is sometimes a specific thing. The
  partial indexes already permit this; what makes it *reachable* is the next decision.
- **A private exercise is hard-deleted with its owner** — `ON DELETE CASCADE`, no soft delete.
  Safe because `workouts.exercises` copies the name into `jsonb`, so logged history keeps the
  movement and only the offer disappears. The alternative keeps dead rows in a table that only
  grows.

### Two different scopings, and confusing them is the bug

This is the subtlety the rest of the spec hangs on, so it gets its own heading.

| Path | Scoped to | Why |
|---|---|---|
| `list`, `findById` — **what you can see** | global **OR** yours | The picker must show the shared catalog plus your own movements |
| `findByName` on create — **what you would be duplicating** | **yours only** | Resolving against global rows would hand you the catalog's row and no shadow could ever be created |

The create path deliberately does **not** consider global rows. Typing "Bench Press" into the
Add form gives you *your own* private "Bench Press"; the catalog's is untouched and you then
see both, told apart by the chip.

**This reverses a deliberate behaviour, and the comments that state it have to change too.**
`services/exercise.ts:28-31`, `models/exercise.ts:192-195` and the identical comments in both
clients' `handleCreate` all promise that *"an existing name resolves to that catalog row, so
they still leave with a usable exercise"*. After this spec that is false for global rows and
true only for your own. A stale comment asserting the opposite is worse than none.

The cost, stated plainly: someone who skips the search and goes straight to Add gets a private
duplicate of a catalog exercise without being told. Accepted — both clients show search results
before the Add form, so reaching it is a deliberate "this is not here" act. The warn-first
variant was considered and dropped as a second screen's worth of UI for an edge.

One thing this buys back: a create-path lookup scoped to your own rows **cannot see another
user's row at all**, which is strictly safer than the global-or-yours alternative.

## The two things that will break if nobody reads this

### 1. `findByName` becomes a private-data leak

`services/exercise.ts:39` resolves a typed name against the whole table before inserting, and
the reason is good — *"Someone typing 'bench press' into the picker means the exercise they
want, not a second row spelled differently"*. The query behind it has no owner predicate:

```
SELECT … FROM exercises WHERE lower(name) = lower($1) LIMIT 1     -- models/exercise.ts:186
```

Once rows are private, typing a name another user privately owns **returns their row**, and the
picker then displays it. The lookup has to be scoped — and per the decision above, on the
create path it scopes to the caller's **own rows only**, not to global-plus-theirs. Two
callers, both on that path (`models/exercise.ts:216`, `services/exercise.ts:39`), so it is
contained — but it is silent if missed, and it leaks exactly the data this spec exists to make
private.

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

1. **Does the unused admin exercise CRUD want a screen?** `GET`/`PATCH`/`DELETE
   /api/admin/exercises` have existed with no caller for some time, and a ~900-row catalog
   accumulates typos and junk. Out of scope here by the owner's choice.
   **Recommendation: schedule it separately** rather than growing this spec.

### Resolved on 2026-10-28

- *May a private exercise shadow a global name?* **Yes** — now a decision above.
- *Hard delete or soft delete a private exercise with its owner?* **Hard**, via
  `ON DELETE CASCADE` — now a decision above.
- *What does the Add form return for a name already in the shared catalog?* **Your own private
  copy.** This is what makes shadowing reachable rather than permitted-on-paper, and it is why
  the create-path lookup scopes to your rows only. See "Two different scopings" above — it is
  the one decision here that changes existing, deliberate behaviour.
