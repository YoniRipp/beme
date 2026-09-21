# Plan: What App Store Submission Actually Requires

Audited against `origin/main` (`34a51d9`) and the App Store Review Guidelines as published on
**2026-09-14**. Guideline text changes; re-verify if this sits unactioned for a quarter.

**Sizes:** XS `<2h` · S `½–1 day` · M `2–4 days` · L `1–2 weeks` · XL `>2 weeks`.

Read top-down. The tiers are the deliverable.

- **Tier 0** — there is no submittable binary yet, for reasons unrelated to EAS. Nothing else can be
  tested until these are fixed.
- **Tier 1** — Apple or App Store Connect will refuse the submission.
- **Tier 2** — the submission will be accepted, and a reviewer may still reject it.
- **Tier 3** — polish. Ships without it.

Assumed done elsewhere: `eas.json`, EAS project linkage, and the speech plugin, on
`claude/expo-eas-and-speech-foundation`.

---

## Tier 0 — No submittable binary exists

### 0.1 · `app.config.js` silently discards the entire `app.json` — **S**

`mobile/app.config.js` is an eight-line **static object** export. In Expo, `app.config.js` takes
priority over `app.json`, and a static object *replaces* the JSON config; only a function export
receives `({ config })` to merge onto. Expo tracks this as
[expo/expo#22706](https://github.com/expo/expo/issues/22706) — *"app.json is silently ignored when
app.config.ts is also present and returns an object"* — accepted, no warning emitted.

Everything in `mobile/app.json` is therefore dead today:

| Discarded | `app.json` | Consequence |
|---|---|---|
| `icon` | `:7` | **No app icon.** |
| `splash` | `:10-14` | **No splash screen.** |
| `orientation: portrait` | `:4` | Ships rotatable; iPad reviewers rotate. |
| `newArchEnabled: true` | `:9` | New Architecture silently off. |
| `ios.supportsTablet` | `:15-17` | See 1.6 — this one is a *mercy*. |
| `userInterfaceStyle`, `android`, `web` | `:8`, `:18-25`, `:26-28` | Adaptive icon, favicon lost. |

The two files also disagree on identity: `app.json` says `mobile`/`mobile`, `app.config.js` says
`TrackVibe`/`trackvibe`. #317 raises app naming — this is where it is actually decided.

The assets themselves are fine. `assets/icon.png` is **1024×1024 with no alpha**, exactly as Apple
requires. It is simply never referenced.

**Fix:** collapse to one config. Either move everything into `app.config.js` (preferred — it already
needs `process.env`), or convert it to `({ config }) => ({ ...config, ... })`. Then verify with
`npx expo config --type public` and diff against intent. Do this *first*; every other native item
below lands in this file.

### 0.2 · No `ios.bundleIdentifier` anywhere in the repo — **XS**

Repo-wide grep: zero hits. Also absent: `android.package`, `ios.buildNumber`, `android.versionCode`,
`extra.eas.projectId`, `owner`, `runtimeVersion`.

An EAS iOS build **cannot start** without a bundle identifier. Pick it now (`io.travelcard.trackvibe`
or similar), register the App ID, and never change it — it is permanent for the life of the App Store
listing.

### 0.3 · The shipped default API URL is `http://localhost:3000` — **XS to fix, critical to catch**

`mobile/app.config.js:6` and `mobile/src/core/api/client.ts:35` both fall back to
`http://localhost:3000`. `mobile/.env.example` and `mobile/README.md` document only localhost; **no
production URL is recorded anywhere in the repo.**

A TestFlight or App Store build produced without `EXPO_PUBLIC_API_URL` set at build time points at
localhost. Every request fails. Compounding it: plain `http://` is blocked by App Transport Security
on device regardless, and there is no `infoPlist` block to add an exception to.

Worse, the failure is invisible — see 2.3. A reviewer would see a polished app that is simply, permanently empty.

**Fix:** set `EXPO_PUBLIC_API_URL` per build profile in `eas.json` (coordinate with the EAS agent),
record the production URL in `mobile/.env.example`, and make a missing/`localhost` value a hard
build-time failure in release profiles rather than a silent fallback.

### 0.4 · Xcode 26 / iOS 26 SDK floor — **verified, no action**

Since **2026-04-28** (deadline passed), builds uploaded to App Store Connect must use Xcode 26 and an
iOS 26 SDK. Expo has confirmed SDK 54 and 55 are compliant and the **default EAS Build image already
uses Xcode 26**, so no `image` pin is needed. Recorded so nobody spends a day on it.

---

## Tier 1 — Blocks submission

### 1.1 · Account deletion — Guideline 5.1.1(v) — **S–M** *(the relational half is already done; the edges are not)*

> "If your app supports account creation, you must also offer account deletion within the app."
> — Guideline 5.1.1(v), read 2026-09-14

`mobile/src/screens/SignupScreen.tsx` creates accounts, so the trigger is met. The only delete route
is `router.delete('/api/users/:id', withAdmin, deleteUser)` — `backend/src/routes/users.ts:240`,
admin-only, and it *explicitly refuses* self-deletion at `:120-122`:

```ts
if (id === req.user!.id) {
  return res.status(400).json({ error: 'Cannot delete your own account' });
}
```

**The reason this is small: the hard part is already built and shipped.**

Migration `backend/migrations/1776000000000_cascade-user-delete-fks.js` already reworked every FK
that referenced `users(id)` without an action — `workouts`, `food_entries`, `goals`,
`daily_check_ins` to `CASCADE`, and the attribution columns (`app_logs.user_id`,
`user_activity_log.user_id`, `exercises.created_by`, `foods.verified_by`) to `SET NULL` so the rows
survive their creator.

Combined with the 15 tables already declared `ON DELETE CASCADE`, **every per-user table is covered**:

| Behaviour | Tables |
|---|---|
| `CASCADE` (removed with the user) | `user_profiles`, `energy_checkins`, `weight_entries`, `water_entries`, `cycle_entries`, `streaks`, `chat_messages`, `chat_summaries`, `ai_insights`, `user_embeddings`, `user_daily_stats`, `user_storage_stats`, `push_subscriptions`, `trainer_clients` (both FKs), `trainer_invitations`, plus the four from the migration |
| `SET NULL` (row survives, link dropped) | `app_logs`, `user_activity_log`, `exercises.created_by`, `foods.verified_by` |
| Blocks the delete | **none** |

And `deleteUser` (`backend/src/routes/users.ts:116-191`) is already a careful transaction: it nulls
attribution columns and deletes owned rows inside per-statement savepoints, then
`DELETE FROM users ... RETURNING`, commits, and audit-logs. It does not depend on the cascades — it
belt-and-braces them.

So the relational work is **not** a data-lifecycle project:

1. `DELETE /api/auth/account` (or `/api/users/me`) behind `requireAuth`, reusing the existing
   deletion transaction — extract `deleteUser`'s body into a service function rather than
   duplicating it. Additive; no existing API shape changes (critical rule 4). **XS**
2. Confirmation UX on Expo — Settings → Delete account, typed confirmation or password re-entry, an
   irreversible-action warning. `mobile/src/components/shared/ConfirmDialog.tsx` already exists, and
   `mobile/src/core/api/users.ts:17` already exposes `delete` and is called by nothing. **S**
3. Same on web, for parity. **XS**

**But four edges are genuinely unfinished, and they are why this is S–M rather than S.**
Apple's requirement is that deletion actually deletes; the first two below are also the difference
between an honest privacy policy and a false one.

- **S3 uploads are never deleted — XS to fix, easy to miss.** `backend/src/services/storage.ts:45-67`
  writes user files under `users/${userId}/${context}/…` (contexts: `avatar`, `workout`, `food`,
  `exercise-video`). **No database column anywhere stores those URLs** —
  `backend/src/controllers/uploads.ts:8` notes "Client stores fileUrl on its profile/record", but
  neither `users` nor `user_profiles` has such a column. So the files are unreferenced from the DB,
  nothing calls `storage.ts:73 deleteFile` on account removal, and the only way to find them is to
  list the `users/<id>/` prefix. Deletion must list-and-delete that prefix.
- **No session revocation — XS.** `deleteUser` never calls `blockToken`, and
  `backend/src/middleware/auth.ts:14-48` does no user lookup — it verifies the JWT signature and
  checks the Redis `blocked:` set. With a **365-day default token TTL**
  (`backend/src/config/index.ts:22-23`), a deleted user's token keeps authenticating for up to a
  year. Reads return empty; writes fail with FK violations.
- **The deletion path re-writes the deleted user's email — XS.** `users.ts:181` calls
  `logAction('User deleted', { targetId, targetEmail }, …)` **after** the delete, persisting the
  email into `app_logs.details`. Meanwhile the `SET NULL` on `app_logs.user_id` and
  `user_activity_log.user_id` drops the *link* but keeps the *payload* — and
  `backend/src/events/consumers/userActivityLog.ts:72-76` stores the raw event body, which for
  `auth.UserRegistered` is `{ userId, email, name }` (`backend/src/services/auth.ts:101-105`).
  So today a "deleted" user's email and name survive in two tables. Decide deliberately: scrub those
  payloads on deletion, or stop writing PII into them.
- **The 409 error message is admin-facing.** `users.ts:186-187` returns *"Run database migrations to
  enable cascading delete"* — fine for an admin console, wrong for an end user. Reusing the handler
  means reusing that string.

**Two smaller calls to make:**

- **Trainer rows.** `trainer_clients` cascades on *both* `trainer_id` and `client_id`, so a departing
  trainer silently un-links their clients. Defensible, but should be intentional. Note the
  `trainer_*` tables are dead code — `migrations/1776300000000_remove-trainer-role.js:11-12`
  explicitly declines to drop them.
- **Backups.** `frontend/src/pages/Privacy.tsx:232` already promises encrypted backups are purged
  within 30 days. Apple does not audit this; the policy still has to be true.

Bounded and fine, for the record: Redis holds only TTL'd keys (`blocked:`, `pkce:`, `authCode:`,
`idempotency:` — the last caches response bodies keyed by user id for 24h), and the BullMQ voice
queue keeps `removeOnFail: 100`. Neither needs deletion work.

