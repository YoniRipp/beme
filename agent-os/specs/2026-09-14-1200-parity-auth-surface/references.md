# Code Read Before Writing This Spec

Every claim in `shape.md` was checked against both clients and the backend. Nothing here was
observed in a simulator or a browser — this is a code audit.

## The web signed-out surface

- `frontend/src/routes.tsx` — `/login`, `/signup`, `/auth/callback`, `/forgot-password` are
  public (lines 237-268); everything else falls to `/*` → `ProtectedRoutes` (321), which
  redirects to `/login` when there is no user (68-70). **No `/reset-password`.**
- `frontend/src/pages/Login.tsx` — logo + tagline (41-49), the reset link (88-90), the
  "Or continue with" divider and `SocialLoginButtons` (91-99)
- `frontend/src/pages/Signup.tsx` — Name/Email/Password (77-116), the 8-plus-complexity check
  (30-37), the `?plan=` trial branch (41-47)
- `frontend/src/pages/ForgotPassword.tsx` — the whole flow: POST (20-23), the "Check your
  email" state (32-50)
- `frontend/src/components/auth/SocialLoginButtons.tsx` — Google only, disabled with an
  explanatory `title` when `VITE_GOOGLE_CLIENT_ID` is unset (49-60)
- `frontend/src/context/AuthContext.tsx` — `loadUser` via `refresh` (47-59), the resume roll
  (69-88), `clearClientSession` and `logout` (96-115)
- `frontend/src/core/api/auth.ts` — `logout` and `refresh` both `suppressUnauthorizedEvent`
  and `skipOfflineQueue` (34-46)
- `frontend/src/core/api/client.ts` — the token is mirrored into `localStorage` on purpose
  (59-80)
- `frontend/e2e/auth.spec.ts` — covers the login form, the social section and
  `/forgot-password` rendering (67-70). Nothing covers completing a reset, because nothing
  can.

## The Expo signed-out surface

- `mobile/src/navigation/RootNavigator.tsx` — `AuthStack` is Login + Signup (19-26); the
  gate is `user ? <AppStack/> : <AuthStack/>` (122)
- `mobile/src/screens/LoginScreen.tsx` — bare RN `TextInput`s with placeholders for labels
  (115-133), submit, "Create an account". No reset link, no social, no logo.
- `mobile/src/screens/SignupScreen.tsx` — the 6-character rule (91-94) and the placeholder
  that states it (133)
- `mobile/src/context/AuthContext.tsx` — `login`/`register` store the token and set the user
  (60-75); `logout` is two lines and calls no API (66-69); `setOnUnauthorized` nulls the user
  but leaves the cache (53-58)
- `mobile/src/core/api/auth.ts` — no `logout`, no `forgotPassword`; three social methods with
  no caller anywhere in `mobile/` (21-26)
- `mobile/src/core/api/client.ts` — the token lives in `expo-secure-store` under
  `trackvibe_token` (16, 42-57)
- `mobile/src/screens/WorkoutFormScreen.tsx:115`, `mobile/src/screens/FoodEntryFormScreen.tsx:242`
  — how every other Expo form renders a labelled field, and the pattern the auth screens skip
- `mobile/app.json` — `"name": "mobile"`, `"slug": "mobile"`

## Backend

- `backend/src/routes/auth.ts` — the full surface, including `forgot-password` (20) and
  `reset-password` (21)
- `backend/src/services/auth.ts` — the register password rule (74-79), the identical reset
  rule (561-571), the non-enumerating `forgotPassword` (519-523), the mailed link (535), the
  Google verifier that accepts either an ID token or an access token (192-228)
- `backend/src/controllers/auth.ts` — `logout` blocklists a Bearer **or** cookie token
  (142-150); `resetPassword` returns a message, not a session (112-116)
- `backend/src/config/index.ts` — `SESSION_TTL_DEFAULT_DAYS = 365` (22)
- `backend/src/routes/users.ts` — `DELETE /api/users/:id` is admin-only and refuses
  self-deletion (120-122, 240): there is no self-serve account deletion to port

## Shared

- `packages/shared/package.json` — the `exports` map a new `./auth` subpath would join
- `packages/shared/src/settings/index.ts` — the pattern for a new shared module

## Prior work leaned on

- `agent-os/specs/2026-09-12-1230-mobile-foundation/` — the parity programme this belongs to;
  its shape.md names "account" as sub-project 8, which is what this spec and the two beside it
  break down
- PR #302 (`Parity: Home — one set of daily targets, not two`) — the calorie-target split.
  Referenced by the onboarding spec, not this one.
