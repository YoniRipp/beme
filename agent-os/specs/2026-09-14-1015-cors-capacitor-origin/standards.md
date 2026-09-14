# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `backend/routes` | Read to confirm the boundary: this work adds **no** route, so no route file changes. CORS is app-level middleware in `app.ts`, not route middleware. |
| `backend/api-layers` | Same — the four layers are untouched. Named so the reviewer can see the layering was considered and deliberately not entered. |
| `backend/errors` | The only failure mode is a config failure at boot, which is a thrown `Error` in `config/index.ts`, not an HTTP error. No `AppError` subclass belongs here. |
| `global/tech-stack` | New backend file must be `.ts`; relative imports carry `.js`; Zod owns env validation; no new dependency — `cors ^2.8.5` is already installed. |
| `global/testing` | Vitest, co-located `*.test.ts`, and the include pattern that decides whether a test runs at all. |
| `global/critical-rules` | Rule 4 — do not change API shapes. The MCP server consumes them. |

## Key points carried into the work

- **Layers are not entered, and that is the point.** `routes/ → controllers/ → services/ →
  models/` describes request handling. CORS is transport configuration: it belongs in
  `backend/app.ts` (where `cors()` is already mounted at `:69`) and in
  `backend/src/config/index.ts` (where the origin is already resolved). Putting an origin
  check anywhere in the four layers would be the wrong shape.

- **No API shape changes — none.** No response body, status code, header contract or route
  path moves. The MCP server at `backend/mcp-server/` ships separately and consumes these
  endpoints; it authenticates with a shared secret from a non-browser client and never sends
  an `Origin`, so it is unaffected either way. The web client is unaffected because
  `http://localhost:5173` (and whatever production sets) stays first in the allowlist.

- **Zod validates env at import time.** `config/index.ts` parses once and throws on a bad
  value; there is no lazy re-read. Two consequences: the native origins must be folded in
  *before* `configSchema.safeParse`, and any test wanting the real config must
  `vi.resetModules()` + `await import()` with `process.env` already set — per
  `backend/CLAUDE.md`, tests whose import graph reaches config otherwise have to
  `vi.mock('../config/index.js')`.

- **Production guards are load-bearing.** `config/index.ts:126-130` throws on
  `CORS_ORIGIN=true` and on an unset value in production. Appending the native origins must
  run **before** those checks so neither can be satisfied accidentally by the constant.

- **All new backend files are `.ts`, relative imports carry `.js`.** The new module is
  `backend/src/config/corsOrigins.ts`, imported as `'./corsOrigins.js'`.

- **No new dependency.** `cors ^2.8.5` and `@types/cors ^2.8.19` are already in
  `backend/package.json`. `cors` accepts `string | string[] | RegExp | boolean` for `origin`
  and exact-matches array members, which is exactly the semantics wanted — nothing needs
  wrapping.

- **Tests live under `backend/src/`.** `backend/vitest.config.ts` sets
  `include: ['src/**/*.test.ts']`. A test placed at `backend/app.test.ts` is not a failing
  test, it is an invisible one. `supertest ^7.0.0` is available for the middleware-level
  test; `@types/supertest` is not installed, so follow the existing untyped-import pattern
  in `backend/src/routes/auth.test.ts`.

- **Never break existing functionality (critical rule 1).** The dev fallback
  `corsOrigin === true` and the production explicit-origin requirement both keep their
  current behaviour; the change is strictly additive to an existing allowlist.

## Standards deliberately not applied

- `backend/response-format`, `backend/models`, `backend/events`, `backend/data-lifecycle` —
  nothing returns data, touches SQL, mutates domain state or adds a per-user table.
- The `frontend/*` standards — no frontend code changes. `frontend/README.md` gains one
  documentation line about `VITE_API_URL` in a Capacitor build, and that is all.
