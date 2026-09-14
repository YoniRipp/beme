# Plan — Allow the Capacitor WebView Origins Through CORS

Status: **not started**. **Hard-blocked on PR #296** — see Task 1.

## Verification of `shape.md` against the code (2026-09-14)

The finding is **valid**. The mechanism, the file, the line numbers and the proposed
origins all check out. Re-verified:

- `grep -rniE "capacitor://|ionic://|localhost:8100" backend/` → no matches. The backend has
  no notion of a native origin anywhere.
- `backend/src/config/index.ts:114-130` resolves `CORS_ORIGIN`, falls back to `true` in
  development when unset, and throws in production when unset or `true`.
- `backend/app.ts:67-69` — `{ origin: config.corsOrigin, credentials: true }`, nothing else.
- `frontend/capacitor.config.ts:18` — `androidScheme: 'https'`, so `https://localhost` is
  the correct Android WebView origin. No `iosScheme` is set, so iOS takes Capacitor's
  default and serves from `capacitor://localhost`, exactly as the WebKit trace says.

Four corrections, none of which change the fix:

1. **The comma-separated crash is not production-only.** `shape.md` and PR #296 both frame
   it around production; the development branch of the schema
   (`z.union([z.string(), z.boolean(), z.undefined()])`, `config/index.ts:57-59`) has no
   array member either. Measured in this worktree:

   ```
   NODE_ENV=development CORS_ORIGIN="http://localhost:5173,capacitor://localhost"
     → BOOT FAILED: corsOrigin: Invalid input
   NODE_ENV=production   CORS_ORIGIN="https://app.x.com,capacitor://localhost"
     → BOOT FAILED: corsOrigin: Expected string, received array
   ```

   This matters here because it means a developer cannot even *test* this fix locally until
   #296 lands.

2. **"echoed regardless of the request Origin" is the wrong word.** Nothing is echoed —
   `cors()` given a plain string emits that string as `Access-Control-Allow-Origin`
   unconditionally. The observation is right and the conclusion is right; the wording
   implies reflection, and reflection is precisely what *would* have made the app work.

3. **Drop `ionic://localhost`.** There is no older shell in the field. `frontend/android` is
   the only generated native project committed (53 tracked files) and it was generated
   against the current `capacitor.config.ts`; `frontend/ios` does not exist in the repo at
   all. Adding a fourth origin to a `credentials: true` allowlist for zero known clients is
   cost without benefit. `capacitor://localhost` (iOS) + `https://localhost` (Android) is
   the complete set.

4. **The `status 429` in the evidence is an artifact of the probe, not a second finding.**
   The auth limiter is 10 per 15 min (`backend/app.ts:30-33`). `cors()` is mounted at
   `app.ts:69`, ahead of the limiters at `app.ts:120-126`, so the `ACAO` capture is valid
   regardless — but that capture proves the *header*, not a failed login round-trip, and
   "no request appears to succeed" was measured against a rate-limited endpoint.

One thing `shape.md` does not say, and the acceptance criteria depend on: **the iOS
simulator run is not reproducible from this repo today.** There is no `frontend/ios`
project, and `@capacitor/cli` is `^7.5.0` against `@capacitor/core|ios|android ^8.1.0` —
the skew PR #293 is filed for. The shell must also be built with `VITE_API_URL` set;
without it, `frontend/src/core/api/client.ts:9-11` resolves `API_BASE` to
`window.location.origin`, i.e. `capacitor://localhost`, and the request never leaves the
WebView. Both are preconditions of the simulator acceptance criterion, not of the fix.

## The cookie question — settled before any code is written

**The httpOnly auth cookie cannot work from `capacitor://localhost`. The native shell must
run on the bearer token, and it already does.**

- `backend/src/controllers/auth.ts:12-20` sets the cookie `httpOnly`, `path: '/'`,
  `secure` in production, and **`sameSite: 'strict'`**. A document at
  `capacitor://localhost` calling `https://api.…` is cross-site by every definition, so a
  Strict cookie is never attached to that request. That alone is decisive.
- Two more independent blocks sit behind it: WKWebView applies full third-party cookie
  blocking by default, and `capacitor://` is a custom scheme whose cookie-jar semantics are
  not something to build a session on.
- Making the cookie work would mean `SameSite=None; Secure` — weakening the web app's CSRF
  posture for every browser user — and it would *still* be blocked by WKWebView. Not worth
  attempting. Do not change `COOKIE_OPTIONS`.

The bearer path already covers it, by design and with a comment saying so:

- `frontend/src/core/api/client.ts:59-66` mirrors the login token to
  `localStorage['trackvibe_token']` "because the cookie is dropped whenever the app and the
  API are not same-site — the Capacitor shell, and the cross-origin dev/cloud domains".
