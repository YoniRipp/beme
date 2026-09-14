# Plan — `CORS_ORIGIN` list: make the schema describe the parser

Status: **implemented** (PR #296). Review pass of 2026-09-14 re-verified the finding against
the code on `main` and widened it by one sibling bug. `shape.md` is accurate; two of its
details are sharpened below. Three things this plan got slightly wrong were found while
implementing — see *Corrections found during implementation* at the foot of this file.

## Dependency direction

**This task blocks PR #295** (`claude/ios-sweep-cors-capacitor-origin`,
`agent-os/specs/2026-09-14-1015-cors-capacitor-origin/shape.md`). That task's fix is to
allow `capacitor://localhost` *alongside* the web origin — which is by definition more than
one origin, and today more than one origin will not boot. Its own shape.md says so: "This
depends on the companion task about multi-origin `CORS_ORIGIN`."

Land this first. #295 then becomes a one-line allowlist edit plus docs.

## Verification performed (2026-09-14)

Every claim below was reproduced by importing the real `backend/src/config/index.ts`, not
inferred from reading.

| Case | Result |
|---|---|
| dev, `CORS_ORIGIN=capacitor://localhost` | boots, `corsOrigin` is the string |
| dev, `CORS_ORIGIN=capacitor://localhost,http://localhost:5173` | **`Error: corsOrigin: Invalid input`** at `index.ts:191` |
| dev, unset | boots, `corsOrigin === true` (boolean) |
| dev, `CORS_ORIGIN=true` | boots, `corsOrigin === 'true'` (**string**, not boolean) |
| prod, comma list | **`Error: corsOrigin: Expected string, received array`** at `index.ts:191` |
| prod, `CORS_ORIGIN=true` | throws at `index.ts:127` — guard intact |
| prod, `CORS_ORIGIN=` (empty) | throws at `index.ts:130` — guard intact |
| prod, unset | throws at `index.ts:130` — guard intact |

Corrections to `shape.md`:

1. The production failure message is **`corsOrigin: Expected string, received array`**, not
   `Invalid input`. shape.md is right that production also fails, but a test asserting on
   the message needs the production string.
2. shape.md's fix uses `z.array(z.string().min(1)).nonempty()`. That works, but
   `.nonempty()` widens the exported type to
   `string | boolean | string[] | [string, ...string[]] | undefined` — a redundant tuple
   member. `z.array(z.string().min(1)).min(1)` is the same runtime check and yields
   `string | boolean | string[] | undefined`. Prefer `.min(1)`.

Everything else in shape.md — the line numbers, the schema quote, the parser quote, the
claim that `cors()` always accepted arrays — checks out.

## Task 1 — Save spec documentation

- [x] `shape.md` — the finding, as filed from the iOS sweep
- [x] `plan.md` — this file
- [x] `standards.md` — which standards apply and the rules they impose here
- [x] Update `shape.md`'s fix block with the two corrections above once the fix lands

## Task 2 — Let the schema describe what the parser produces

`backend/src/config/index.ts:57-59`. Neither arm has an array branch — confirmed in both:

- [x] Production arm accepts a non-empty string **or** a non-empty array of non-empty
      strings: `z.union([z.string().min(1), z.array(z.string().min(1)).min(1)])`
- [x] Development arm gains the same array member alongside its existing string / boolean /
      undefined members
- [x] Keep the custom production message (`CORS_ORIGIN must be set to an explicit origin in
      production`) reachable — a bare `z.union` reports `Invalid input`, which is exactly the
      unhelpful message this bug produces today. Attach the message via the union's
      `errorMap` or a `.refine()` so an operator who sets garbage still gets told the env var
      name.
- [x] No change at either `cors()` call site. `@types/cors` declares
      `StaticOrigin = boolean | string | RegExp | Array<boolean | string | RegExp>` and
      `CorsOptions['origin']` includes `undefined`, so the widened type is already
      assignable at `backend/app.ts:68` and
      `backend/src/lib/createStandaloneService.ts:26`. Verified with a throwaway type probe.

## Task 3 — Don't let empty segments through

