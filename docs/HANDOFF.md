# Handoff — native client parity and App Store readiness

**Written 2026-09-14. Last verified 2026-09-17 against `main` at `c025adf`.**

Everything described here is pushed. Nothing in flight lives only on one machine, so this
work can be picked up from a fresh clone.

Start by re-reading this file's assumptions against `origin/main` — several PRs below have
specs written before other PRs merged, and stale specs have already sent work in the wrong
direction once on this project.

---

## What this work is

A parity sweep between the two clients. `frontend/` (web + PWA) and `mobile/` (Expo) are
supposed to be the same product; they had drifted far apart, and the Expo app is the one
going to the App Store. Along the way the sweep turned up several things broken for
everyone, which were fixed first.

The single most expensive mistake in this effort: `CLAUDE.md` claimed the Expo app was
dormant and Capacitor was the native path. It was wrong, and a lot of work went into the
wrong shell before anyone checked. **Verify a doc's claim against the code before building
on it.**

---

## Shipped

Merged to `main` on 2026-09-14:

| PR | What it fixed |
|---|---|
| #301 | `CLAUDE.md` corrected — `mobile/` is the native client, Capacitor is retired. `mobile/CLAUDE.md` created. |
| #318 | CI runs the mobile and shared suites. **235 tests had never run in CI.** |
| #296 | `CORS_ORIGIN` as a comma-separated list crashed the backend at boot — the parser produced `string[]`, the Zod schema had no array arm. |
| #314 | `requirePro` **debited** an AI call instead of checking one, so reads spent quota. Split into `requireAiAccess` and `requireAiQuota`. |
| #309 | Password reset had no page at all — the emailed link led nowhere. |
| #297 | Safe-area insets on iOS. |
| #298 | Tab switches kept the previous screen's scroll position. |
| #302 | Calorie targets: the `goals` table is now the single owner; the web moved to it. |
| #303 | Future-dated workouts did not render. |
| #305 | Goals fetch-error state and an edit race. |
| #321 | EAS dev client, on-device speech, and an `app.config.js` that is actually applied — it had been silently discarding all of `app.json`. |
| #322 | Recovered the authenticated E2E suite, which had been skipped on a wrong diagnosis. |
| #323 | Dependabot pointed at the workspace root. |
| #338 | This file. |
| #339 | The MCP server got a CI job. It ships separately, is not a workspace, and **nothing installed, built, linted or tested it** — so the Dependabot PRs #323 had just enabled were green on checks that never touched the package. |

Merged to `main` on 2026-09-16 — **this is the batch the previous version of this file still
listed as in flight**:

| PR | What landed |
|---|---|
| #340 | Handoff updated to where the four PRs had actually got. |
| #341 | MCP tool schemas unwrapped, so the SDK could be upgraded at all. |
| #325, #324, #326 | `backend/mcp-server`: `@modelcontextprotocol/sdk`, zod 3 → 4.6.2, dotenv 16 → 17.4.2. Unblocked by #341. |
| #308 | MD3 colour roles. `buildPaperTheme` mapped 9 of Paper's 33 keys; the other 24 stayed Material purple. `everyMd3RoleIsMapped.test.ts` now fails if a role is added and left unmapped. |
| #317 | Settings parity — **spec only, 4 files, no application code.** See the warning under Not started. |
| #319 | Playwright no longer adopts whichever worktree owns :5173. Also added `tsc --noEmit -p tsconfig.e2e.json` to the frontend lint script, which immediately found a dead helper. |
| #299 | AI Coach FAB no longer sits on top of real controls; its footprint is reserved in the scroll container. Dropped `frontend/playwright.local.config.ts`, the workaround #319 made unnecessary. |
| #307 | Home parity — the five missing cards (streaks, water, weight progress, cycle, recent activity), `health.ts`, the `useWater`/`useWeight`/`useCycle`/`useStreaks` hooks, a weight form screen, and the shared `activity`/`weight` domain modules. |

Merged to `main` on 2026-09-17 — four PRs, in this order, because #343 was stacked on #342:

| PR | What landed |
|---|---|
| #342 | Four correctness bugs: two unbounded reads (`useWeight`, `useCycle`), "Day 214 of ~28" with a DST off-by-one, "logged today" wrong for every user west of UTC, and a food parser that filed `"2 eggs for breakfast, chicken for lunch"` as one item named `"eggs for breakfast"`. The parser moved to `packages/shared` on the way, so Expo can reach it. |
| #343 | The Expo design system: #312 (radii, elevation, the `components/ui/` primitive layer) and #316 (six font faces where two were loaded). **Visually unverified — see owner item 6.** |
| #344 | `user_profiles.units`, nullable with no default, so the server can finally identify which accounts are imperial. Changes no behaviour and converts nothing — it makes owner item 7 actionable. |
| #345 | The offline sync queue replayed every queued mutation with **no credential at all** — no header, and a `sameSite: 'strict'` cookie that cannot reach the API cross-site. Every replay 401'd, and the 401 branch `break`s without incrementing retries, so the queue stalled forever after the user had been told the write succeeded. Only `PWA_OFFLINE_SYNC` being off by default kept this from losing real data. |

Merged to `main` later the same day, 2026-09-17:

| PR | What landed |
|---|---|
| #346, #351 | Handoff corrections. #351 fixes two things this file got wrong about #337: it did **not** merge clean (`git merge-tree` in its three-argument form is not a mergeability check — use `--write-tree`), and its CI is green (the `total_count: 0` was the legacy commit-statuses API). |
| #347 | The MCP server's 7 advisories closed and its audit added to CI. Of the four "high" findings exactly one was on a path a stdio-only server executes. |
| #348 | Four more unbounded reads — `chatAgent`'s `get_weight_entries` read the **entire weight table into an LLM prompt** on any chat turn mentioning weight, in a file whose own docstring says these limits are load-bearing. |
| #349 | `express` 4.22.2 → 4.22.3, dropping two vulnerable nested `qs` copies off the production request path, plus a reachability analysis of every remaining advisory (owner item 10). |
| #350 | The app registered **6 font faces and shipped 36**. The iOS export went 13 MB → 7.1 MB with a byte-identical JS bundle. |
| #352 | The App Store blockers that are code: in-app privacy/terms links (5.1.1(i)), the `ios.privacyManifests` declaration, and cycle/weight/water added to the privacy policy. |
| #353 | Every mobile list screen rendered an empty state for a failed request. The errors had been computed for months and no screen read them. |
| #354 | Optional `startDate`/`endDate` on the three paged list endpoints — the prerequisite for bounding `listAll()`. |
| #355 | **The two clients printed different calorie totals for the same rows** — a seven-day week read ~13,000 kcal on Expo against ~1,850 on the web. |
| #356 | A malformed date param returned 500 rather than 400 on `weight`, `water` and `cycle` — they cast `req.query` and let Postgres raise the cast error. |
| #357 | Insights was the screen #353 missed. Also: an account logging **only sleep** was told it had no data, while two of that screen's four stats are computed from check-ins. |



