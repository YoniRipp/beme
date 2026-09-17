# App Store Submission Readiness — Shaping Notes

## Scope

What it actually takes to get `mobile/` (Expo SDK 54 / RN 0.81) through App Store review — grounded
in this repository at `origin/main` (`34a51d9`) and in the App Store Review Guidelines **as they read
on 2026-09-14**, not from memory.

**Write-up only. No application code in this spec's PR.**

`mobile/` is the native client as of #301; the Capacitor shell in `frontend/` is retired. EAS
dev-client builds and the on-device speech plugin are being set up separately on
`claude/expo-eas-and-speech-foundation` — **this spec treats EAS as a given** and does not duplicate it.

## The headline

Two things were expected to be the hard blockers. Only one survived contact with the repo.

| Expected | Actual |
|---|---|
| Account deletion is a big backend project | **The data layer is already done.** Migration `1776000000000_cascade-user-delete-fks.js` cascaded every blocking FK, and `deleteUser` is a working, defensive transaction. The blocker is one route guard and two confirmation screens. |
| External payments (3.1.1) needs an IAP migration | **Not a blocker at all.** There is no payment provider in production. Nothing to migrate. It becomes a *constraint to record*, not work to schedule. |

What replaced them at the top of the list is more mundane and more urgent: **the app cannot currently
be built into a submittable binary at all**, for reasons unrelated to EAS.

## Decisions

- **Order by what blocks submission, then what risks rejection, then polish.** That ordering is the
  deliverable. `plan.md` is structured as Tier 0 → Tier 3 and should be read top-down.
- **Sizes are honest, not encouraging.** Scale: XS `<2h` · S `½–1 day` · M `2–4 days` · L `1–2 weeks`
  · XL `>2 weeks`. Where a size depends on an unmade decision, it says so instead of averaging.
- **Guideline citations are dated.** Every finding cites the guideline number and what it says on
  2026-09-14. Apple rewrites these; re-check before submission if this sits for a quarter.
- **Nothing here is a product decision.** The one genuine decision (Tier 2 scope for 4.2) is
  presented with tradeoffs and a recommendation, and left open.
- **Dead code gets flagged, not deleted.** Critical rule 2. The LemonSqueezy service is unreachable
  in production; removing it is the owner's call.

## Context

- **References:** every claim below carries a `file:line` or a guideline number. Guideline text was
  read from `developer.apple.com/app-store/review/guidelines/` and
  `developer.apple.com/news/upcoming-requirements/` on 2026-09-14.
- **Product alignment:** shipping the native client is the current roadmap phase. This spec does not
  add features; it enumerates the gate.
- **Related open PRs** — cross-referenced, not restated: #309 (password reset), #315 (no
  profile/first-run), #317 (settings sections, app naming), #311 (voice, barcode, water), #302
  (calorie target).

## Constraints

- **Critical rule 1 and 2** — nothing here removes a working feature. The 4.2 remediation in Tier 2
  is additive.
- **Critical rule 4** — no API shape changes. The one new endpoint (self-deletion) is additive; the
  MCP server is unaffected.
- **Critical rule 6** — no new per-user tables are proposed, so no new compaction story is owed.
- **`frontend/` is a shared consumer.** The privacy-policy and terms fixes in Tier 1 land in
  `frontend/src/pages/`, which serves the web app *and* the URLs submitted to App Store Connect.

## Findings that were not asked for

Eight things surfaced that were outside the brief. They are folded into `plan.md` in tier order, and
listed here so they are not lost:

1. **`mobile/app.config.js` silently discards all of `mobile/app.json`.** A static-object default
   export replaces the JSON config rather than merging it. The app currently has **no icon, no splash,
   no orientation lock, no New Architecture, and no `ios.supportsTablet`** — none of which is visible
   until a build is attempted. This is Tier 0 item 1.
2. **The free tier is not enforced in production.** `backend/src/services/aiQuota.ts:31-34` returns
   `{ allowed: true, isPro: true }` for *everyone* when `LEMONSQUEEZY_API_KEY` is unset — which is
   the confirmed production state. Every user has unlimited AI calls today. This is a cost and
   product issue rather than a review issue, but it also means no paywall or quota-exhausted state
   can appear on iOS, which is what defuses 3.1.1.
3. **`backend/src/middleware/requirePro.ts:7` documents a bypass the code no longer has.** Stale
   comment; the bypass moved into `aiQuota`. Harmless but misleading while reasoning about the gate.
4. **`backend/src/db/schema.ts` has drifted from `backend/migrations/`.** Production skips
   `schema.ts` entirely (`config.skipSchemaInit` is forced true when `isProduction`), so the cascade
   migration only ever ran against migrated databases. A database bootstrapped fresh from `schema.ts`
   still has the un-cascaded FKs on `workouts`, `food_entries`, `goals`, `daily_check_ins`. Account
   deletion would behave differently in a fresh dev DB than in production.
5. **`frontend/src/pages/Terms.tsx` and `Privacy.tsx` describe a billing relationship that does not
   exist.** Both name Lemon Squeezy as the payment processor and describe charges, cancellation and
   a customer portal. These are the URLs that get submitted to App Store Connect.
6. **Deleting a user does not delete their uploaded files, and re-writes their email.** S3 objects
   under `users/<id>/` are referenced by no database column and no code path deletes them; and
   `users.ts:181` logs the deleted user's email into `app_logs.details` *after* the delete. Both
   land in plan.md 1.1 — they are the reason account deletion is S–M rather than S.
7. **Neither account deletion nor password reset revokes existing sessions**, against a 365-day
   default token TTL. The deletion half is in 1.1; the password-reset half is a security issue in
   its own right and is listed under "Out of scope" in `plan.md`.
8. **`backend/prisma/schema.prisma` is dead and describes tables that do not exist.** It is the most
   schema-shaped file in the repo and it is fiction — a trap for the next person auditing the data
   model.

## Standards Applied

See `standards.md`.
