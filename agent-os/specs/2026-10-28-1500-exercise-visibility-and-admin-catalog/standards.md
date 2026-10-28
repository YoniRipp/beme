# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `backend/models` | The list, detail and by-name queries all gain an owner predicate; the unique indexes are model-layer concerns |
| `backend/data-lifecycle` | `owner_id` is new per-user data on an existing table — it needs a cascade and a bound |
| `backend/api-layers` | The viewer has to reach the model from the controller without the route growing logic |
| `backend/response-format` | `isMine` is added to an existing response shape |
| `backend/errors` | A private row read by the wrong user is a 404, not a 403 |
| `backend/routes` | No new routes; the three existing ones change behaviour only |
| `global/domain-conventions` | The exercise catalog's vocabulary — muscle group, equipment, category |
| `global/testing` | Backend suite plus `jest-expo`/RNTL on the Expo side |
| `global/critical-rules` | Rules 1, 4 and 6 all bind here; see below |
| `frontend/components` | The chip and the destination copy on both clients |
| `frontend/data-fetching` | `mergeCreatedExercise` splices the created row into the cached list and must keep doing so |

## Key points carried into the work

- **Critical rule 1 is the whole risk of this spec.** Every row visible today must stay
  visible. That is why `owner_id` is nullable with no backfill: the migration cannot change
  what an existing row means, because it does not touch one. Verify it rather than assume it —
  the last manual check in `plan.md` is one query and it is the one that matters.
- **Critical rule 4 — three consumers, and one of them ships separately.** `isMine` is
  additive; nothing existing changes type or meaning. The MCP server authenticates as a user
  (`backend/mcp-server/index.js:33`), so it inherits scoping without a code change — confirm
  that still holds before assuming it, because a service-account token would scope the catalog
  to a service account and show the coach nothing.
- **Critical rule 6 — the cascade is the lifecycle story.** `owner_id … ON DELETE CASCADE`,
  and it is only safe because `workouts.exercises` is `jsonb` with no FK. If that ever gains a
  foreign key, this cascade becomes a history-destroying delete and has to be revisited.
- **A 404, not a 403, for someone else's private exercise.** A 403 confirms the id exists,
  which is the one bit of information the owner of a private row has not agreed to share.
- **The indexes are on `lower(name)` because `findByName` is.** `models/exercise.ts:186`
  compares case-insensitively; an index on raw `name` would permit two rows that the lookup
  treats as one, which is how a "resolve to the existing row" path starts returning an
  arbitrary one of two.
- **`ON CONFLICT` must name a predicate once the index is partial.** The clause cannot be left
  as `(name)`; see the table in `shape.md`. This is a hard failure, not a degradation — every
  create 500s.
- **Do not reuse `created_by` as the visibility flag.** It is populated on every custom row
  that exists, all of which must stay global. Provenance and visibility are different
  questions and need different columns.
- **The Expo tests must `await render(...)` and use `findBy*`.** RNTL 14 made render
  asynchronous; a `getBy*` on an unawaited render reads an empty tree. Note also that an
  explicit `act(...)` nested inside the act RNTL already wraps `render`/`fireEvent` in will
  leave every later test in the file rendering nothing — drive deferred promises with
  `waitFor` instead (`mobile/src/components/settings/__tests__/CycleSection.test.tsx`).
- **No inline hex in `mobile/`.** The chip is a colour; it comes from `useThemedStyles` /
  `useAppTheme`. AST guards in `mobile/src/theme/__tests__` fail the build otherwise.