### Carried out of #307, and now fixed

`frontend/src/hooks/useWeight.ts` called `weightApi.list()` with no arguments, so the web
read a user's entire weight history to draw a seven-bar sparkline — **critical rule 6**. The
endpoint had always accepted the bound; the client never sent it.

Fixed in #342. The bound is a LIMIT rather than a date window
(`WEIGHT_HISTORY_LIMIT`, now in `packages/shared/src/domain/weight.ts` so the two clients
cannot disagree): the model orders `date DESC`, so a limit means "the N most recent
readings" and always contains the latest one, where a 90-day window would show "No weight
logged yet" to someone whose last weigh-in was in the spring. 30 is what the web's Insights
chart plots; the Home card needs 7 of them.

Two things worth knowing if you touch this again. The cache write is capped at the same
number — bounding the fetch while letting `setQueryData` grow without limit gives back part
of what the bound is for. And `parseOptionalPagination`, which the whole bound rests on, had
**no test at all** despite being the only thing that puts a LIMIT into the SQL; it has one
now (`backend/src/utils/pagination.test.ts`).

### About #323, because it changed the PR list

npm workspaces keeps one lockfile, at the repo root. Dependabot was aimed at `backend/`,
`frontend/` and `mobile/`, none of which has a lockfile — so it bumped a workspace
`package.json`, left the root `package-lock.json` stale, and `npm ci` refused to install.
Every CI job that installs anything failed, including jobs unrelated to the package. All
eight open Dependabot PRs were red for that one reason.

Aimed at the root it works: the replacement PRs are green. But the count went **8 → 21**,
because the root entry also sees the root's own devDependencies and every workspace at
once. If that is too much noise, group minor and patch bumps into one weekly PR.

`#334` (root zod 3 → 4.6.4) is still open and still correctly red — a real breaking change,
not the old lockfile problem. Note that the *mcp-server's* own zod 4 bump (#324) landed
separately on 2026-09-16 once #341 unwrapped the tool schemas; the two are different
packages and the root one has not been retried since.

---

## In flight — one PR with code

### #337 · Self-service account deletion — the App Store blocker
`claude/appstore-account-deletion` → `953461f`. 28 files of application code, plus a merge of
`main` and one fix taken on 2026-09-17 (below).

**Correct a claim this file made earlier today: it did NOT merge clean.** An earlier pass said
so on the strength of `git merge-tree origin/main <branch>` reporting zero conflicts. That
three-argument form is not a mergeability check — `git merge-tree --write-tree` exits non-zero
on the same two commits, and the real merge conflicted in `mobile/src/screens/SettingsScreen.tsx`
and `mobile/src/components/shared/ConfirmDialog.tsx`. **Use `--write-tree`, or do the merge.**

The conflicts are resolved on the branch and the resolution is additive: #344's `reportUnits`
and this branch's `handleDeleteAccount` now sit side by side, and `ConfirmDialog` takes
`Button` from #343's `components/ui` primitive rather than from Paper. Two of #343's guards
caught the rest — `ConfirmDialog` was importing Paper's `Button` directly, and its warning
style set `fontWeight: '700'` with no family, which on Expo renders in the system font.

Its CI is green, which this file also previously got wrong: it reported `total_count: 0` and
said not to read that as green. That was the legacy *commit statuses* API, which this repo
does not use. The **check runs** are all there and all passing.

App Store Guideline 5.1.1(v): an app that creates accounts must let users delete them
in-app. The only delete route is admin-only and explicitly refuses self-deletion.

The relational half was already done before this work started — a migration cascaded every
blocking FK. What is pushed: the deletion transaction extracted into
`backend/src/services/account.ts` and shared by both routes, a self-delete route behind
`requireAuth`, confirmation flows on both clients, and the four edges that make deletion
honest — S3 objects under the `users/<id>/` prefix, JWT revocation (tokens default to a
**365-day** TTL and the auth middleware does no user lookup, so a deleted user's token
otherwise keeps working for a year), scrubbing the email out of `app_logs` and
`user_activity_log`, and an end-user-facing message in place of the admin-facing 409.

Also reconciles `backend/src/db/schema.ts` with the cascade migration and teaches
`check-schema-drift.mjs` to compare FK actions — it compared only
`information_schema.columns`, so deletion tests against a dev DB proved nothing about
production.

Three review rounds have run and all three paid for themselves. Round 1 fixed nine findings
and rejected one with reasoning. **Round 2 found a SQL bug that broke deletion outright**, plus
four more, and rejected one.

**Round 3 (2026-09-17) found one bug, and it was not in the deletion code.**
`AuthContext.logout` on the Expo client dropped the token and the user and left the React
Query cache untouched. With `staleTime: 60_000`, the next account to sign in on that device is
served the previous account's workouts, food entries, weights and goals for a minute — from
cache, with no refetch to correct it. The web has always cleared its cache there
(`clearClientSession`); this client had not.

It is a logout bug rather than a deletion bug, but deletion is where it stops being cosmetic:
the rows are gone server-side by then, so that cache is the only copy of them left anywhere,
and a deletion that leaves the data on the device is not what Guideline 5.1.1(v) asks for.
Fixed in `logout`, so the ordinary sign-out path is covered too.

Everything else round 3 looked at came back clean and is not worth re-reading: the S3 prefix
is `users/<id>/` with a trailing slash and uploads use the same helper, so one user's sweep
cannot reach another's objects; the self-service route takes its subject from `req.user.id`
and refuses MCP-authenticated callers; the admin route keeps `requireAdmin`, keeps its refusal
to delete your own account, and preserves its old response shapes (critical rule 4); and both
blocklists are consulted by the WebSocket path as well as the HTTP middleware.

**GitHub reports no commit statuses at all on `491baf0`** — `total_count: 0`. Do not read
that as green. Establish what CI actually says before trusting the branch.

**Still do not merge without reading it.** It deletes user data, and one decision was made
unilaterally and needs a second opinion: scrubbing PII on deletion, versus not writing PII
into those tables in the first place.

It touches `mobile/src/screens/SettingsScreen.tsx`, which is why #317's implementation and
#315 have to follow it.