Also note shape.md finding 4: `backend/src/db/schema.ts` never received the cascade fixes and
production skips it, so deletion behaves differently in a freshly bootstrapped dev DB — which means
**tests written against a dev DB would not exercise the production cascade path.**
`backend/scripts/check-schema-drift.mjs:28-34` compares only `information_schema.columns`, never
constraints, so it structurally cannot catch this. **XS** to reconcile, and it is what makes the
deletion tests worth anything.

### 1.2 · Privacy policy is not reachable in-app, and understates what is collected — **S**

> "All apps must include a link to their privacy policy in the App Store Connect metadata field
> **and within the app in an easily accessible manner**." — Guideline 5.1.1(i)

Two separate failures.

**(a) No in-app link.** `mobile/` links to neither a privacy policy nor terms, from anywhere.
`SignupScreen.tsx` collects a name, email and password with no consent surface at all. The web has
`frontend/src/pages/Privacy.tsx` and `Terms.tsx`, routed publicly at `/privacy` and `/terms`
(`frontend/src/routes.tsx:296-311`) — outside the protected catch-all, so they are genuinely public.
**Verify both resolve on the production domain before submitting**; the URL is a required App Store
Connect field and reviewers do click it.

**(b) The policy does not mention cycle data.** 5.1.1(i) requires the policy to *"identify what data
… the app collects."* `Privacy.tsx:37-43` enumerates workouts, food entries, sleep, check-ins and
goals. It never mentions menstrual cycle tracking, weight history, or water — and `cycle_entries` is
the single most sensitive table in the schema (see 1.3).