`backend/src/config/index.ts:119-121` splits on `,` with no filtering:

```
CORS_ORIGIN="https://a.example.com, ,https://b.example.com,"
  -> ["https://a.example.com", "", "https://b.example.com", ""]
```

- [x] `.filter(Boolean)` after the `.map()` in the split branch, so a trailing comma or a
      stray space cannot put an empty-string origin into the allowlist
- [x] Without this, Task 2's production arm turns a trailing comma into a **new** boot
      crash (`corsOrigin: String must contain at least 1 character`) — a fail-fast on
      something the operator meant harmlessly. Filter first, then the `.min(1)` per element
      only ever fires on genuinely broken input.

## Task 4 — Sibling: `frontendOrigin` is contaminated by the list

`backend/src/config/index.ts:115`:

```ts
const FRONTEND_ORIGIN = (process.env.FRONTEND_ORIGIN?.trim().replace(/\/+$/, '')) || rawCorsOrigin;
```

`rawCorsOrigin` is the **raw, unsplit** string. When `FRONTEND_ORIGIN` is unset — which
`docs/RUNNING-RAILWAY.md:42` treats as optional and `docker-compose.yml:28` omits entirely —
a comma list lands in `frontendOrigin` whole. Reproduced:

```
CORS_ORIGIN="https://app.example.com/,https://staging.example.com/"
  -> frontendOrigin = "https://app.example.com/,https://staging.example.com"
  -> redirect        = "https://app.example.com/,https://staging.example.com/auth/callback?code=abc"
```

Note the interior `/` survives too: `:114` strips the trailing slash of the *whole* string,
so only the last origin gets normalised.

This is **not** a schema mismatch — the value is a string, so Zod accepts it and the process
boots. That is what makes it worse than the `corsOrigin` bug: fixing Task 2 alone converts a
loud boot crash into a silent broken-redirect in exactly the deployments that motivated the
list. It must ship in the same change.

Consumers that would build a malformed URL:

- [x] `backend/src/controllers/auth.ts:95,99,102` — Twitter OAuth callback and error redirects
- [x] `backend/src/routes/subscription.ts:21-23` — LemonSqueezy success / cancel URLs
- [x] `backend/src/services/auth.ts:534` — password-reset base URL
- [x] `backend/src/config/vapid.ts:11` — `mailto:admin@<origin>` VAPID subject

Fix:

- [x] Derive `frontendOrigin` from the **first** parsed origin, not the raw string:
      explicit `FRONTEND_ORIGIN` wins, else `originList[0]`, else the existing fallback
- [x] Mind the declaration order — `FRONTEND_ORIGIN` (`:115`) is read by the `CORS_ORIGIN`
      IIFE's production fallback (`:124`), so the list cannot simply be computed after it.
      Split into three steps: parse the raw env into `string[] | undefined` first, then
      `FRONTEND_ORIGIN` from that list, then `CORS_ORIGIN`. A naive reorder creates a TDZ
      error.
- [x] Preserve today's single-origin shape: one origin must still yield a **string**, not a
      one-element array. `config.corsOrigin` is logged at `backend/app.ts:70` and read by two
      `cors()` call sites; changing the single-origin case is an unnecessary behaviour change
      under `global/critical-rules` #1.

## Task 5 — Production guards stay as they are

`backend/src/config/index.ts:126-131`. Both guards are plain `throw new Error` at module
scope and run at **:126 / :129, before `safeParse` at :188**. They cannot be weakened by a
schema change — confirmed by reading and by the two production runs in the table above.

- [x] Leave `:126-131` untouched
- [x] Re-run both production negative cases after the change (tests below) to prove it
- [x] Do **not** try to move these into the schema. They fire before `port` and `jwtSecret`
      are validated and they name the env var the operator actually set — the same reasoning
      the `resolveSessionTtlMs` comment at `:26-29` already records for `SESSION_TTL_DAYS`.
- [x] Known, accepted gap: a list *containing* `'true'` (`CORS_ORIGIN=true,https://a.com`)
      slips past the `:126` guard, which only compares against the scalar. Not a hole —
      `cors()` treats `'true'` as a literal origin that no browser will ever send, so it
      fails closed rather than open. Leave it; note it, don't grow the guard.

