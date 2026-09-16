# Handoff — native client parity and App Store readiness

**Written 2026-09-14. Last verified 2026-09-16 against `main` at `2b3a114`.**

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

### Carried out of #307, and now fixed

`frontend/src/hooks/useWeight.ts` called `weightApi.list()` with no arguments, so the web
read a user's entire weight history to draw a seven-bar sparkline — **critical rule 6**. The
endpoint had always accepted the bound; the client never sent it.

Fixed on `claude/dazzling-fermi-vf1cv3`. The bound is a LIMIT rather than a date window
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
`claude/appstore-account-deletion` → `491baf0` (the `862455d` in the previous version of this
file is stale). 28 files, all application code, no spec docs. **Two commits behind `main`
and it merges clean** — verified with `git merge-tree`, zero conflicts.

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

Two review rounds have run and both paid for themselves. Round 1 fixed nine findings and
rejected one with reasoning. **Round 2 found a SQL bug that broke deletion outright**, plus
four more, and rejected one. It was starting round 3 when it stopped.

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
code. They are also all **56–58 commits behind `main`**, and four of the PRs they were
written against have merged since, so re-read each spec against the code before building on
it. That is the mistake this file opens by warning about.

| PR | Scope |
|---|---|
| #312 · radii, elevation, primitives | Small. **#308 has merged, so this is unblocked.** Same file as #316. |
| #316 · typography | Small. **#308 has merged, so this is unblocked.** Same file as #312. |
| #315 · first-run and profile | Scope shrank once #302 added a profile client. Conflicts with #337. |
| #311 · voice, barcode, water, meal tools, copy day | Depends on #321's speech foundation, which is merged. |
| #304 · food Journal screen | A whole screen. |
| #313 · workout recording | A whole screen — editor, exercise picker, voice, weight. |
| #310 · Insights AI | Expo already has the charts; it is missing the AI half. **1.5–2 engineer-weeks.** |
| #320 · rest of App Store readiness | Privacy policy reachable in-app, nutrition labels, `PrivacyInfo.xcprivacy`, metadata and age rating, guideline 4.2. Account deletion split out as #337. |
| #306 · tab set, destinations, screen names | **Last, and alone.** It renames every tab and screen title, so it conflicts with every other Expo PR here. |

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

Resolved since the last version: `#319 ──► #299` (both merged) and `#308` as a blocker.

---

## Needs the owner — cannot be done from an agent session

Re-checked against the code on 2026-09-16; every item below is still true.

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
6. **Every merged Expo change is visually unseen — and this is now due.** #302, #303, #305
   and #321 were test-verified only. The previous version of this file said to wait for #307
   and #308 to land, since they rewrite Home and all 33 colour roles. **Both have landed.**
   Nothing is blocking a look at the simulator now.
7. **`backend/mcp-server` has never been audited.** The `security-audit` job in
   `.github/workflows/ci.yml:176-181` runs a matrix of `[backend, frontend, mobile]` — the
   MCP server is not in it, and it is not a workspace, so no other job reaches it either.
   #341 and the three dependency bumps that followed will have moved the numbers; the 8
   vulnerabilities / 5 high figure predates them and has not been re-measured. Re-run the
   audit before deciding anything. #339's smoke test makes the result verifiable.

Production is Railway project `distinguished-elegance`, service **BMe**. Present:
`API_NINJAS_KEY`, `CORS_ORIGIN`, `DATABASE_URL`, `DB_SSL_REJECT_UNAUTHORIZED`,
`GEMINI_API_KEY`, `GEMINI_MODEL`, `GOOGLE_CLIENT_ID`, `JWT_*`, `NODE_ENV`, `RAILWAY_*`,
`REDIS_URL`. Absent: `FRONTEND_ORIGIN`, `RESEND_API_KEY`, and any payment provider key.

---

## Hazards worth knowing before you start

**Tests that assert nothing.** Four shipped in this repo, and they are the reason several
bugs survived:

- A `className` assertion in jsdom, with no Tailwind, no `env()` and no layout engine.
- A WCAG contrast assertion that **passed while the button rendered purple**, because it
  measured `colors.primary`/`primaryForeground` while Paper's `Button` reads
  `paperTheme.colors.onPrimary`.
- E2E route tests matching free text ("Workouts", "Goals", "Insights") that appears in the
  **sidebar on every page** — three of five passed against the wrong page.
- `expect(stroke).not.toBe('#e5e7eb')` against react-native-svg, which normalises a colour
  prop to `{type: 0, payload: <ARGB int>}` — so it passes against every possible value.

**Prove each new test fails when the fix is reverted.** It is the only cheap defence.

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