---

## Not started

Every PR in this table is **spec only** — verified by diffing each PR head against its merge
base: zero files outside `agent-os/specs/` and `docs/`. None of them contains application
code. They are all **94+ commits behind `main`**, and more than a dozen of the PRs they were
written against have merged since.

**Four of them were re-derived from the code on 2026-09-17, one agent per PR, and every one came
back smaller than its spec.** The sizes in the table below are those measurements, not the
specs'. The per-PR notes further down carry the `file:line` evidence and name the specific lines
where each spec is now false. **Read those notes before the spec**, in every case — three of the
four specs list files as "new" that already exist and are complete, which is the exact mistake
this file opens by warning about.

| PR | Scope |
|---|---|
| #315 · first-run and profile | Scope shrank once #302 added a profile client. Conflicts with #337. **Not re-derived** — the only one of these still sized from its spec. |
| #311 · voice, barcode, meal tools, copy day | Three of its eight rows are already built. What is left is one **M** (voice), two **XS** (batch plumbing, "look up with AI") and an owner decision (barcode). |
| #304 · food Journal screen | ~~A whole screen~~ — **S**. `EnergyScreen` already renders the Journal; what is left is four numeric/layout deltas and five polish items. Its Task 3 shipped elsewhere. |
| #313 · workout recording | One of its five tasks is **already shipped** (weight). Voice is ~half its stated size. **Per-set logging is the genuine L** and the one capability that makes Expo feel like a different product. |
| #310 · Insights AI | ~~1.5–2 engineer-weeks~~ — **~1 week with chat, ~2–2.5 days without.** The AI narrative is **~1 day and needs no backend work**; see the note below. |
| #320 · rest of App Store readiness | **Partly done — see below.** The in-app policy links, the privacy manifest and the Tier 2 error handling shipped 2026-09-17; nutrition labels, metadata, screenshots, age rating and guideline 4.2 remain, and most of what remains needs a person. The one sizeable piece of code left is 2.4, below. |
| #306 · tab set, destinations, screen names | **Last, and alone.** It renames every tab and screen title, so it conflicts with every other Expo PR here. |

### #312 and #316 shipped in #343 — but both PRs are still open

Read that before you look them up. #343 implemented both; the **spec PRs themselves were never
merged**, so `agent-os/specs/2026-09-14-1112-parity-radius-elevation-spacing/` and
`…-1114-parity-typography/` exist only on their own branches and are not in the repo. Anyone
who finds two open PRs will reasonably conclude the work is outstanding. It is not — and this
is the mirror image of the #317 trap below, where a merged PR shipped no code.

Neither spec should be merged as-is without reading the corrections below: three of #312's
numbers and one of #316's are wrong against the code that shipped.