## Task 6 — Tests

Placement, per `global/testing` (co-locate: `index.ts` → `index.test.ts`) and per
`backend/vitest.config.ts`, whose `include: ['src/**/*.test.ts']` means **anything outside
`src/` is not collected** — a root-level `backend/app.test.ts` would silently never run.

New file: **`backend/src/config/index.test.ts`**

Harness constraints this file has to respect:

- [x] The module validates at **import time** (`backend/CLAUDE.md` calls this out), so each
      case needs `vi.resetModules()`, `process.env` set, then `await import('./index.js')`.
      Restore `process.env` in `afterEach`.
- [x] Set `PORT` in every case or `port` fails first and masks the assertion.
- [x] `vi.mock('dotenv')` to a no-op. `:16-18` loads `backend/.env` and `.env.${NODE_ENV}`;
      dotenv does not override already-set vars, but for the *unset* cases a developer's
      local `.env` would inject a `CORS_ORIGIN` and make the test pass or fail by accident.
- [x] Mock `../lib/logger.js` to keep the `JWT_SECRET` dev warning out of the output.

Development arm (`NODE_ENV` left at vitest's `test`):

- [x] single origin → `corsOrigin === 'capacitor://localhost'` (string, **not** a 1-element array)
- [x] comma list → `corsOrigin` deep-equals `['capacitor://localhost', 'http://localhost:5173']`
- [x] comma list with spaces and trailing slashes → each element trimmed and slash-stripped
- [x] comma list with empty segments (`'https://a.example.com, ,https://b.example.com,'`) →
      no empty strings in the result (Task 3)
- [x] `CORS_ORIGIN=true` → `corsOrigin === 'true'`, the **string**. Today's parser does not
      coerce it; lock that in so the schema's boolean member isn't mistaken for this case.
- [x] unset → `corsOrigin === true`, the **boolean** — this is what the boolean member is for
- [x] comma list, `FRONTEND_ORIGIN` unset → `frontendOrigin === 'https://app.example.com'`,
      the first origin, not the joined string (Task 4)
- [x] comma list, `FRONTEND_ORIGIN` set → the explicit value still wins

Production arm (`NODE_ENV=production`, `JWT_SECRET` set):

- [x] single origin → boots, `corsOrigin` is the string
- [x] comma list → **boots**, `corsOrigin` is the array. This is the regression test; it
      fails today with `corsOrigin: Expected string, received array`.
- [x] `CORS_ORIGIN=true` → rejects with `CORS_ORIGIN must be an explicit origin in
      production, not true`
- [x] `CORS_ORIGIN=` (empty string) → rejects with `CORS_ORIGIN must be explicitly set in
      production for security.`
- [x] unset → rejects with the same `must be explicitly set` message

Middleware behaviour — shape.md's acceptance criterion "each origin in the list is actually
honoured by `cors()`". Same file, own `describe` block, using `supertest` (already a backend
dev dependency, see `backend/src/routes/auth.test.ts`):

- [x] mount `cors({ origin: ['https://a.example.com', 'https://b.example.com'], credentials: true })`
      and assert `access-control-allow-origin` echoes **each** configured origin
- [x] assert a third origin gets **no** `access-control-allow-origin` header
- [x] assert `access-control-allow-credentials: true` on the allowed ones — a wildcard would
      break credentialed requests, and that is the property the allowlist exists to protect

## Task 7 — Documentation

- [ ] `backend/.env.example:26` — document the comma syntax next to `CORS_ORIGIN`, and say
      that `FRONTEND_ORIGIN` defaults to the first entry. **Not done**: `.env*` is outside the
      agent's write permissions. Left for a human; the two deployment docs below cover the
      same ground.
- [x] `docs/RUNNING-RAILWAY.md:33,42` and `docs/RUNNING-AWS.md:44` — the `CORS_ORIGIN` rows
      should mention that a list is allowed; the Railway table currently says `FRONTEND_ORIGIN`
      is "Same as `CORS_ORIGIN`", which stops being true once `CORS_ORIGIN` is a list