Separately, `Privacy.tsx:226-233` promises account deletion on request while no self-serve mechanism
exists (1.1), and `Terms.tsx:80-120` plus `Privacy.tsx:152-153`, `Landing.tsx:126` and
`Contact.tsx:175` all describe a Lemon Squeezy billing relationship that **does not exist in
production**. Submitting a privacy policy that describes a payment processor you do not use is a
worse look than having no payments at all.

**Fix:** add cycle/weight/water to the collection list; correct or remove the payment-processor
prose; add a privacy + terms link to Expo's Settings and to the Signup screen.

### 1.3 · Privacy nutrition labels — cycle data is health data, plainly — **M**

**Yes — this counts as health data, and arguably as sensitive data.** Not a close call.

`cycle_entries` (`backend/src/db/schema.ts:284-296`) stores per user, per date:

```sql
period_start boolean, period_end boolean,
flow text, symptoms jsonb NOT NULL DEFAULT '[]', notes text
```

with `user_profiles.cycle_tracking_enabled`, `average_cycle_length`, `sex` and `date_of_birth`
alongside it (`:219-237`).

Two details sharpen this. **`symptoms` has no controlled vocabulary** — it is a free-form string
array (up to 20 × 100 chars, `backend/src/schemas/routeSchemas.ts:191`) plus a 1000-char free-text
`notes`, so whatever the client sends is persisted verbatim. You cannot bound what health text ends
up there. Conversely, and in the app's favour: **nothing is predicted or inferred server-side** —
grep for `ovulat|luteal|fertil|predict` in the cycle path returns nothing. The backend stores raw
logged days only, which is a materially better privacy story and worth saying out loud in the policy.

Against Apple's own definitions:

- **Health** — *"health and medical data, including … any other user provided health or medical
  data."* Cycle entries, `weight_entries`, `energy_checkins` (sleep, energy, stress, mood) and food
  entries all land here unambiguously.
- **Fitness** — workouts.
- **Sensitive Info** — *"racial or ethnic data, sexual orientation, **pregnancy or childbirth
  information**, disability, religious or philosophical beliefs, …"* Cycle tracking with
  `period_start`/`period_end`, flow and symptoms is precisely the data from which pregnancy is
  inferred. Declare **Sensitive Info** as well unless someone can argue it away — the cost of
  over-declaring is nil, the cost of under-declaring is a rejected label and a trust problem.

Beyond health, the labels also need:

- **Contact Info** — name, email, and **`users.phone_number`** (`migrations/1773500000000`, for
  WhatsApp). Easy to forget; it is a distinct declarable sub-type.
- **User Content** — `chat_messages.content` holds full AI-coach transcripts, `chat_summaries.summary`
  holds LLM-generated rollups, and `user_embeddings.content_text`
  (`backend/src/services/embeddings.ts:29-56`) stores a plain-language rendering of **every meal and
  workout** next to its vector. All three are health data in prose form.
