# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/critical-rules` | The whole task is bug-fixing a working product; the single-origin path must come out behaviourally identical |
| `global/testing` | The regression tests are the deliverable — co-location and the vitest include glob decide where they go |
| `backend/errors` | The config module's failure mode: what may throw, and where |
| `backend/api-layers` | Mostly a boundary check — this change must not leak past the config module |

`backend/response-format`, `backend/models`, `backend/events` and `backend/routes` do **not**
apply: nothing here returns an HTTP response, touches SQL, mutates domain state, or adds a
route. Named only so the omission is deliberate.

## The specific rules that constrain this work

### `global/critical-rules`

- **"Never break existing functionality."** The bug is that a *documented* input crashes the
  process; the fix must not change the shape of any input that works today. Concretely: one
  origin still resolves to a **string**, an unset `CORS_ORIGIN` in development still resolves
  to the boolean `true`, and `CORS_ORIGIN=true` in development still resolves to the string
  `'true'`. All three are asserted in Task 6 of `plan.md`.
- **"Don't rewrite backend logic unless the task genuinely requires it."** The parser at
  `backend/src/config/index.ts:113-125` gets a `.filter(Boolean)` and a reordering forced by
  the `frontendOrigin` fix — not a rewrite. The production guards at `:126-131` are not
  touched at all.
- **"Don't change API shapes."** `config.corsOrigin`'s exported type widens from
  `string | boolean | undefined` to `string | string[] | boolean | undefined`. That is a
  widening, so every existing consumer still typechecks — verified against
  `@types/cors`' `CorsOptions['origin']` at `backend/app.ts:68` and
  `backend/src/lib/createStandaloneService.ts:26`. Prefer `z.array(...).min(1)` over
  `.nonempty()` so the union does not also carry a `[string, ...string[]]` tuple that no
  caller wants.

### `global/testing`

- **"Unit tests co-locate with the file under test: `auth.ts` → `auth.test.ts`. Not in a
  `__tests__/` folder."** So the tests go in **`backend/src/config/index.test.ts`**, next to
  the module they cover.
- Reinforced by `backend/vitest.config.ts`, whose `include: ['src/**/*.test.ts']` means a
  test outside `src/` is never collected. This is why the `cors()` middleware assertions
  belong in `src/config/index.test.ts` rather than a new root-level `backend/app.test.ts`,
  which would sit silently un-run.
- **"Backend layers are tested at their own level."** Config is validated at import time, so
  its level is the module boundary: set `process.env`, `vi.resetModules()`, dynamic
  `await import('./index.js')`, assert on the exported value or on the throw. No booting the
  Express app to test a config field.
- **"`npm run lint` is `tsc --noEmit` — a type error is a lint failure. Run it in whichever
  package you touched."** Only `backend/` changes here, so `cd backend && npx tsc --noEmit`.
- **Run the backend suite as `npm run test:backend`** from the root, or `npx vitest run`
  inside `backend/`.

### `backend/errors`

- The standard's subject is the *request path*: typed errors from `errors.js`, converted to
  HTTP by `errorHandler`, and **"never `res.status(...)` an error inside a service."** None of
  that applies to config, which fails before any request exists.
- The rule that carries over is the one behind it: **failures must be legible at the layer
  that owns them.** A boot failure's audience is the operator reading a container log, so a
  plain `throw new Error` naming the environment variable is correct — which is exactly what
  `:127` and `:130` already do, and why they stay outside the Zod schema.
- This is also the argument against a bare `z.union` for the production arm. A union with no
  `errorMap` reports `Invalid input` — the message that made this bug hard to read in the
  first place. Whatever replaces `z.string().min(1, 'CORS_ORIGIN must be set to an explicit
  origin in production')` must keep a message that names `CORS_ORIGIN`.
- Do **not** introduce `ValidationError` or any other class from `errors.ts` here. Those map
  to HTTP status codes; there is no response to attach one to.

### `backend/api-layers`

- **"routes/ → controllers/ → services/ → models/ → db. Never skip one."** This change must
  stay entirely inside `backend/src/config/index.ts`. If a fix starts wanting to reach into a
  controller or a route, it has gone wrong.
- The one place the blast radius is real is `frontendOrigin`, which is read from three
  different layers — a controller (`backend/src/controllers/auth.ts:95,99,102`), a route
  (`backend/src/routes/subscription.ts:21-23`) and a service
  (`backend/src/services/auth.ts:534`), plus `backend/src/config/vapid.ts:11`. Fix the value
  at the config layer so none of those four need to learn that `CORS_ORIGIN` can be a list.

## Also relevant, from `CLAUDE.md` rather than a standard

- `backend/CLAUDE.md`: **"`config` validates env with Zod at import time and throws without
  `PORT`. Tests whose import graph reaches it must `vi.mock('../config/index.js')`."** The new
  test is the exception that proves it — it is the one file that must import the real module,
  so it needs `vi.resetModules()` + dynamic import per case, and must set `PORT` in every
  case or `port` fails first and hides the assertion under test.
- Root `CLAUDE.md` rule 4: **the MCP server ships separately and consumes these APIs.** It is
  a separate process that calls the backend over HTTP
  (`backend/mcp-server/index.js:25`, `TRACKVIBE_API_URL`), never reads `config.corsOrigin`,
  and — being a server-side `fetch` — sends no `Origin` header, so CORS does not gate it.
  Nothing to keep in sync. It does, however, need the backend to be *running*, which a boot
  crash prevents.