- `backend/src/middleware/auth.ts:16` reads `Authorization: Bearer` **in preference to**
  `req.cookies.token`.

So allowing the origin in CORS *is* sufficient for a working session — with two consequences
to record rather than fix here:

- The 401 cookie-retry at `client.ts:162-171` is dead weight on native. With no cookie, a
  stale token means the retry 401s too and the user is logged out. Correct behaviour, one
  wasted round-trip.
- `localStorage` is the only thing holding the session on iOS, and WebKit caps
  script-writable storage under ITP. Moving the token to Capacitor Preferences / Keychain is
  the durable answer. **Out of scope — file it separately.**

## Task 1 — Land PR #296 first (not this branch's work)

- [ ] PR #296 / `agent-os/specs/2026-09-14-1020-cors-origin-list-schema` teaches the Zod
      schema at `backend/src/config/index.ts:57-59` the array branch the parser at
      `:116-124` already produces
- [ ] **Nothing in Tasks 2-6 can land before it**, and this is stronger than `shape.md`
      implies: the design below turns `config.corsOrigin` into an array even when the
      operator sets a single origin, so the schema rejects it on *every* deployment, in dev
      and in production alike
- [ ] Do not fix #296 from this branch. Rebase on it once merged.

## Task 2 — Resolve the native origins in one place

- [ ] New `backend/src/config/corsOrigins.ts` — a pure module, no env reads, no imports from
      `config/index.ts`:

      export const NATIVE_APP_ORIGINS = ['capacitor://localhost', 'https://localhost'] as const;
      export function resolveCorsOrigins(
        configured: string | string[] | boolean,
        options: { allowNative: boolean },
      ): string | string[] | boolean;

- [ ] Behaviour: when `configured` is `true` (the dev reflect-any fallback) or `false`,
      return it unchanged — the native origins are already covered. When it is a string or
      an array, return the union of it and `NATIVE_APP_ORIGINS`, de-duplicated, order
      preserved, trailing slashes already stripped upstream.
- [ ] The origins are **constants of the Capacitor runtime, not deployment config.** They do
      not vary by environment, and an operator who forgets them ships a native app that
      cannot reach the API at all. That is why they are a constant appended in code rather
      than a line every operator has to remember in `CORS_ORIGIN`.
- [ ] `backend/src/config/index.ts` — call it where `CORS_ORIGIN` is built (`:116-124`),
      after the existing trim / trailing-slash cleanup and **before** the production guards
      at `:126-130`, so `CORS_ORIGIN=true` in production still throws.
- [ ] Escape hatch: `ALLOW_NATIVE_ORIGINS` on the same env-parsing pattern as
      `COMPACTION_ENABLED` (`config/index.ts:174`) — enabled unless set to `false` / `0`.
      A deployment that ships no native shell can close the allowlist back down.
- [ ] `backend/app.ts` and `backend/src/lib/createStandaloneService.ts:26` **change not at
      all** — both already read `config.corsOrigin`, so the extracted Body/Energy/Goals
      services inherit the fix for free. Verify that stays true rather than adding a second
      allowlist.

## Task 3 — Keep the credentialed setup exactly as strict as it is

- [ ] `credentials: true` stays. Do not touch it — `frontend/src/core/api/client.ts:141`
      sends `credentials: 'include'` on every request, and a fetch with `include` rejects
      any response whose `Access-Control-Allow-Origin` is `*`. `*` is therefore not merely
      unsafe here, it is non-functional.
- [ ] **Never reflect the request origin.** No `origin: (origin, cb) => cb(null, true)`, no
      regex, no `.endsWith()` suffix match. A fixed array only — `cors` compares by exact
      string, which is the property that makes this safe.
- [ ] Write down why `https://localhost` is acceptable on a credentialed allowlist, since it
      is the one entry a reviewer will stop at: it is also reachable by an ordinary desktop
      browser page served from `https://localhost`. The exposure is bounded because
      (a) the auth cookie is `SameSite=Strict`, so such a page cannot borrow a logged-in
      user's session, and (b) the bearer token lives in `localStorage` partitioned to the
      app's own origin, unreadable from any other. Requests it *can* make unauthenticated
      it could already make server-side, where CORS is irrelevant.
- [ ] The `X-Client-Platform` header (`client.ts:119`) makes every request preflighted.
      `cors()`'s default `allowedHeaders` reflects `Access-Control-Request-Headers`, so no
      extra configuration — confirm the OPTIONS response carries the native origin, don't
      assume it.
- [ ] No API shapes change. No route, controller, service or model is touched, so
      `backend/api-layers` and `backend/routes` are satisfied by not applying. The MCP
      server at `backend/mcp-server/` is unaffected — it authenticates with a shared secret
      over a non-browser client and never sends an `Origin`.