- **Audio Data** — once on-device speech ships. Confirm whether audio leaves the device; if
  recognition is genuinely on-device and only text is transmitted, that is a much better answer and
  should be declared precisely, not defensively.

Everything is **linked to the user** (every table keys on `user_id`). Nothing is used for
**tracking** — there is no ad SDK and no data broker, which is the good news and should be declared
as such.

Also engages **Guideline 5.1.3(i)**: health data may not be used *"for advertising, marketing, or
other use-based data mining purposes,"* and *"you must disclose the specific health data that you are
collecting."* `Privacy.tsx:99-106` already commits to never selling health data — good; make the
disclosure specific.

One genuine judgement call to record: health data is sent to an AI provider for insights and chat
(`Privacy.tsx:105`). That is permitted — it is *"improving health management"* for the user — but the
third-party processor must be named in the policy and reflected in the labels, since the developer is
responsible for disclosing third-party collection.

Size is **M** because the App Store Connect form is long, the answers are per-data-type across three
dimensions, and getting them wrong is a re-submission.

### 1.4 · Privacy manifest — `PrivacyInfo.xcprivacy` — **S**

Required since **2024-05-01** for uploads: approved reasons for all required-reason APIs, in app code
*and* third-party SDKs. No `PrivacyInfo.xcprivacy` exists anywhere in the repo.

Expo does **not** fully automate this. SDK packages ship their own manifests, but Apple does not
reliably parse them from static CocoaPods dependencies, so declarations must be duplicated into app
config under `ios.privacyManifests`:

```json
{ "expo": { "ios": { "privacyManifests": {
  "NSPrivacyAccessedAPITypes": [
    { "NSPrivacyAccessedAPIType": "NSPrivacyAccessedAPICategoryUserDefaults",
      "NSPrivacyAccessedAPITypeReasons": ["CA92.1"] }
  ] } } } }
```

`@react-native-async-storage/async-storage` is in `mobile/package.json` and is backed by
`UserDefaults` — so `NSPrivacyAccessedAPICategoryUserDefaults` with reason `CA92.1` is needed at
minimum. Audit `node_modules` for `PrivacyInfo.xcprivacy` files once dependencies are installed and
mirror each one. Apple emails missing declarations within minutes of upload, so this is
fast-feedback — but each round trip is a build.

Lands in whichever config file survives 0.1.

### 1.5 · Permission strings — microphone and speech — **XS, verify only**

On-device speech needs `NSMicrophoneUsageDescription` and `NSSpeechRecognitionUsageDescription`.
Neither exists on `origin/main`; the speech agent is adding them declaratively. **Do not duplicate.**

Two things to verify once that lands, because 5.1.1(ii) requires purpose strings that *"clearly and
completely describe your use of the data"*:

- The strings say what the data is *for*, not what the API is. "Used to log food and workouts by
  voice" — not "This app needs microphone access."
- They survive the 0.1 config collapse. A purpose string added to `app.json` while
  `app.config.js` still shadows it will vanish, and the app will **crash on first mic access** —
  iOS terminates apps that touch a protected resource without a usage description.

### 1.6 · Metadata, assets and age rating — **M**

| Item | State | Note |
|---|---|---|
| App icon 1024×1024, no alpha | Asset **compliant**, not wired | Fixed by 0.1 |
| iPhone screenshots | **None** | 6.9" required: 1320×2868, 1290×2796 or 1260×2736. Apple scales down for smaller devices. |
| iPad screenshots | **None** | Required **only if** the app supports iPad — 13": 2064×2752 or 2048×2732 |
| Support URL | Unverified | Required. `frontend/src/pages/Contact.tsx` exists |
| Marketing URL | Optional | — |
| Privacy policy URL | Page exists | Must resolve publicly — see 1.2 |
| Age rating | **Not answered** | See below |
| Export compliance | Not declared | See below |

**iPad is a decision, and dropping it is the cheap answer.** `app.json:15-17` sets
`supportsTablet: true`, but 0.1 means it is currently *not* in effect. Leaving it off costs nothing
and removes a whole screenshot set plus a device class the reviewer will otherwise test — and
`mobile/` has no tablet layouts. **Recommendation: ship iPhone-only for v1.** Add iPad when there is
a reason to.

**Age rating is newly non-trivial for this app.** Apple replaced 12+/17+ with **13+, 16+ and 18+**,
and every app had to answer the updated questionnaire by **2026-01-31**. The new questions cover
in-app controls, capabilities, **medical or wellness topics**, and violent themes — TrackVibe answers
yes to medical/wellness, so the rating is not the automatic 4+. From **September 2026**, social-media
capability questions are also required before submitting new apps or updates; TrackVibe has no social
feed, so the answer is no, but it must be answered.

**Export compliance — XS, do not skip.** Set `ITSAppUsesNonExemptEncryption: false` in the iOS
`infoPlist`. TrackVibe only uses HTTPS via the OS, which is exempt. Without the key, App Store
Connect holds **every build** in "Missing Compliance" and asks manually each time — a needless tax on
every TestFlight upload.

