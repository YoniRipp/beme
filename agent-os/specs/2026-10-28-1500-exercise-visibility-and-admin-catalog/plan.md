# Plan — Custom exercises belong to someone

Status: **proposed**. No code written; this is the task write-up from the 2026-10-28 design
session.

**Goal:** an exercise a user adds is theirs alone and appears only in their picker; an
exercise an admin adds goes into the shared catalog. Everything already in the catalog stays
exactly as visible as it is today.

**Spec:** read `shape.md` first, including the two failure modes under "The two things that
will break if nobody reads this" — one is a silent data leak, the other takes the endpoint
down for everyone.

## Global constraints

- **Critical rule 1: never break existing functionality.** Every row in `exercises` today must
  remain visible to every user after this ships. The migration is additive for exactly that
  reason.
- **Critical rule 4: do not change API shapes.** `isMine` is an added optional field; no
  existing field changes type or meaning. The MCP server calls `GET /api/exercises` with a
  user's bearer token (`backend/mcp-server/tools/exercises.js:17`,
  `index.js:33`), so it inherits the scoping with **no change to that package** — which
  matters, because it ships separately.
- **Critical rule 6: per-user data must stay bounded.** `owner_id` is `ON DELETE CASCADE`, so
  private rows die with their owner. The list endpoint is already paginated; the new predicate
  adds no unbounded read.
- Weight/unit conventions are untouched — nothing here is unit-shaped.
- Every task ends green: `cd backend && npx tsc --noEmit && npm test`, and for the client tasks
  the same in `mobile/` and `frontend/`.

## File structure

| File | Responsibility |
|---|---|
| `backend/migrations/<ts>_add-exercise-owner.js` | **New.** `owner_id`, drop `name` UNIQUE, two partial unique indexes |
| `backend/src/db/schema.ts` | Mirror the migration in the bootstrap schema |
| `backend/src/models/exercise.ts` | `owner_id` in columns; scope `list`/`findById`/`findByName`; fix `ON CONFLICT` |
| `backend/src/services/exercise.ts` | Choose the destination from the caller's role |
| `backend/src/controllers/exercise.ts` | Pass the viewer through to all three reads |
| `mobile/src/screens/ExercisesScreen.tsx` | "Yours" chip, destination copy |
| `frontend/src/components/body/ExercisePickerSheet.tsx` | Same, on the web |

---

## Task 1 — The column and the constraint swap

The only task that can lose data, so it goes first and alone.

- [ ] **Step 1: Migration.** `ADD COLUMN IF NOT EXISTS owner_id uuid REFERENCES users(id) ON
      DELETE CASCADE`. Nullable, no default, no backfill — `NULL` is "global", which is what
      every existing row must stay.
- [ ] **Step 2: Swap the uniqueness.** Drop the implicit `exercises_name_key`, then create
      `UNIQUE (lower(name)) WHERE owner_id IS NULL` and
      `UNIQUE (owner_id, lower(name)) WHERE owner_id IS NOT NULL`. Both on `lower(name)`, not
      `name` — `findByName` already matches case-insensitively, so a case-sensitive index would
      admit two rows the lookup cannot tell apart.
- [ ] **Step 3: Write the `down` honestly.** Recreating `UNIQUE (name)` only succeeds while no
      two rows share a name, which stops being true the first time two users pick the same
      private name. Say so in the migration's docblock rather than letting someone discover it
      during an incident.
- [ ] **Step 4: Mirror it in `backend/src/db/schema.ts`** (lines 355-375), which is the
      bootstrap path for a fresh database and drifts from migrations if not edited in step.
- [ ] **Step 5: Verify + commit.** Run the migration up, then down, then up on a scratch DB.

## Task 2 — Reads are scoped to the caller

**Verified gap:** `list` (`models/exercise.ts:108`) has no owner predicate, and the controller
calls `exerciseService.list(filters)` with no user at all
(`controllers/exercise.ts:12-14`).

- [ ] **Step 1: `ExerciseListFilters` gains `viewerId`**, and `list` appends
      `(owner_id IS NULL OR owner_id = $viewerId)` to its conditions.
- [ ] **Step 2: `findById` takes the viewer** and returns `null` for a private row belonging to
      someone else, so `GET /api/exercises/:id` 404s rather than leaking a guessed id.
- [ ] **Step 3: Thread the viewer through the controller.** All three handlers have `req.user`;
      none currently passes it to the exercise layer.