The design-system trio is complete and merged: #308, then radii/elevation/primitives (#312)
and typography (#316) together in #343. Both rewrote `mobile/src/theme.ts`, in different
places, as their specs predicted.

#316 in one line: the app named weights `600`/`700`/`800` in **52 of its 55** `fontWeight`
declarations and loaded none of them — and on Expo a weight is part of the family name, not a
number, so not one of those 52 could render. The spec counted 27; #307's five new cards nearly
quadrupled the 700s in between. Three faces added; deliberately no 800, because the web's own
`font-extrabold` has no file behind it either.

Two things #316 found that its spec did not:

- **The most-seen text in the app had no font at all.** The six tab labels and every screen
  header go through React Navigation style props, which never pass through a `<Text>`
  import — so `rawTextNamesItsFont` was exempt from them by construction. That guard exists
  because "17 green tests and the sign-in screen still rendered in the system font"; it had
  the same blind spot one layer over. It sees navigation styles now.
- **`LoginScreen` and `SignupScreen` were called clean because they DO name fonts** — and
  their sign-in button named `fonts.regular` beside `fontWeight: '600'`. A named font that is
  the wrong face for its weight renders exactly as wrong as no font, with every guard green.

### #312's own corrections

All seven tasks, in four commits. The spec was accurate about the shape of the problem and
wrong about three of its numbers, each corrected in the commit that found it:

- It counted **four** hand-rolled card surfaces. There were **fourteen** — writing the guard
  first is what found the other ten, including `SectionCard`, which #307 added *after* the
  spec named the problem and which still grew its own copy at a third radius.
- It called six spacing values "off-scale entirely". Five of them are on Tailwind's scale —
  the web uses `gap-1.5` 31 times and `mt-0.5` 21 — and the shared token had simply
  transcribed six of Tailwind's steps. Following the spec there would have changed the line
  spacing inside every card to satisfy a test. Exactly one value (a `3`) was genuinely off.
- It asked for Paper's `containerSize` prop for the 44px target. Paper 5.15 has no such prop;
  the size comes from `style`.

**Not verified, and it needs a simulator**: cards now render at 22px with a shadow where they
were flat at 14 or 18, and every icon button's footprint grows 10px. `MobileWorkoutCard`'s
action row is the tightest place that happens. This is a visual change with no visual
confirmation — it is the same "every merged Expo change is visually unseen" item below,
now with more to look at.

### The date audit is finished — don't redo it

Dates in this app are local calendar days, and `new Date('2026-09-16')` is UTC midnight. That
mismatch produced three of the bugs on this branch, so the whole surface was swept. What was
found and what was cleared:

| surface | verdict |
|---|---|
| Backend read path | **Clean.** All seven models (`foodEntry`, `streak`, `dailyCheckIn`, `cycle`, `weight`, `workout`, `water`) render `DATE` columns through `toDateString`, never `.toISOString()`. |
| Backend "today" defaults | UTC (`new Date().toISOString().slice(0,10)`) in voice, water, chat and insights — but **defensive only**: both clients always send their own local date. Worth knowing if a new client ever omits it. |
| Web mappers | **Clean.** `features/*/mappers.ts` run every API date through `parseLocalDateString`, so domain types carry real local `Date`s and the ~40 `new Date(x.date)` call sites downstream are harmless copies. |
| Entries that bypass the mappers | **The bugs.** The raw `Api*` types from `useWeight` and `useCycle` carry strings, and three sites parsed them naively. All fixed. |
| Client "today" | **Clean.** Both `useWater` implementations use `toLocalDateString`. |
| Meal inference from `entry.date` | **Broken on both clients, not fixed** — owner item 8. |

The reusable lesson, and it caught me twice: **a timezone test written without setting `TZ`
proves nothing**, because the runner uses UTC and UTC is where these bugs hide. Both new
suites set it and assert that the old spelling disagrees.

### #320: what shipped, and what is left (and why what is left needs you)

The code half of Tier 1 landed on 2026-09-17. Its spec is from `34a51d9` and several of its
Tier 0 items had already been fixed by #321 and #337 — `app.config.js` no longer discards
`app.json` (there is no `app.json`), the bundle identifier exists, and the permission strings
are declared. What was still genuinely missing, and is now done:

- **Guideline 5.1.1(i) — the policy was reachable from nowhere.** The Expo client linked to
  neither a privacy policy nor terms, from any screen. There is a Legal section in Settings
  now, linking out to the web client's already-public `/privacy` and `/terms` rather than
  duplicating the copy — one set of words to keep true, and the same URL a reviewer clicks
  from App Store Connect.
- **The privacy manifest.** `ios.privacyManifests` is declared in `app.config.js`, mirrored
  from the `PrivacyInfo.xcprivacy` files actually installed rather than from the spec's
  guess — which was wrong in a way worth knowing: it assumed `async-storage` needed
  `UserDefaults`/`CA92.1`; that package asks for `FileTimestamp`/`C617.1`, and `UserDefaults`
  comes from `expo-constants` and React Native core. Re-read the installed manifests after a
  dependency bump: `find node_modules -name PrivacyInfo.xcprivacy`.
- **The policy did not mention the most sensitive table in the schema.** `Privacy.tsx`
  enumerated workouts, food, sleep, check-ins and goals, and never mentioned menstrual cycle
  data, body weight history or water. Added.

**One inferred value to confirm.** The in-app links resolve against `extra.webUrl`, defaulting
to `https://trackvibe.app` — inferred from the address the privacy policy itself gives for
contact, because `FRONTEND_ORIGIN` is unset in production and nothing in the repo states the
live origin. Override with `EXPO_PUBLIC_WEB_URL`, and **check both pages actually resolve
before submitting**: a privacy policy URL that 404s is a rejection, and it is a required App
Store Connect field regardless.

**What is left is mostly not code.** Privacy nutrition labels (cycle data is health data, and
arguably sensitive — a questionnaire, not a file), screenshots at 6.9", the support URL, the
age rating, export compliance, and the EU trader declaration. Plus the one genuine product
decision in that spec: whether to submit lean and accept a real guideline 4.2 risk, or close
the parity gap first.

**And one thing the spec flags that this did not touch.** `Privacy.tsx`, `Terms.tsx`,
`Landing.tsx` and `Contact.tsx` all describe a Lemon Squeezy billing relationship that does
not exist in production. Submitting a privacy policy describing a payment processor you do not
use reads worse than having no payments at all — but it is legal copy about a commercial
relationship, so correcting it is yours rather than an agent's.

### #320 Tier 2: failures no longer look like empty states

Shipped 2026-09-17, and the finding is worth keeping even though the fix is small.

Every list screen on the Expo client rendered `data ?? []`, so **a failed request and an
account with no data produced the same screen**. A user whose fetch 500s was told "No food
entries". `useEnergy` and `useWorkouts` had both been computing an error string for months and
**no screen ever read it** — only `GoalsScreen` rendered one, via a `goalsViewState` helper it
kept to itself. That helper is now `lib/listViewState.ts` and Home, Journal and Workouts use
it; the rule that matters is that `empty` is false while an error is showing.

Combined with the shipped default API URL of `http://localhost:3000`, a build pointed at the
wrong backend rendered as a polished, permanently empty app with no error anywhere — which is
the exact impression that earns a guideline 4.2 rejection, with no signal as to why.

Also added: an error boundary (a render throw unmounted the whole RN root and left a blank
screen with nothing to tap — the web has had `LocalErrorBoundary` for this), and pull-to-refresh
on `MobileScreen`, because `staleTime` is 60s and a failed query does not retry itself, so
recovering from one dropped request meant force-quitting the app.

**One thing worth copying from how that went.** The boundary's first fallback used
`components/ui`'s `Button`, and its own test caught what that meant: the boundary sits *above*
`ThemeProvider` so it can catch a throw from the providers themselves, so its fallback threw
`useThemeContext must be used within ThemeProvider` — a blank screen again, with an extra step.
The fallback is bare React Native primitives now, and its test renders it with **no providers
at all**, which is the property rather than an incidental detail.

### The unbounded-read audit was not finished — where the rest of it was

#342 fixed the two client reads. The sweep stopped at the clients, and it should not have:
the same shape was live on the server and in the MCP tools, and #348 closes it.

The mechanism is one helper. `parseOptionalPagination`
(`backend/src/utils/pagination.ts`) returns `undefined` when the caller sends **neither**
`limit` nor `offset`, and every model treats a missing pagination argument as "emit no LIMIT
clause". That is deliberate — it is a compatibility shim so older clients keep their
unpaginated responses — but it means a caller that simply does not think about pagination
gets the user's whole table, silently.

| caller | verdict |
|---|---|
| `chatAgent.ts` `get_weight_entries` | **Was unbounded.** It passed `startDate`/`endDate` straight from the model's tool args and no pagination at all, so a chat turn that asked about weight without naming dates read the entire `weight_entries` table into a prompt. Two lines above it, the file's own docstring says these limits are load-bearing "because the agent runs on every chat turn". |
| `chatAgent.ts` `get_goals` | **Was unbounded.** Small in practice — a user has one goal per type — but the same shape, and nothing stops a future per-exercise goal type. |
| `chatAgent.ts` `get_workouts`, `get_food_entries`, `get_water_today` | Clean. Already bounded by `MAX_WORKOUTS_PER_READ` / `MAX_FOOD_ENTRIES_PER_READ` / a single date. |
| MCP `list_weight_entries`, `get_water_history` | **Were unbounded.** `limit` was `.optional()` and only forwarded `if (limit !== undefined)` — and an LLM omits an optional argument routinely. |
| MCP's other list tools | Clean, and for a reason worth knowing: `food-entries`, `workouts`, `goals` and `daily-check-ins` hit controllers that use `paginationSchema`, which **defaults** to `limit: 50`. Only weight and water history use the shim. |
| `voiceExecutor.ts` | Clean. Every weight and water read there is `findById` / `findByDate` / `findLatest`. |
| Both clients | Clean. `useWeight` on web and Expo both send `WEIGHT_HISTORY_LIMIT`; nothing on either client calls water history at all. |

**The backend half is done (#354), and the client half is still open — #320's item 2.4.** `useEnergy` and
`useWorkouts` page through `createRequestAllPages` at `PAGE_LIMIT` 200 × `MAX_PAGES` 25 — **up
to 5,000 rows per collection**, and that file's own docstring concedes "this is still a
whole-history read". The endpoints take that window now: #354 added optional `startDate`/`endDate` to all three,
additively, with `total` computed over the same window so a filtered list pages to its end.
**Nothing is blocking the client change any more.**

What is left is the risky half: nine screens use those two hooks, each wanting a different window
(Insights a year, Home the last few days, Journal the selected period, the forms a single entry),
and changing their cache keys unsupervised with no simulator is exactly the sort of thing
critical rule 1 is about. Do it per screen, not in one sweep.

So the pagination shim now has exactly two endpoints behind it and every caller of both sends a bound.
**If you retire `parseOptionalPagination` in favour of `paginationSchema`'s default, that is
now a two-endpoint change rather than an unknown one** — which is the state it should have
been left in.

### The four re-derivations, 2026-09-17 — read these before the specs

Each was measured against the code with `file:line` evidence. The common failure across all four
specs is the same: they list already-built files as "new".

#### #310 — the AI narrative is a day, and the gate is already open

The single highest-value slice is **~1 day with no backend work, no subscription plumbing and no
new auth**: mobile can call `GET /api/insights` today and get a 200 with real Gemini output.

- `aiQuota.ts` returns `{allowed: true, isPro: true}` whenever `lemonSqueezyApiKey` is unset,
  which is the production state, and `GEMINI_API_KEY` **is** set on Railway.
- `requireAuth` reads `Authorization: Bearer` before the cookie — exactly and only what Expo
  sends.
- `grep -rn "X-Client-Platform" backend/src` returns nothing: no endpoint gates on platform.

So Expo gets the same cached `ai_insights` row the web generated. **Spec Task 5 — mirroring the
web's subscription gate — should be deleted, not sequenced**: it ports a gate that is inert in
production and would only ever start *hiding* the feature. Handling 403 `free_quota_exhausted`
and 503 as states replaces it, and that also moots the spec's open question about App Store IAP.

Two of its factual claims are now false: `mobile/src/core/api/health.ts` and `useWeight.ts` are
listed as new and both already exist and are complete; and "Expo has no speech dependency at all"
— `expo-speech-recognition` is in `package.json` and the hook exists.

Also live and consumed by neither client: `GET /api/insights/stats`, ungated and free.

#### #304 — not a whole screen

`EnergyScreen.tsx` already has the period selector, per-meal grouping with per-meal add, food
cards with edit and delete, macro totals, the sleep half and the delete confirmation. Its Task 3
(profile client + macro targets) shipped elsewhere — `useProfile` exists and `resolveDailyTargets`
is in `packages/shared/src/domain/targets.ts`.

**The one correctness item in it has already been fixed** (the per-day averaging, 2026-09-17 —
see Shipped). What remains is presentation: calorie and macro rings wired to targets that already
resolve, a per-period summary on the selector, collapsible date grouping on non-daily periods,
sleep on the same scroll with its own period, and a polish batch. **Zero backend work** — every
endpoint exists.

#### #313 — per-set logging is the real one

Its Task 5 (weight) is shipped: `mobile/src/hooks/useWeight.ts` and `core/api/health.ts` both
exist. Its Task 4 (voice) is roughly halved, because the backend already **parses and executes**:
`voiceExecuteOnServer` defaults on, so the web's client-side executor is a fallback for a
flag-off case, not a thing Expo needs. Minimum viable mobile voice is ~100–150 lines.

The genuine **L** is per-set reps/weight editing, per-set completion, add/remove set and the
debounced autosave. Worth knowing before starting: `mobile/src/features/body/mappers.ts` spreads
rather than enumerates, so `repsPerSet`/`weightPerSet`/`completedPerSet` **already round-trip
intact** — the wire is not the blocker, only the UI is.

Two live bugs it found on the way, neither of them in the spec: the workout form has no
validation, so an empty duration becomes `0`, fails the backend's `min(1)` and surfaces as a
generic toast; and `react-hook-form`, `@hookform/resolvers` and `zod` are all in
`mobile/package.json` with **zero imports** in `mobile/src`, while `workoutFormSchema` is already
shared.

#### #311 — three of its eight rows are already built

Water (#307) and speech (#321) are done; the food parser moved to `packages/shared` in #342 —
though note **`mobile/src` has no caller for it yet**, so the handoff's earlier "both clients use
it" was only half true.

Two traps neither the spec nor the web's own comments mention:

- **The web already shows users a raw error code.** `aiAccess.ts` returns
  `{error: 'free_quota_exhausted'}`, the shared transport puts that string into
  `ApiError.message`, and `FoodEntryModal` pipes it straight to the UI. Porting "as the web does"
  ships the same wart — branch on `status === 403`.
- **The web's bulk save does not chunk.** The batch schema caps `entries` at 50 and
  `BulkFoodEntryModal` posts the whole array, so more than 50 items is a 400. It also never sends
  `mealType`, so bulk rows land with `meal_type` null and get bucketed by hour.

And the barcode endpoint is weaker than both the spec and the web's own comment claim: it is one
`getByBarcode` read with a 404 on miss — **no Open Food Facts call and no caching anywhere in
`backend/src`**. The web's OFF direct fallback is what actually answers for most products, so a
mobile port relying on the backend endpoint alone would 404 on nearly everything.

### #311's spec is stale in three of its eight rows — check before building

It was written against `34a51d9` and opens with three greps proving absence. Two of the three
are no longer true, and the table's headline row is one of them:

| spec says | actually |
|---|---|
| `grep -ri water mobile/` → **0 hits**, "a whole screen with no counterpart", "the cheapest large win in the audit" | **#307 built it** — `useWater.ts`, `WaterCard.tsx`, 13 files. No dedicated screen yet, but the hook and the Home card exist. Building "water" from that spec means building it twice. |
| `grep -ri "voice\|speech" mobile/src` → **0 hits** | **#321 added `useSpeechRecognition`** (on-device, `expo-speech-recognition`). The transcript step the spec calls the only missing piece is done. |
| `grep -ri "barcode\|camera" mobile/src` → **0 hits** | Still true. |

What is genuinely left, and what it costs:

- **Voice food logging.** The pipeline after the transcript — parse, resolve each item through
  `/api/food/search` with `lookup-or-create` as fallback, review, `POST /api/food-entries/batch`
  — is real work, but its first piece is done: **the parser now lives in
  `packages/shared/src/domain/foodText.ts`** and both clients use it.
- **Barcode. Needs a decision, not an implementation.** `expo-camera` is a native module, and
  `mobile/CLAUDE.md` is explicit: a new native module means everyone rebuilds their dev client,
  and it must be flagged rather than added. That is an owner call.
- **Meal tools (bulk entry), copy day, recent foods, "look up with AI".** No native module, and
  every endpoint already exists. These are the clean remaining wins.

### #317 has no open PR — read this before assuming it is done

PR #317 **merged on 2026-09-16 and shipped four documentation files and nothing else.** The
settings-parity *implementation* — nine sections on the web against three on Expo, of which
two do nothing — has never been written and has no branch. Anyone who looks up "#317" will
find a merged PR and reasonably conclude the work shipped. It did not. The spec is at
`agent-os/specs/2026-09-14-1204-parity-settings-sections/`.

### Sequencing that matters

```
#308 ──► #312, #316      (both rewrite mobile/src/theme.ts; #308 has landed, so both are open)
#337 ──► #317-impl, #315 (all three touch SettingsScreen)
everything ──► #306      (renames every screen; rebase it last)
```

Resolved: `#319 ──► #299` (both merged), `#308` as a blocker, and `#312`/`#316` themselves,
which merged as #343 on 2026-09-17. Only the two rows above are still live.

---

## Needs the owner — cannot be done from an agent session

Re-checked against the code on 2026-09-16; every item below is still true. Items 7 and 8 were
added on 2026-09-17, found while auditing shared logic for drift between the clients.

1. **`RESEND_API_KEY` is unset in Railway.** `sendMail` is a no-op, so **password reset
   emails are never sent**. #309 built the page; the link still does not arrive. This is
   broken in production right now.
2. **The AI quota gate is bypassed in production.** `backend/src/services/aiQuota.ts:31-34`
   returns `{ allowed: true, remaining: -1, isPro: true }` whenever `config.lemonSqueezyApiKey`
   is unset — which it is, no payment provider is configured. The free tier is unenforced for
   **everyone** and Gemini spend is uncapped. Decide the gate.
3. **`eas login` and `eas init`**, then paste the printed `extra.eas.projectId` into
   `mobile/app.config.js` by hand, and `eas env:create` for `EXPO_PUBLIC_API_URL`. Still
   absent — `app.config.js:87-88` only spreads `config.extra` so that a value written by
   `eas init` survives; nothing has written one. Nothing in the Expo backlog can produce a
   build until this exists.
4. **Confirm `com.trackvibe.app` is unclaimed** on App Store Connect and the Play Console.
   That it is free was inferred from repo evidence; nobody queried Apple or Google.
5. **`backend/.env.example`** needs a note about the native origin. It documents
   `CORS_ORIGIN` and `FRONTEND_ORIGIN` and says nothing about the Expo client. `.env*` paths
   are permission-blocked for agent sessions.
6. **Every merged Expo change is visually unseen — and #343 makes this the most overdue item
   on the list.** #302, #303, #305 and #321 were test-verified only; #307 and #308 rewrote
   Home and all 33 colour roles; and #343 has now changed how *every* screen is shaped —
   22px corners with real shadows where cards were flat at 14 or 18, six font faces where two
   were loaded, and a 10px-larger footprint on every icon button.

   All of it is test-verified. **None of it has been seen running**, because no agent session
   here has a simulator, and the hazard list below says not to substitute eyeballed
   screenshots. Specifically worth a look, in this order:

   - 22px plus a shadow at ~390px, side by side with the web, on Home and Journal.
   - Shadows on Android, which uses `elevation` rather than the iOS shadow quartet —
     `shadowStyle()` in `packages/shared/src/tokens/spacing.ts` sets both, and only iOS has
     been reasoned about.
   - `MobileWorkoutCard`'s action row, the tightest place an icon button grew.
   - The six tab labels and every screen header, which now name a font for the first time —
     they go through React Navigation style props, so no `<Text>` guard ever covered them.

   If something here looks wrong, it is a small fix on top, not a revert: the primitives are
   one file each (`mobile/src/components/ui/`), and the numbers are tokens in
   `packages/shared/src/tokens/spacing.ts`.
7. **Imperial users are storing pounds in a kilograms field, and the server cannot find
   them.** Not a display bug, though it looks like one. `getWeightUnit`
   (`packages/shared/src/domain/units.ts`) relabels `kg` to `lbs` and **no conversion exists
   anywhere in the repo** — verified by grep, there is no `2.20462`, no `0.453592`, nothing.
   The same label sits above the weight *input* on both clients
   (`WorkoutModal.tsx:645,1285`, `ExerciseList.tsx:61`, `MobileWorkoutCard.tsx:38`), so an
   imperial user types a pound number into a field
   `agent-os/standards/global/domain-conventions.md` defines as kilograms, and it is stored
   raw. Every metric user's view, the MCP server and the AI paths then read those rows as
   kilograms.

   **#344 did the one half that was not a product call.** `user_profiles.units` now exists,
   both clients report the choice when the user changes it, and the column is nullable with
   no default on purpose: `NULL` means "this account has never told us", which is the honest
   state of every row today and exactly what a backfill has to be able to find. A default of
   `'metric'` would have asserted something nobody checked and erased that distinction.

   **What is left is yours.** Adding conversion re-interprets data that already exists — a
   stored `135` would start rendering as 297 lbs — and until users have actually touched the
   setting, the affected rows still cannot be identified. The options are roughly: convert
   going forward and accept that historical imperial rows are wrong; ask users once and
   migrate on their answer; or wait until enough accounts have reported `units` and migrate
   on that. All three are product calls; #344 is what makes the third one possible at all.

   The `2026-09-14-1204-parity-settings-sections` spec raised the relabelling as an open
   question and recommended "convert, via a shared helper, kg stays stored". That
   recommendation is right about the destination and does not account for the existing rows
   or for the setting never reaching the server.

   Mobile also has a smaller inconsistency inside this one: `WorkoutFormScreen.tsx:195`
   hardcodes `label="Weight (kg)"` while `MobileWorkoutCard` relabels to lbs, so on Expo the
   same number is captioned kg going in and lbs coming out.

8. **Food entries with no meal type all land in Breakfast, on both clients.** The domain
   standard says "entries **without** `mealType` fall back to time-based inference. Keep that
   fallback — old rows have no meal type." **That fallback cannot work and never has.**
   `food_entries.date` is a Postgres `DATE` with no time of day, and both clients' mappers
   turn it into a local midnight, so `entry.date.getHours()` is always `0` and
   `mealForHour(0)` is always Breakfast — `frontend/src/features/energy/mealType.ts` and
   `mobile/src/screens/EnergyScreen.tsx`, which copied the web including the flaw. Both
   comments described it as inferring from time.

   Only legacy rows are affected: `FoodEntryModal.tsx:434` has set `startTime` for a while, so
   anything logged recently has a real hour. But those are exactly the rows the standard names.

   **Why it is not fixed here.** There is no time to infer from, so the honest options are to
   bucket timeless rows as `snack` (the neutral one), to surface them separately, or to keep
   Breakfast and say so. All three change where a user's history appears, which is a product
   call. The code now states what it really does at both call sites, and
   `packages/shared/src/domain/__tests__/isOnLocalDay.test.ts` pins the mechanism so the next
   reader does not have to rediscover it.

9. ~~**`backend/mcp-server` has never been audited.**~~ **Done on 2026-09-17 — this is now
   an owner item only in the sense that you should know the result.** The audit had never been
   run because `security-audit` is a matrix of `[backend, frontend, mobile]` driven by
   `npm audit --workspace`, and this package is not a workspace.

   Measured: **7 advisories, 4 high, 0 critical** — not the 8/5 this file carried, which
   predated #341 and the three bumps after it. All seven are gone; `npm audit` now reports
   zero, and the audit runs in CI on every push, on the job that already installs the lockfile.

   The finding worth keeping is *where* they were. Five of the seven (`hono`,
   `@hono/node-server`, `path-to-regexp`, `qs`, `body-parser`) reach this package only through
   `server/streamableHttp.js` and `express` — the HTTP and SSE transports. `index.js:185`
   constructs a `StdioServerTransport` and nothing else, so none of that code is ever loaded.
   The other two are a different matter: `ajv` and its `fast-uri` dependency (the high one) are
   imported by `server/index.js`, the core `Server` class, which every transport goes through —
   it is what validates each tool call's arguments. So of the four "high" findings, exactly one
   was on a path this server actually executes.

   That is also the argument for keeping the number at zero rather than triaging each one: the
   next advisory is much easier to see against a zero than against a standing seven.

10. **The other three packages were measured too, and the only remaining fixes are majors.**
    The `security-audit` matrix runs `--audit-level=critical` with `continue-on-error`, so it
    is green today and would stay green through every one of these. That is by design; it also
    means the numbers below are not visible anywhere until someone runs the command.

    Measured 2026-09-17 on `main`, and the count is not the interesting part — **what is
    reachable from shipped code** is:

    | package | advisories | actually reachable |
    |---|---|---|
    | `backend` | 1 low | **Nothing.** The two `qs` moderates were on the production request path — `express` parses every query string through it — and they are fixed: `express` 4.22.2 → 4.22.3 drops both vulnerable nested copies onto the already-fixed root `qs@6.16.0`. Three lockfile entries. The remaining low is `esbuild`'s dev server. |
    | `frontend` | 1 high, 2 moderate, 1 low | **The two `react-router` moderates** (open redirect via a backslash in `<Link>`; constructor injection in `deserializeErrors`) — shipped code, and the fix is `react-router-dom@7`, a real migration. The **high is `sharp`**, a devDependency used by `scripts/generate-pwa-icons.mjs` and nothing else; it is not in the bundle, not in CI, and needs a major. |
    | `mobile` | 9 high, 11 moderate | **One moderate.** Only four packages carry their own advisory: `postcss` (4 highs) and `image-size` (2 highs) are reached through `@expo/metro-config` and `metro` — the bundler, which never ships in the binary; `uuid` comes through `xcode`, which generates the iOS project. The one that ships is `decode-uri-component`, via `query-string` via **`@react-navigation/core`** — a DoS on malformed URI decoding, so it needs an attacker-supplied URL to reach, i.e. a deep link. Every one of the nine highs rolls up to a single fix: `expo@57.0.23`, three SDK majors from the pinned `~54.0.37`. |

    **So: nothing here is both reachable and cheap.** The decisions are an Expo SDK
    upgrade, a React Router 7 migration, and a `sharp` major — three scheduled pieces of work,
    none of them a drive-by, and none of them urgent on this evidence. What was cheap
    (`express`/`qs`) is already done.

Production is Railway project `distinguished-elegance`, service **BMe**. Present:
`API_NINJAS_KEY`, `CORS_ORIGIN`, `DATABASE_URL`, `DB_SSL_REJECT_UNAUTHORIZED`,
`GEMINI_API_KEY`, `GEMINI_MODEL`, `GOOGLE_CLIENT_ID`, `JWT_*`, `NODE_ENV`, `RAILWAY_*`,
`REDIS_URL`. Absent: `FRONTEND_ORIGIN`, `RESEND_API_KEY`, and any payment provider key.

---

## What the 2026-09-17 batch actually contains

All four merged; the branches can be deleted. What is worth carrying forward is why each one
was split the way it was, and what each one did **not** do.

### #342 — correctness only, so it could not be held up by a simulator

Every change is test-verified and none of it changes how anything looks. That is the whole
reason it was split from #343 rather than shipped with it.

| Fix | What it was |
|---|---|
| `useWeight` bound | Read a user's entire weight history on every Home render, to draw seven bars. Critical rule 6. |
| `useCycle` bound + corrected | Same unbounded read, on an endpoint with no pagination at all — plus "Day 214 of ~28" with a full ring for a stale log, a DST off-by-one, and `YYYY-MM-DD` parsed as UTC midnight. |
| "Logged today" | `isSameDay(new Date(entry.date), today)` on a bare date string, so the weight tile was wrong for every user west of UTC. `isOnLocalDay` in shared compares the strings and builds no `Date` at all — which is what the Expo client had always done. |
| Food parser | Moved to `packages/shared` so Expo can reach it (it had **zero** tests across 148 lines of regex), then fixed: `"2 eggs for breakfast, chicken for lunch"` produced an item named `"eggs for breakfast"`, filed under lunch, and that string then went to `GET /api/food/search`. |

Two things found here are **not** fixed, because both change user-visible data and need a
product call — items 7 and 8 under "Needs the owner".

### What `npx expo export` says, and the six megabytes it found

Worth running before anyone reaches for a simulator, because it needs no device and it is the
only check here that exercises Metro end to end: `npx expo export --platform ios` resolves
every import, collects every asset, and compiles the app to a Hermes bundle. It passes.

It also weighs the result, which nothing else does. The app registers **six** font faces and
was shipping **thirty-six** — every Inter and Fraunces weight, italics included, **7.65 MB of
fonts against 1.52 MB used**. `@expo-google-fonts/inter/index.js` is a generated barrel that
`require()`s all eighteen weights, and Metro cannot tree-shake a `require` of an asset, so
naming six exports off the package root shipped the lot. Importing per weight
(`@expo-google-fonts/inter/400Regular`) took the export from **13 MB to 7.1 MB** with an
identical 4.3 MB JS bundle.

That predates #343 — the same barrel import was there when only two faces were loaded — so it
is not a regression from the design system, and nothing was ever going to catch it: it
typechecks, every test passes, the app renders correctly, and the only symptom is size.
`src/theme/__tests__/fontsImportPerWeight.test.ts` guards it now, scanning the **app root**
rather than `src/`, because `App.tsx` is where fonts are registered and sits outside it.

`npx expo-doctor` is 15/18. Two of the three failures are this sandbox's network (the config
schema and the React Native Directory check both need to reach out); the third is real but
deliberate — it objects to `metro.config.js` replacing `watchFolders` and setting
`disableHierarchicalLookup: true`, which is the monorepo setup Expo's own guide prescribes.
Worth knowing that `getDefaultConfig` now derives the workspace list by itself, so the
override is doing less than it looks.

### #343 — six guards, and nothing seen running

Six AST guards ship with it, each verified to fail against a mutant restoring the behaviour it
forbids. Keep that check up: one of them passed its first mutant run **for the wrong reason**
— the injection silently failed to match, which looks exactly like a passing test — and a
timezone assertion on #342 passed against the very implementation it was written to replace,
because the runner uses UTC and UTC is where that bug hides.

The visual result is unverified. That is owner item 6, with a list of what to look at first.

### #344 — the nullability is the design

`user_profiles.units` is nullable with no default, enforced in three places and mutant-verified
in two: the model maps a missing column to `undefined` rather than `'metric'`, the zod field is
`optional()` but deliberately **not** `nullable()` (a client may decline to answer, but may not
clear an answer already given), and the model patches only supplied fields, so a settings save
that says nothing about units cannot blank one.

Added to all three bootstrap paths per `backend/data-lifecycle` — the migration, `schema.ts`'s
`CREATE TABLE`, and `index.ts`'s dev column patches. The `CHECK` rides on `ADD COLUMN IF NOT
EXISTS` rather than a separate statement, because Postgres has no `ADD CONSTRAINT IF NOT EXISTS`.

### #345 — the token is read at replay time, not stored with the request

A queued mutation can sit for days and across a re-login, so a token captured at enqueue would
be stale exactly when it is used, and would put a second copy of a live credential in a second
store. `client.ts` registers a provider instead; `enqueue`'s `headers` parameter stays
deliberately unstored and now says so. Registered rather than imported because `client` already
imports `enqueue`, and a static cycle would bite at module-init time.

The replay policy is now a pure function — `ok`/409 → done, 401 → stop, everything else →
retry — which is what made 20 tests possible over code that had none.

**Not addressed, and flagged rather than decided:** `incrementRetries` silently deletes a
mutation after 5 failures with no signal to the user that their data was dropped.

---

## Hazards worth knowing before you start

**Tests that assert nothing.** Four shipped in this repo and are the reason several bugs
survived. **All four are now fixed** — checked on 2026-09-17, because a hazard list that
describes history as if it were current sends people hunting for problems that are gone:

| The test | Where it stands |
|---|---|
| A `className` assertion in jsdom, with no Tailwind, no `env()` and no layout engine | **Fixed.** `Base44Layout.test.tsx` now leads with `expect(bar).toContainElement(docked)` — the structural invariant, which jsdom *can* falsify — with the class checks as supporting detail. |
| A WCAG contrast assertion that **passed while the button rendered purple** | **Fixed.** `useAppTheme.test.tsx`'s helper throws on anything that is not `#rrggbb` instead of parsing it to `NaN`, and says why in its docstring. `NaN` made every comparison pass. |
| E2E route tests matching free text that appears in the sidebar on every page | **Fixed.** `navigation.spec.ts` asserts `toHaveURL` plus `getByRole('heading', { name })`, so a match has to be the page's own heading. |
| `expect(stroke).not.toBe('#e5e7eb')` against react-native-svg's `{type, payload}` normalisation | **Fixed.** `ProgressRing.test.tsx` has a `strokeHex` helper that decodes the payload back to `#rrggbb`, so the comparisons can fail. |

Two mechanical sweeps on the same date came back clean: **no test block in the repo lacks an
assertion** (counting `throw`, `.rejects`, and RNTL's throwing `findBy*` as assertions — the
first two passes of that scan produced only false positives for missing them), and none of the
27 negative assertions (`.not.toBe`/`.not.toContain`) is of the vacuous kind.

**So the list above is a record of a failure mode, not a backlog.** The failure mode is very
much live — two tests written on this branch had it, and both were caught only by mutation:
one "passed" because its mutation script silently failed to mutate anything, and a timezone
assertion passed against the exact implementation it was written to replace, because the
runner uses UTC and UTC is where that bug hides.

**Prove each new test fails when the fix is reverted.** It is the only cheap defence, and it
is the only reason those two were caught.

**Do not eyeball screenshots.** Three bugs were nearly filed off scaled simulator
screenshots — a wrong progress-bar count, duplicate voice buttons, duplicate headers — and
all three were disproved by querying the DOM. Verify programmatically.

**Never resolve a conflict with `git checkout --ours/--theirs`.** It takes the whole file and
silently drops the other side. It cost this project a working function once; Jest stayed
green because the function was only reachable through a typed hook boundary, and only `tsc`
caught it.

**Test flakes under parallel load are common.** With several agents running, load average hit
25+ on 8 cores and suites went 16s → 148s, producing phantom failures in a different file
each run. Re-run a failing file alone before believing it. Never "fix" a flake.

**Worktrees have no `node_modules`.** Module resolution walks up and finds the *main*
checkout's stale `packages/shared`, which produces a confusing wave of
`has no exported member` failures. Fix with
`ln -sfn ../../packages/shared node_modules/@trackvibe/shared` from the worktree root. That
is an environment fix, never a code change.

**`--include` globs fail in zsh** (`no matches found: --include=*.ts`). Filter with pipes.

---

## Machine-local leftovers that will not travel

Only relevant on the machine this was written on:

- `/tmp/claude-501/tv-ios-project` — the Capacitor iOS build. That shell is retired; safe to
  delete.
- An `e2e-mobile@localhost.test` user in the local dev database.
- The Railway CLI linked to project `distinguished-elegance`.