- [x] Leave `docker-compose.yml:28` and `backend/docker-compose.yml:29` on their single
      origin — no behaviour change needed there

## Verification

- [x] `cd backend && npx tsc --noEmit` — clean
- [x] `cd backend && npx vitest run` — existing suite still green, new config tests pass
- [x] Boot the backend by hand for the eight rows in the verification table and confirm each
      now matches the intended column
- [ ] Rebase PR #295 on this and confirm its Capacitor allowlist boots — separate PR, not
      done here

## Out of scope — filed, not fixed here

Found while auditing the rest of the schema. Real, reproducible, and deliberately **not**
part of this PR, which should stay a one-field fix:

- **Empty-string env vars crash boot on refined fields.** `BODY_SERVICE_URL=` /
  `EVENT_QUEUE_URL=` reach `z.string().url().optional()` as `''` — a string, so `.optional()`
  never engages and boot dies with `eventQueueUrl: Invalid url`. Same shape for
  `COMPACTION_AGE_MONTHS=` → `compactionAgeMonths: Number must be greater than or equal to 1`.
  Both reproduced. A single `emptyToUndefined` preprocessor over the optional fields would
  cover the whole class. Different bug, different PR.
- **`eventTransport`, `separateWorkers`, `voiceStreaming`, `voiceExecuteOnServer`,
  `skipSchemaInit`, `compactionEnabled` are declared `.optional()` but the parser never
  produces `undefined`** (`:156`, `:167-171`). Harmless at runtime, but call sites carry an
  `undefined` that cannot happen. Tidy-up, not a bug.
- **`port` reports as `port: ...`, not `PORT`.** `Number(undefined)` is `NaN`, so an unset
  `PORT` fails as `port: Expected number, received nan` — the field name the operator never
  typed. This is precisely the complaint `:26-29` already fixes for `SESSION_TTL_DAYS`; the
  same treatment would suit `PORT`.

## Corrections found during implementation

Three details this plan asserted turned out to be wrong. Recorded so the next reader trusts
the file rather than re-deriving them.

1. **The vitest config is `backend/vitest.config.js`, not `.ts`.** The `include:
   ['src/**/*.test.ts']` claim is correct, and so is the conclusion — a test outside `src/`
   is never collected.
2. **Production with `CORS_ORIGIN` unset throws at `:127`, not `:130`.** With nothing set,
   the parser falls through to `true`, so the *first* guard catches it and the message is
   `CORS_ORIGIN must be an explicit origin in production, not true` — not `must be
   explicitly set`. Task 6's bullet claiming otherwise was wrong; the test asserts the real
   message. `:130` is still reachable: it is what fires for `CORS_ORIGIN=` (empty), and for
   an unset/empty `CORS_ORIGIN` when `FRONTEND_ORIGIN` is set.
3. **A union `errorMap` alone does not guarantee a message naming `CORS_ORIGIN`.** When a
   failed `.min()` *inside* a union member makes that member "dirty" rather than invalid,
   Zod surfaces the member's own issue at `corsOrigin.<index>` and never consults the
   union's `errorMap`. Observed as `corsOrigin.2: String must contain at least 1
   character(s)`. Both are covered now: the `errorMap` for a value matching no member, plus
   a message on each inner check.

One behaviour trap the plan did not predict, worth keeping in mind for any future edit here:
deriving `FRONTEND_ORIGIN` from the parsed list changes it from `''` to `undefined` when
`CORS_ORIGIN=` is empty, which silently moved the empty-string case from the `:130` guard to
the `:127` guard. The parser's production fallback therefore hands the guards the same value
the pre-list code did, so each still fails by the name the operator typed. Both are asserted
in `src/config/index.test.ts`.

A `CORS_ORIGIN` of separators only (`,`) now reaches neither guard and is rejected by the
schema instead, with a message that names `CORS_ORIGIN`. Before this change it crashed with
`Expected string, received array`. Still fail-closed, still legible.
