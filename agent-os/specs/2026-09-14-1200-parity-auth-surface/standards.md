# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/api-client` | The reset page calls `request()` from `core/api/client.ts`, never `fetch` |
| `frontend/components` | `ResetPassword.tsx` composes `ui/card`, `ui/input`, `ui/button` — no new primitives |
| `frontend/design-tokens` | Every colour on the new page and both Expo screens is a token |
| `frontend/mobile-ui` | 44px hit areas on the new Expo links; the reset page is a one-column form at 390px |
| `frontend/data-fetching` | Read the exception below before reaching for `useQuery` |
| `backend/errors` | No backend change, but the client copy must match the server's messages verbatim |
| `global/critical-rules` | Rule 4 — three consumers share these endpoints; nothing here changes a shape |
| `global/testing` | Vitest + Playwright on the web, `jest-expo` on mobile; see the `__tests__` note |
| `global/tech-stack` | No new dependency. If a task seems to need one, stop and ask |

## Key points carried into the work

- **No new endpoint, no changed shape.** `forgot-password`, `reset-password` and `logout` all
  exist and are already shaped for a bearer client — `logout` reads the token from either the
  `Authorization` header or the cookie (`backend/src/controllers/auth.ts:143-144`), which is
  exactly why Expo can call it unchanged.
- **The auth pages are deliberately outside TanStack Query.** `frontend/data-fetching` says all
  server state goes through `useQuery`; a password reset is a one-shot unauthenticated
  mutation with no cache to own, and `ForgotPassword.tsx` already calls `request()` directly
  inside the page. `ResetPassword.tsx` follows its neighbour rather than introducing a hook
  for a single POST. Anything that *is* server state still goes through a hook.
- **Client validation mirrors the server; it never replaces it.** The shared
  `validatePassword()` exists so the two clients stop disagreeing with each other, not so the
  backend can relax. `services/auth.ts` keeps its own checks.
- **Error copy comes from the server.** Both clients already render `err.message` and fall back
  to a generic sentence. Keep that; do not paraphrase server errors on the client.
- **Non-enumerating responses stay non-enumerating.** `forgotPassword` returns the same result
  whether or not the address exists (`backend/src/services/auth.ts:519-523`). The Expo screen
  must use the web's "If an account exists for {email}…" wording — a friendlier "we sent you a
  link" would leak account existence.
- **No inline hex in `mobile/`.** `mobile/src/theme/__tests__` fails the build on frozen
  palette values. New styles go through `useThemedStyles` / `useAppTheme`.
- **Expo Go stays the workflow.** Nothing in this spec needs a custom dev client — which is
  precisely why native social sign-in is an open question and not a task.

## Two places the standards and the code disagree

Recorded because the next person will hit them, not because this spec changes either.

1. **`frontend/api-client` says "Tokens are never written to `localStorage`".** They are:
   `frontend/src/core/api/client.ts:59-80` mirrors the JWT into `STORAGE_KEYS.TOKEN` on
   purpose, with a comment explaining that the httpOnly cookie is dropped whenever the app and
   the API are not same-site, which used to mean a fresh login on every launch. The code is
   right and the standard sentence is stale; a `/agent-os:discover-standards` pass should
   reword it.
2. **`global/testing` says unit tests co-locate, "not in a `__tests__/` folder".** Every test
   in `mobile/` lives in a `__tests__/` folder. This spec follows the package's own precedent
   rather than splitting the convention inside one package; the global rule still holds for
   `frontend/` and `backend/`.