### 1.7 · EU Digital Services Act trader status — **XS, but external**

Required since 2025-02-17: apps without verified trader status in App Store Connect are removed from
the App Store in the EU, and the status is required to submit updates. This is a business/legal step
(name, address, phone, email, trade register), not engineering — flagging it because it is easy to
discover the week of launch and it gates EU distribution entirely.

---

## Tier 2 — Risks rejection

### 2.1 · Guideline 4.2 minimum functionality — the honest look — **L, and partly a decision**

> "Your app should include features, content, and UI that elevate it beyond a repackaged website. If
> your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."
> — Guideline 4.2

**Where `mobile/` genuinely stands.** It is not a web wrapper — it is a real React Native app with
six tabs, four modal forms, native charts and a theme system. That defeats the crudest reading of
4.2. The code quality is good: zero `TODO`/`FIXME`/placeholder strings anywhere in `mobile/src`, and
tests that actively enforce the *removal* of inert controls.

**The exposure is the first-run impression**, and it is real. A reviewer creates an account and sees:

- Home: `0 of 2000 kcal`, `0 meals logged`, metric tiles reading `0/4`, `--`, `0g`
- Body: "No workouts yet" · Energy: four empty meal slots · Goals: "No goals yet" · Insights: "No data yet"
- Settings: name and email as **read-only text**, then units, theme and accent colour

There is no onboarding, no first-run, no profile, and no sample data. The reviewer's entire session
is empty states unless they manually log food, which they may not do.

**Correcting the brief:** the "three settings sections, two do nothing" finding is **stale**. All
three current sections are wired. Both dead controls were already removed — commit `580fd79` (Clear
All Data, whose confirm handler deleted nothing) and `136388e` (Notifications, a switch persisting
nothing) — and `mobile/src/screens/__tests__/SettingsScreen.test.tsx:29-37` now guards against their
return. Credit where due.

But two *new* inert-control problems exist and are the same species:

- **Units is a dead control.** `settings.units` persists to AsyncStorage and is read by nothing
  outside SettingsScreen. `WorkoutFormScreen.tsx:193` hardcodes `Weight (kg)`;
  `HomeScreen.tsx:146` hardcodes `kcal`. Selecting "Imperial (lbs, in)" changes nothing anywhere.
  This is exactly what `580fd79` and `136388e` removed. **S** to wire, XS to hide.
- **Settings are device-local, never synced.** `SettingsContext.tsx:12` writes
  `trackvibe_settings` to AsyncStorage with no API call. A second device gets defaults.