- [ ] **Step 4: `isMine`** derived in the row mapper as `owner_id === viewerId`, added to
      `CatalogExercise`. Never expose `owner_id` itself.
- [ ] **Step 5: Tests.** A private row is invisible to a second user's list; visible to its
      owner; a global row is visible to both; `findById` 404s across users. These are the tests
      that would catch the whole feature silently not working.
- [ ] **Step 6: Verify + commit.**

## Task 3 — Writes choose their destination

- [ ] **Step 1: `exerciseService.create` takes the caller's role**, not just the id, and sets
      `owner_id` to `null` for an admin and to the caller otherwise. The request body is
      unchanged, so a non-admin cannot ask for a global row.
- [ ] **Step 2: Scope `findByName` to the caller's OWN rows** — `owner_id = $viewerId`, not
      `(owner_id IS NULL OR owner_id = $viewerId)`. Read "Two different scopings" in
      `shape.md` before writing this line; it is the one place in the spec where the create
      path and the read path deliberately disagree, and using the read scoping here makes
      shadowing unreachable. Unscoped entirely, it is the leak.
- [ ] **Step 3: Repair `ON CONFLICT`.** `(name)` no longer infers anything once the constraint
      is gone; see the table in `shape.md` for the two clauses. Getting this wrong is a 500 on
      every creation, not a subtle bug.
- [ ] **Step 4: Correct the comments that now lie.** `services/exercise.ts:28-31` and
      `models/exercise.ts:192-195` both promise that an existing name resolves to the catalog
      row. After step 2 that is true only for your own rows. Both clients carry the same
      sentence in `handleCreate` and are fixed in Task 4.
- [ ] **Step 5: Tests.** Two users create the same private name and both succeed (the case the
      old UNIQUE made impossible); **a user creates a name that already exists globally and
      gets their own row back, not the catalog's** (the shadowing decision, and the one a
      future refactor is most likely to undo); an admin's creation is visible to a second user;
      a non-admin's is not; re-adding your own existing name returns it with `created: false`
      rather than erroring.
- [ ] **Step 6: Verify + commit.**

## Task 4 — The clients say whose it is

Smallest task, and the only user-visible one. Ships last so the behaviour is already correct
underneath it.

- [ ] **Step 1: A "Yours" chip** on rows where `isMine`, in `ExercisesScreen` and
      `ExercisePickerSheet`. This is what makes two same-named rows legible — see the shadowing
      decision in `shape.md`; without the chip a picker showing "Bench Press" twice is just
      broken-looking.
- [ ] **Step 2: Destination copy** under the create form — one line, driven off `user.role`,
      which both clients already receive. A user should not have to guess whether they are
      publishing to everyone.
- [ ] **Step 3: Fix the comment both clients repeat.** `ExercisesScreen.handleCreate` and
      `ExercisePickerSheet.handleCreate` each say *"An existing name resolves to that catalog
      row, so they still leave with a usable exercise."* After Task 3 they leave with **their
      own** row. The select-after-create behaviour the comment is really about is unchanged
      and worth keeping stated.
- [ ] **Step 4: Tests.** `await render(...)` and `findBy*` on the Expo side (RNTL 14 resolves
      render asynchronously). Assert the chip appears only for `isMine` rows and that the copy
      differs by role.
- [ ] **Step 5: Verify + commit.**

## Verification for the whole spec

- [ ] `cd backend && npx tsc --noEmit && npm test`
- [ ] `cd frontend && npx tsc --noEmit && npm test`
- [ ] `cd mobile && npx tsc --noEmit && npx jest -w 2`
- [ ] **The migration, both ways, on a scratch database** — up, down, up.
- [ ] Manual, once, with two accounts: A adds "Tyre Carry"; B cannot see it in the picker or by
      hitting its id directly; B adds their own "Tyre Carry" and succeeds; an admin adds
      "Zercher Squat" and both A and B see it.
- [ ] Manual, once: A types a name the shared catalog already has — "Bench Press" — into the
      Add form and gets **their own** row, with both visible in the picker and only one
      chipped. This is the decision most likely to look like a bug to someone who did not read
      the spec.
- [ ] Manual, once: delete an account that owns a private exercise; confirm the exercise is
      gone and that a workout logged with it still shows the movement's name.
- [ ] Manual, once: confirm an exercise added **before** this shipped is still visible to a user
      who did not create it. This is critical rule 1 for this spec, and it is one query.