## Task 4 — Tests

- [ ] `backend/src/config/corsOrigins.test.ts` — unit tests on the pure resolver. This is
      the test that satisfies "a future allowlist edit cannot silently drop it": assert
      `capacitor://localhost` **and** `https://localhost` are present for a single-string
      input, for an array input, and after de-duplication when an operator has already
      listed one of them by hand; assert `true` and `false` pass through untouched; assert
      `allowNative: false` returns the configured value verbatim.
- [ ] `backend/src/middleware/cors.test.ts` — supertest against a small express app wired
      with the same `cors(...)` options, asserting `access-control-allow-origin:
      capacitor://localhost` plus `access-control-allow-credentials: true` on both a
      preflight `OPTIONS` and the real request, and **no** `ACAO` header for
      `https://evil.example`.
- [ ] Both files must live under `backend/src/` — `backend/vitest.config.ts` includes
      `src/**/*.test.ts` only, so a test at `backend/app.test.ts` silently never runs.
- [ ] `config/index.ts` validates env at import time and throws without `PORT`
      (`backend/CLAUDE.md`). Any test that wants the *real* config must set `process.env`,
      then `vi.resetModules()` and `await import('../config/index.js')`. Prefer testing the
      pure resolver and keep the config module mocked, per the existing convention.

## Task 5 — Documentation

- [ ] `backend/.env.example:26` — a comment above `CORS_ORIGIN` stating that
      `capacitor://localhost` and `https://localhost` are added automatically for the
      Capacitor shells, that `ALLOW_NATIVE_ORIGINS=false` opts out, and that the value
      accepts a comma-separated list (true only once #296 lands).
- [ ] `backend/.env.example` — add `ALLOW_NATIVE_ORIGINS` next to it, commented, defaulting
      to enabled.
- [ ] `backend/README.md:1162` — the deployment env list mentions `CORS_ORIGIN`; add the
      native-origin note there so an operator reading only the README is not surprised.
- [ ] `frontend/README.md` — one line under the `VITE_API_URL` row: a Capacitor build
      **must** set it, because `API_BASE` otherwise falls back to `window.location.origin`,
      which in the shell is `capacitor://localhost`.
- [ ] `docker-compose.yml:8` and `backend/docker-compose.yml:29` — leave the values alone;
      the native origins now come from the constant.

## Task 6 — Verification

- [ ] `cd backend && npx tsc --noEmit` — clean. Watch the `config.corsOrigin` inferred type:
      it is `string | boolean | undefined` today and becomes `string | string[] | boolean |
      undefined` after #296, which both `app.ts:68` and `createStandaloneService.ts:26` pass
      straight into `cors()` — the `cors` types accept it, but confirm rather than assume.
- [ ] `cd backend && npx vitest run` — full suite green, plus the new files.
- [ ] Boot with `CORS_ORIGIN=http://localhost:5173` and confirm the "CORS configured" log
      line (`app.ts:70`) now shows all three origins.
- [ ] `curl -i -X OPTIONS -H 'Origin: capacitor://localhost' -H
      'Access-Control-Request-Method: POST' -H 'Access-Control-Request-Headers:
      content-type,authorization,x-client-platform' http://localhost:3000/api/auth/login`
      → `204` with the native `ACAO` and `Access-Control-Allow-Credentials: true`.
- [ ] Same with `Origin: https://evil.example` → no `ACAO` header.
- [ ] Sign in from the iOS simulator. **Gated on PR #293** (the CLI/core version skew) and
      on a build with `VITE_API_URL` pointing at the host machine. Confirm the login
      succeeds *and* that a relaunch stays signed in — the second half is what proves the
      bearer token, not the cookie, is carrying the session.
- [ ] Sign in from the Android shell in `frontend/android` and confirm `https://localhost`
      is honoured too.

## Deliberately not done

- **`ionic://localhost` is not added.** No shell in the field uses it; see correction 3.
- **`COOKIE_OPTIONS` is not touched.** Relaxing `sameSite` to `'none'` would weaken every
  browser session's CSRF posture and would still not produce a working cookie inside
  WKWebView. The bearer token is the answer and it already works.
- **The 401 cookie-retry in `client.ts:162-171` stays.** It is inert on native and correct
  on web; removing it would be a regression for the web client for no native gain.
- **Token storage is not moved off `localStorage`.** Capacitor Preferences / Keychain is the
  right home for it on iOS, but that is a frontend change with its own migration story.
  File it separately.
- **No origin reflection, no wildcard, no suffix matching.** A fixed array, exact-matched.
- **PR #296 is not fixed here**, even though this work cannot boot without it.