**Missing capability, cross-referenced not restated:** no profile or first-run (**#315**), no
forgot-password entry point (**#309**, 2.2 below), no voice/barcode/water (**#311**), and Home
disagreeing with web on the calorie target (**#302**). Landing all four closes most of the 4.2 gap on
its own — which is the strongest argument for sequencing them before submission rather than after.

**Voice deserves its own line.** `CLAUDE.md` states voice is the primary input method. `mobile/` has
**zero** voice capability today — no audio dependency, no mic, nothing. That is #311 and the speech
foundation branch. The review-specific risk is narrower and worth stating: **if the App Store
listing, screenshots or description mention voice before it ships, that is Guideline 2.3.1
(accurate metadata) on top of 4.2.** Keep marketing copy behind the feature.

### 2.2 · Account recovery — shipping an account app nobody can get back into — **S**

Password reset is broken for every user on every client: the mailed link points at
`${FRONTEND_ORIGIN}/reset-password`, and no such route or page existed. **#309 fixes the web side**
and is the prerequisite here.

The Expo-specific gap remains after #309: `LoginScreen.tsx` has email, password, "Sign in" and
"Create an account" — and **no "Forgot password?" link at all**. The backend endpoints exist
(`backend/src/routes/auth.ts:20-21`) and are complete: hashed 32-byte token, 1-hour expiry, no email
enumeration, rate-limited at `backend/app.ts:129`.

**One thing to verify before declaring #309 done, because it would fail silently.**
`backend/src/lib/email.ts:21-24` is a **no-op when `RESEND_API_KEY` is unset** — it logs a warning
and returns — and `forgotPassword` swallows send failures in a try/catch
(`backend/src/services/auth.ts:537-546`), reporting success either way. So password reset can appear
to work end-to-end, pass review, and still deliver no email. Confirm `RESEND_API_KEY` is set in the
Railway production environment and send yourself a real reset before relying on this.

**The review risk is worth stating plainly, because it is easy to under-rate.** Apple does not have a
guideline that says "password reset must work." A reviewer will not usually test it. So this is
unlikely to cause a rejection *by itself*.

It becomes serious in combination:

- 5.1.1(v) deletion (1.1) is often tested by a reviewer creating and then removing an account. A
  reviewer who mistypes a password during that flow is locked out mid-review and cannot complete it.
- Once 1.1 ships, "I cannot get into my account" and "delete my account" become the same support
  queue, and the only remaining remedy is manual DB intervention.
- One-star reviews about lockout are a slower, more expensive failure than a rejection.

**Recommendation:** treat it as a launch blocker on product grounds even though it is a Tier 2 review
risk. It is **S** after #309 — a link and a screen.

### 2.3 · Failures are indistinguishable from empty states — **S**

`mobile/App.tsx` has no error boundary (the web has `LocalErrorBoundary.tsx`), and query errors are
computed then discarded — `useEnergy.ts:31-36` builds `energyError` and no screen renders it. On
failure `data ?? []` yields `[]`, so the user sees **"No workouts yet."**

Combined with 0.3, a build with a bad API URL renders as a beautiful, permanently empty app with no
error anywhere. That is the exact impression that produces a 4.2 rejection, and the team would have
no signal as to why.

There is also no pull-to-refresh (`MobileScreen.tsx:56` is a bare `ScrollView`), and `staleTime` is
60s — so recovering from a transient failure means force-quitting the app.

**Fix:** an error boundary, render the errors that are already being computed, and a `refreshControl`.

### 2.4 · Whole-history reads on screen mount — **M**, and a critical-rule-6 issue

`useEnergy` calls `foodApi.listAll()`, `useWorkouts` calls `workoutsApi.listAll()`. These page through
`packages/shared/src/api/pagination.ts` at `PAGE_LIMIT = 200 × MAX_PAGES = 25` — **up to 5,000 rows
per collection**. That file's own comment concedes *"This is still a whole-history read."*

Home mounts three such hooks and blocks on `if (loading) return <LoadingView />`
(`HomeScreen.tsx:133`). A long-tenured account on cellular gets a long white spinner as its first
impression — a plausible "app is broken" rejection, and a direct conflict with **critical rule 6**
("never read a user's whole history in a request path").

### 2.5 · Health disclaimer — Guideline 1.4.1 — **XS**

> "Apps should remind users to check with a doctor in addition to using the app and before making
> medical decisions." — Guideline 1.4.1

TrackVibe is a wellness tracker, not a diagnostic tool, so full 1.4.1 scrutiny is unlikely. But it
does surface **AI-generated insights over health data**, including cycle data. A short disclaimer —
in onboarding (#315) and near AI insights — is cheap insurance and reads well to a reviewer who has
just answered "yes" to the medical/wellness age-rating questions (1.6).

Do **not** let the AI insights copy imply diagnosis, cycle prediction as medical fact, or treatment advice.

---

## Tier 3 — Polish

| Item | Where | Size |
|---|---|---|
| Untyped navigation params — `RootStackParamList` is never imported and every screen uses `useNavigation<any>()`; `EnergyScreen.tsx:180` passes `mealType`, which the type does not declare | `mobile/src/types/navigation.ts` | S |
| Dates not editable on any form — `WorkoutFormScreen.tsx:61` has no setter and renders `editable={false}`; same on Sleep and Food. Backdating is impossible, and a reviewer poking at "log yesterday" hits a wall | forms | M (needs a date-picker dep) |
| Two hardcoded hex colours bypassing the theme guards — `InsightsScreen.tsx:90` `#fff`, `:111` `#ef4444`; low contrast in light mode | Insights | XS |
| Insights recomputed client-side rather than calling the Pro-gated `/api/insights` | `mobile/src/lib/analytics.ts` | — (intentional; note only) |
| Dead API clients shipped in the bundle — `usersApi` entirely, plus `loginWithGoogle/Facebook/Twitter`, all uncalled | `mobile/src/core/api/` | XS |
| CI barely covers `mobile/` — `.github/workflows/ci.yml:71-84` runs `tsc --noEmit` and stops. It never builds, and it never runs the Jest suite `mobile/package.json` defines, so the theme and settings guard tests are not enforced on any PR | CI | S |
| `backend/src/middleware/requirePro.ts:7` documents a bypass the code no longer has | backend | XS |

---

## Out of scope — found while auditing, not App Store issues

These are not review risks and are not part of this plan's tiers. They surfaced while tracing the
deletion and auth paths and should not be lost. **None is scoped here; each needs its own decision.**

1. **A password reset does not invalidate existing sessions.**
   `backend/src/middleware/auth.ts:33` comments that tokens are revoked "on logout/password-reset",
   but `resetPassword` (`backend/src/services/auth.ts:551-585`) never calls `blockToken`. With a
   365-day default token TTL, a stolen token survives the reset that was meant to stop it — which
   defeats the main reason users reset passwords. Same root cause as the deletion gap in 1.1.
2. **Provider sign-in can attach to an existing password account by email alone.**
   `backend/src/models/user.ts:123-135` matches on `(auth_provider, provider_id)` first, then falls
   back to matching by **email** and silently attaching the provider to that account. Google ID
   tokens are verified (`services/auth.ts:194-208`), which contains the risk there — but the same
   path serves Facebook and Twitter, and the fallback does not check whether the provider's email is
   verified. Worth a deliberate look before adding any further provider.
3. **The free tier is not enforced in production.** `backend/src/services/aiQuota.ts:31-34` — see
   C1. Cost and product issue, not review.
4. **`backend/src/services/subscription.ts` is dead code in production.** Recording it as a
   recommendation, not a task: it is unreachable (no `LEMONSQUEEZY_*` env), the roadmap has a
   replacement in `agent-os/specs/2026-08-11-0000-max-hyp-payment-processing/`, and it is the only
   worked example of a webhook + entitlement flow in the codebase. **Recommendation: leave it.**
   Deleting a working integration to tidy up runs at critical rule 2, and if payments return it is a
   useful reference. If it stays, fix the stale docblock in item 7 of Tier 3 and the marketing copy
   in 1.2 so nobody believes it is live.
5. **`energy_checkins` is a read-only orphan** — `backend/src/services/insights.ts:116` reads it and
   nothing in the repo ever inserts. It still holds mood and stress data on any database where it
   was previously populated, so it counts for the privacy labels in 1.3 regardless.
6. **`backend/prisma/schema.prisma` is dead** and describes tables that do not exist
   (`refresh_tokens`, `user_settings`, `transactions`, `groups`). `backend/prisma/README.md:1-5`
   says so, and there are zero `prisma` imports in `backend/src`. Flagged because it is a plausible
   trap for anyone auditing the schema: it is the most schema-shaped file in the repo and it is
   fiction. The real sources are `backend/migrations/` (production) and `backend/src/db/schema.ts`
   (dev bootstrap only).

---

## Constraints to record — not work

### C1 · Guideline 3.1.1 — do not add a purchase surface to Expo

**This was expected to be a blocker. It is not.** Verified in the repo:

- There is no payment provider in production. `LEMONSQUEEZY_*` is absent from the Railway
  environment, and every config field is `z.string().optional()` (`backend/src/config/index.ts:90-94`).
- `POST /api/subscription/checkout` and `/portal` return **HTTP 503 `{ error: 'Lemon Squeezy is not
  configured' }`** (`backend/src/routes/subscription.ts:16-17`, `:41-42`) — they return, they do not
  throw. `app.ts:84` only mounts the webhook parser when the key is set.
- `backend/src/services/subscription.ts` is unreachable in production.
- Pro and admin are assigned by hand in the database.
- `mobile/` has **zero** billing UI — a case-insensitive grep for
  `upgrade|premium|subscri|purchase|billing|paywall|checkout|iap|pricing|trial` across the whole tree
  returns two false positives (the word `auto` in a comment, and `"Plan, log, and review your
  training."`).

So there is no purchase flow to migrate to StoreKit, because there is no purchase flow.

What survives is a constraint. 3.1.1 restricts not just buttons but *links and calls to action*:
outside the US storefront, *"apps and their metadata may not include buttons, external links, or
other calls to action that direct customers to purchasing mechanisms other than in-app purchase."*
(Since 2025, US-storefront apps may include such links without an entitlement — but that is the US
only, and relying on it constrains where you can ship.)

**Therefore: do not add an upgrade CTA, a Pro link, a pricing screen, or purchase copy to the Expo
app until a payment story exists.** This settles the open question #317 raises about an Expo upgrade
CTA — **the answer is: don't add one.** Reaching parity with the web's `SubscriptionSection` would
*create* a 3.1.1 problem that does not currently exist.

Two refinements:

- **Quota messaging is the subtle case.** If Expo ever surfaces a paywall, a limit warning, or an
  exhausted-quota state implying a purchase exists, that alone can engage 3.1.1/3.1.2. Today it
  cannot — and not only because the UI is absent. **`aiQuota.ts:31-34` returns
  `{ allowed: true, isPro: true }` for every user when `LEMONSQUEEZY_API_KEY` is unset**, which is
  the production state. The free tier is not enforced at all; nobody can reach
  `free_quota_exhausted`. That is a real cost/product finding in its own right, and it should be
  fixed for business reasons — but doing so *creates* the quota-exhausted state, so fix the backend
  and keep the message off iOS, or word it with no purchase implication.
- **Manual Pro/admin assignment has no App Store consequence.** Apple cares what the app *offers*,
  not how entitlement is provisioned. Nor does it worsen 4.2: a subscription the user cannot obtain
  in-app is not a feature the app advertises, so there is no unmet promise for a reviewer to find.

**One forward-looking note, so a future decision is made with the cost visible** — not work to
schedule now. There is no `subscriptions` table: state is five columns on `users`
(`backend/src/db/schema.ts:33-38`), and **there is no provider column** — the provider is baked into
the column *name*, `lemon_squeezy_customer_id`, which
`subscription.ts:131-139` keys every write off. (`subscription_source` is not a discriminator; its
values are `'self'` and the legacy `'trainer'`.) So the schema **cannot currently represent an
Apple-originated subscription at all.** If IAP is ever chosen, the cost is not "add StoreKit": it is
a `(provider, external_id)` subscription table, a widened status vocabulary (Apple's
`grace_period`/`billing_retry`/`revoked`/`refunded` have no mapping onto the four-case switch at
`subscription.ts:186-191`), a **JWS**-verified App Store Server Notifications V2 endpoint — Apple
signs with an x5c certificate chain, so the existing HMAC raw-body pattern at
`routes/subscription.ts:83-91` does not transfer — client-side `appAccountToken` plumbing to link a
notification back to a `users.id`, and a restore-purchases path. Roughly **L–XL**, and the same
decision would have to be taken against the Max/Hyp direction already on the roadmap
(`agent-os/specs/2026-08-11-0000-max-hyp-payment-processing/`). Not today's problem; just not a
cheap one.

### C2 · Guideline 4.8 — adding Google sign-in to Expo pulls Sign in with Apple in with it

The precise trigger, so nobody guesses:

> "Apps that use a **third-party or social login service** (such as Facebook Login, **Google
> Sign-In**, Log in with X, Sign In with LinkedIn, Login with Amazon, or WeChat Login) **to set up or
> authenticate the user's primary account** with the app must also offer as an equivalent option
> another login service" — one that limits collection to name and email, lets the user keep the email
> private, and does not collect interactions for advertising without consent. — Guideline 4.8

The listed exceptions do not help TrackVibe: it is not exclusively using its own sign-in system if it
adds Google, and it is not an alternative marketplace, an education/enterprise app, a
government-ID app, or a client for a specific third-party service.

**Current state:** the backend supports Google, Facebook and Twitter
(`backend/src/routes/auth.ts:12-17`), and `GOOGLE_CLIENT_ID` **is set in production** — so Google
sign-in is live on the web, not a placeholder. Expo has none: `mobile/src/core/api/auth.ts:21-26`
defines `loginWithGoogle`/`loginWithFacebook`/`loginWithTwitter` and **no screen calls them.**

**So 4.8 is not triggered on iOS today, and that is the only reason.** The moment Google sign-in is
added to Expo — a natural parity item — Sign in with Apple (or an equivalent qualifying service)
becomes mandatory *in the same release*. That is `expo-apple-authentication`, an Apple Developer
capability, a new backend `POST /api/auth/apple` verifying Apple's identity token, handling the
private-relay email, and account-linking for users who already exist under a Google identity.

**Budget it at M, and budget it as part of whatever ticket adds Google — never as a follow-up.**
Email+password alone keeps 4.8 dormant indefinitely.

---

## The one decision for the owner

Everything above is engineering with a known answer, except this.

**Question: how much of Tier 2.1 ships before the first submission?**

| | Option A — submit lean | Option B — close the parity gap first |
|---|---|---|
| Scope | Tier 0 + Tier 1 only | Tier 0 + Tier 1 + #315, #309, #311, #302 |
| Time to first submission | Days | Weeks |
| 4.2 risk | Real. Six tabs of CRUD, no onboarding, no profile, no voice, empty first run | Low |
| If rejected | 4.2 rejections are re-submittable; the feedback is specific and you learn the reviewer's actual bar | — |
| Hidden cost | A 4.2 rejection is recorded against the app and the next review is read more carefully | Longer with no App Store presence; more code shipped without ever having passed review |

**Recommendation: a middle path.** Ship Tier 0 + Tier 1 to **TestFlight** immediately — TestFlight's
Beta App Review is a lighter gate than App Store review (Apple checks the build launches and the
metadata is sane) and it validates the entire signing, provisioning, privacy-manifest and
export-compliance chain, which is where first submissions actually die. Then land #315 (first-run and
profile) and #309/2.2 (account recovery) before the App Store submission proper, because those two
are what turn "empty CRUD app" into "app with an onboarding and a user", and both are already in
flight. Treat #311 (voice) as the first post-launch release rather than a launch blocker — with the
metadata caveat in 2.1: don't advertise it until it ships.

That is a recommendation, not a decision. **It is the owner's call.**

Note that TestFlight external testing requires a demo account in App Review Information. Provide one
that is **pre-populated with data** — a reviewer signing into an empty account sees the 4.2 problem
described in 2.1, and that applies to TestFlight review too.

---

## Suggested sequencing

1. **0.1 → 0.2 → 0.3** — one config file, a bundle ID, a real API URL. Nothing is testable before this.
2. **1.6 export compliance + 1.4 privacy manifest** — cheap, and they are what block the *upload* as
   opposed to the review.
3. **First TestFlight build.** Everything after this is verified against a real binary.
4. **1.1 account deletion** — smaller than it looks; unblocks the reviewer's most likely test.
5. **1.2 + 1.3** — policy content and nutrition labels, together; they answer the same questions.
6. **1.6 metadata + age rating**, **1.7 trader status** if shipping to the EU.
7. **2.2 (after #309), 2.3, 2.1 units** — the cheap credibility wins.
8. **#315, #302** — then submit.
9. **2.4, #311, Tier 3** — post-launch.
