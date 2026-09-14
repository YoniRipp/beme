# Standards for App Store Submission Readiness

The following standards apply to this work. Full text lives in `agent-os/standards/`.

This spec is a write-up; no application code ships in its PR. These are the standards that bind
whoever picks up the items in `plan.md`.

---

## global/critical-rules

@agent-os/standards/global/critical-rules.md

The two loudest constraints on this plan.

**Rule 2 — never remove a working feature.** This governs the LemonSqueezy question directly. The
service is unreachable in production, but "unreachable" is not "broken", and deleting a working
integration to tidy up is exactly what the rule exists to prevent. `plan.md` records it as a
recommendation to *leave it*, with reasoning — not as a scoped task.

**Rule 1 — never break existing functionality.** The Tier 0 config collapse (`plan.md` 0.1) touches
the file every native setting lives in. Getting it wrong silently drops a usage-description string
and the app **crashes on first microphone access** — iOS terminates apps that touch a protected
resource with no purpose string. Verify with `npx expo config --type public` and diff against
intent; do not assume the merge worked.

The Tier 2 remediation is additive throughout. Nothing in this plan removes a feature from either
client.

---

## backend/data-lifecycle

@agent-os/standards/backend/data-lifecycle.md

The governing standard for `plan.md` 1.1.

Read it before writing the self-deletion endpoint — but note the finding first: **the per-user
cascade story is already complete.** Migration `1776000000000_cascade-user-delete-fks.js` closed
every FK that would have blocked a delete, so this is not the greenfield data-lifecycle project it
looks like from outside.

What the standard still bites on is the part that is *not* relational: S3 objects under
`users/<id>/` that no column references and no code deletes, and the PII that survives in
`app_logs.details` and `user_activity_log.payload` after their `user_id` is set to `NULL`. "Deleted"
has to mean deleted.

**No new per-user tables are proposed**, so rule 6's compaction requirement is not newly engaged.

---

## backend/routes

@agent-os/standards/backend/routes.md

`DELETE /api/auth/account` (or `/api/users/me`) is the only new route in the plan. `requireAuth`,
correct middleware order, and no `:id` parameter — the subject is `req.user.id` and nothing else, or
the endpoint becomes the admin route with a weaker guard.

---

## backend/api-layers

@agent-os/standards/backend/api-layers.md

`deleteUser` is currently an inline handler in `backend/src/routes/users.ts:116-192` that talks to
`pg` directly — transaction management, savepoints and all. Adding a second caller is the moment to
extract it into a service function, not the moment to copy it. Both routes then call one service;
the deletion transaction has exactly one definition.

---

## backend/errors

@agent-os/standards/backend/errors.md

Deletion is irreversible and partially non-transactional: the S3 cleanup cannot join the Postgres
transaction. Decide the ordering deliberately (delete rows first, then objects, and make the object
sweep idempotent and retryable) and use typed errors. The existing 409 string —
*"Run database migrations to enable cascading delete"* (`users.ts:186-187`) — must not reach an end
user.

---

## backend/models

@agent-os/standards/backend/models.md

Reconciling `backend/src/db/schema.ts` with the cascade migration (`plan.md` 1.1, XS) is model work.
It matters more than its size suggests: production skips `schema.ts` entirely, so today a deletion
test run against a freshly bootstrapped dev database **exercises a different FK topology than
production has**, and `backend/scripts/check-schema-drift.mjs:28-34` compares only columns, never
constraints, so nothing catches it.

---

## global/testing

@agent-os/standards/global/testing.md

Account deletion is the one item here that genuinely needs tests, and the drift above is why: assert
against a migrated database, not a `schema.ts` one. Cover the cascade, the `SET NULL` attribution
columns, session revocation, and that a second delete of the same account is a clean no-op.

Note also how thin CI is on `mobile/`: `.github/workflows/ci.yml:71-84` runs `tsc --noEmit` and
nothing else — no build, and **not even the Jest suite** that `mobile/package.json` defines. So the
`SettingsScreen` guard tests cited above, and the theme palette guards, are not actually enforced on
any PR. Tier 0's config bug is precisely the class of failure this cannot see.

---

## frontend/mobile-ui · frontend/components · frontend/design-tokens

@agent-os/standards/frontend/mobile-ui.md
@agent-os/standards/frontend/components.md
@agent-os/standards/frontend/design-tokens.md

For the Expo-side UI in the plan: the delete-account confirmation (1.1), the privacy/terms links
(1.2), the forgot-password entry point (2.2), and the error surfaces (2.3).

`mobile/CLAUDE.md` forbids inline hex, enforced by AST guards. `plan.md` Tier 3 notes two values
that slipped through as JSX props rather than StyleSheet entries (`InsightsScreen.tsx:90`, `:111`) —
new work should not add a third.

---

## frontend/api-client · frontend/data-fetching

@agent-os/standards/frontend/api-client.md
@agent-os/standards/frontend/data-fetching.md

Relevant to `plan.md` 2.3 and 2.4. Query errors are currently computed and discarded — `useEnergy.ts:31-36`
builds `energyError` and no screen renders it — so a failed fetch is indistinguishable from an empty
account. And `listAll()` pages up to 5,000 rows on screen mount, which is the request-path
whole-history read that critical rule 6 prohibits.

---

## global/domain-conventions

@agent-os/standards/global/domain-conventions.md

Units are the live issue. `settings.units` persists and is read by nothing —
`WorkoutFormScreen.tsx:193` hardcodes `kg`, `HomeScreen.tsx:146` hardcodes `kcal`. Either wire the
setting through the conversion conventions or hide the control; a toggle that changes nothing is the
same defect that commits `580fd79` and `136388e` removed from this screen.

---

## Not a standard, but binding: Apple's own rules

The App Store Review Guidelines are an external standard this repo has no copy of. Every finding in
`plan.md` cites its guideline number and what that guideline said on **2026-09-14**. Apple rewrites
them without notice — the age-rating overhaul and the US external-link change both landed inside the
last year. **Re-verify before submitting** if this spec has been sitting.
