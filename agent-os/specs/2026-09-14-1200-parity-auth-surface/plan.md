# Plan — Parity: the signed-out surface

Status: **proposed**. No code has been written; this is the task write-up from the
web-vs-Expo audit of 2026-09-14.

**Goal:** a user who forgets their password can get back in, from either client; a user who
signs up on the phone is held to the same password rule as one who signs up in the browser;
and signing out on the phone ends the session the way it does in the browser.

**Architecture:** no new backend endpoints. `POST /api/auth/forgot-password`,
`POST /api/auth/reset-password` and `POST /api/auth/logout` all exist and work
(`backend/src/routes/auth.ts:20-22`); every task below is client work against them, plus one
shared validator in `packages/shared`.

**Spec:** `agent-os/specs/2026-09-14-1200-parity-auth-surface/` — read `shape.md` first.

## Global constraints

- **CLAUDE.md rule 1: never break existing functionality.** `frontend/` is live with real
  users; `mobile/` ships to TestFlight.
- **CLAUDE.md rule 4: do not change API shapes.** The web client, the Expo app and the MCP
  server all consume them.
- The web is the reference. Task 1 changes the web because the web is *broken* there, not
  because Expo does it better.
- Expo runs in Expo Go. No task here adds a native module or needs a custom dev client.
- `mobile/src/theme/__tests__` has AST guards that fail the build on inline hex colours. Every
  new mobile style goes through `useThemedStyles` / `useAppTheme`.
- Every task ends green (`npx tsc --noEmit` in the package touched, plus its test runner) and
  is revertible on its own.

## File structure

| File | Responsibility |
|---|---|
| `frontend/src/pages/ResetPassword.tsx` | **New.** The page the reset email actually links to |
| `frontend/src/routes.tsx` | Register `/reset-password` beside `/forgot-password` |
| `frontend/e2e/auth.spec.ts` | Extend: the reset page renders and validates |
| `packages/shared/src/auth/password.ts` | **New.** `validatePassword()` — one rule, both clients |
| `packages/shared/src/index.ts` | Export the new subpath |
| `frontend/src/pages/Signup.tsx` | Call the shared validator instead of inline regexes |
| `mobile/src/screens/ForgotPasswordScreen.tsx` | **New.** Expo's request-a-reset screen |
| `mobile/src/navigation/RootNavigator.tsx` | Add the screen to `AuthStack` |
| `mobile/src/core/api/auth.ts` | Add `forgotPassword` and `logout`; drop the three dead social methods |
| `mobile/src/screens/LoginScreen.tsx` | Forgot link, Paper inputs, logo |
| `mobile/src/screens/SignupScreen.tsx` | Shared password rule, Paper inputs |
| `mobile/src/context/AuthContext.tsx` | `logout` calls the API and clears the query cache |
| `mobile/app.json` | App display name |

---

## Task 1 — The web `/reset-password` page (unblocks both clients)

**Verified defect:** `backend/src/services/auth.ts:535` mails
`${FRONTEND_ORIGIN}/reset-password?token=…&email=…`. No such route exists
(`frontend/src/routes.tsx`), so the link resolves through the catch-all to
`<Navigate to="/login" replace />` and the `token`/`email` params are dropped.
`POST /api/auth/reset-password` has no caller in the repo.

- [ ] **Step 1: Create `frontend/src/pages/ResetPassword.tsx`.** Mirror
      `ForgotPassword.tsx` structurally — same `Card`/`CardHeader`/`CardFooter` shell, same
      `role="alert"` error paragraph, same `sent`-style success state — so the three auth
      pages stay one family.
- [ ] **Step 2: Read `token` and `email` from the query string** with `useSearchParams()`.
      When either is missing, render the "this link is invalid or has expired" state with a
      link to `/forgot-password`, and do not render the form. Do not echo the raw token.
- [ ] **Step 3: Two password fields** (new password, confirm), `autoComplete="new-password"`,
      `h-[50px] px-4` to match `Login.tsx`. Validate with the shared `validatePassword()` from
      Task 2 before calling the API, and require the two to match.
- [ ] **Step 4: Submit** `request('/api/auth/reset-password', { method: 'POST', body: { token, email, password } })`
      using `@/core/api/client`, the same call shape `ForgotPassword.tsx:20-23` uses.
- [ ] **Step 5: On success** show a confirmation with a link to `/login`. Do **not**
      auto-sign-in: the endpoint returns a message, not a session
      (`backend/src/controllers/auth.ts:112-116`), and inventing one would need an API change.
- [ ] **Step 6: Register the route** in `frontend/src/routes.tsx` next to `/forgot-password`
      (lines 261-268), lazily like its neighbours, **above** the `/*` catch-all.
- [ ] **Step 7: E2E.** Extend `frontend/e2e/auth.spec.ts`, which already covers
      `/forgot-password` rendering (line 67): `/reset-password` without params shows the
      invalid-link state; with params it shows the form; a weak password is rejected before
      any network call.
- [ ] **Step 8: Verify + commit.** `cd frontend && npx tsc --noEmit && npx vitest run && npx playwright test auth`

## Task 2 — One password rule for both clients

**Verified defect:** Expo requires 6 characters and no complexity
(`mobile/src/screens/SignupScreen.tsx:91-94`, placeholder at `:133`). The server requires 8
plus one uppercase, one lowercase and one digit (`backend/src/services/auth.ts:74-79`).

- [ ] **Step 1: Add `packages/shared/src/auth/password.ts`** exporting
      `validatePassword(password: string): string | null` — `null` when valid, otherwise the
      exact message the backend uses, so the client-side and server-side copy are identical:
      `'password must be at least 8 characters'` and
      `'password must contain at least one uppercase letter, one lowercase letter, and one digit'`.
- [ ] **Step 2: Unit-test it** in `packages/shared/src/auth/__tests__/password.test.ts`,
      including the boundary at 8 and each missing character class.
- [ ] **Step 3: Export the subpath** from `packages/shared/src/index.ts` and the package
      manifest's `exports` map, following how `@trackvibe/shared/settings` is exposed.
- [ ] **Step 4: Web** — `frontend/src/pages/Signup.tsx:30-37` calls the validator instead of
      its two inline checks. Behaviour and copy are unchanged; this is de-duplication.
- [ ] **Step 5: Expo** — `SignupScreen.tsx` calls the same validator, and the placeholder
      becomes "At least 8 characters", matching `Signup.tsx:111`.
- [ ] **Step 6: Backend stays as it is.** It must not trust a client; the duplication there is
      deliberate. Add a one-line comment in `services/auth.ts` pointing at the shared module so
      the next person changing the rule changes both.
- [ ] **Step 7: Verify + commit.** `npx tsc --noEmit` in `frontend/` and `mobile/`;
      `npm test -w packages/shared`.

## Task 3 — Expo can request a password reset

- [ ] **Step 1: `mobile/src/core/api/auth.ts`** — add
      `forgotPassword: (email: string) => request<{ message: string }>('/api/auth/forgot-password', { method: 'POST', body: { email } })`.
- [ ] **Step 2: Create `mobile/src/screens/ForgotPasswordScreen.tsx`.** Same two states as the
      web (`ForgotPassword.tsx`): a single email field with a submit button, then a "Check your
      email" panel reading *"If an account exists for {email}, we've sent password reset
      instructions."* — the same copy, because the endpoint is deliberately non-enumerating
      (`backend/src/services/auth.ts:519-523`) and the wording is what makes that safe. Paper
      `TextInput mode="outlined" label="Email"`, `useThemedStyles` for anything coloured.
- [ ] **Step 3: Register it in `AuthStack`** (`mobile/src/navigation/RootNavigator.tsx:19-26`)
      and add the *Forgot your password?* pressable to `LoginScreen`, in the same position the
      web puts it — directly under the submit button, above the sign-up link
      (`Login.tsx:88-90`). 44px minimum hit area.
- [ ] **Step 4: Test.** `mobile/src/screens/__tests__/ForgotPasswordScreen.test.tsx` — the
      email posts once, the success panel replaces the form, an API failure renders the error
      and leaves the form editable.
- [ ] **Step 5: Verify + commit.** `cd mobile && npx tsc --noEmit && npm test`

## Task 4 — Signing out on Expo actually ends the session

**Verified defect:** `mobile/src/context/AuthContext.tsx:66-69` is
`void setToken(null); setUser(null);`. No API call — `mobile/src/core/api/auth.ts` has no
`logout` — and no cache clear. The web does both
(`frontend/src/context/AuthContext.tsx:96-115`), and the backend blocklists the presented
token whether it arrives as a Bearer header or a cookie
(`backend/src/controllers/auth.ts:142-150`), so the Expo bearer path is already supported.

- [ ] **Step 1: Add `logout: () => request<void>('/api/auth/logout', { method: 'POST' })`** to
      `mobile/src/core/api/auth.ts`.
- [ ] **Step 2: `AuthContext.logout` becomes async**, calling the API best-effort inside
      `try/catch` (the web's posture — a dead network must not trap the user in a session),
      then `await setToken(null)`, `setUser(null)`, `queryClient.clear()`.
- [ ] **Step 3: The 401 path clears the cache too.** `setOnUnauthorized` (lines 53-58) nulls
      the user but leaves the cache; add the same `queryClient.clear()` so an expired session
      cannot leak the previous view.
- [ ] **Step 4: `SettingsScreen`'s Sign Out** awaits the new promise and disables the button
      while in flight, so a double-tap cannot fire two logouts.
- [ ] **Step 5: Test.** Extend `SettingsScreen.test.tsx` or add
      `mobile/src/context/__tests__/AuthContext.logout.test.tsx`: pressing Sign Out posts to
      `/api/auth/logout`, empties the token, and leaves `queryClient.getQueryCache().getAll()`
      empty — including when the API call rejects.
- [ ] **Step 6: Verify + commit.** `cd mobile && npx tsc --noEmit && npm test`

## Task 5 — The signed-out screens look like TrackVibe

- [ ] **Step 1: Both Expo auth screens move to Paper `TextInput mode="outlined"` with a
      `label`**, matching `WorkoutFormScreen.tsx:115` and `FoodEntryFormScreen.tsx:242`. This
      is what fixes the real defect underneath the cosmetics: the label is a placeholder today,
      so it disappears as soon as the user types, and no `placeholderTextColor` is set anywhere
      in `mobile/src`.
- [ ] **Step 2: Add the wordmark and tagline** above the form on `LoginScreen`, mirroring
      `Login.tsx:41-49` — logo, "TrackVibe", "Body, energy, and goals in one place." Reuse
      `mobile/assets/icon.png` rather than adding an asset; if it crops badly, note it and stop
      rather than inventing artwork.
- [ ] **Step 3: `mobile/app.json`** — `"name": "TrackVibe"`. **Leave `"slug"` alone** (see
      `shape.md`, open question 2).
- [ ] **Step 4: Web `/forgot-password` gets the same card treatment as `/login`** — logo,
      `shadow-card-lg` — so the three web auth pages match each other. Cosmetic, on the
      reference client; skip if the owner declines open question 3.
- [ ] **Step 5: Verify + commit.** Typecheck both packages; `npm test` in `mobile/`.

## Task 6 — Remove the dead social-login methods (pending open question 1)

- [ ] **Step 1:** If the owner defers native social sign-in, delete `loginWithGoogle`,
      `loginWithFacebook` and `loginWithTwitter` from `mobile/src/core/api/auth.ts:21-26`.
      Nothing in `mobile/` calls them; they read as a shipped capability that does not exist.
- [ ] **Step 2:** If the owner wants it instead, this task becomes its own spec — it needs a
      provider decision, Sign in with Apple (App Store 4.8), and an Expo Go story.

## Verification for the whole spec

- [ ] `cd backend && npx tsc --noEmit` (untouched, but the shared package moves under it)
- [ ] `cd frontend && npx tsc --noEmit && npx vitest run && npx playwright test`
- [ ] `cd mobile && npx tsc --noEmit && npm test`
- [ ] Manual, once: request a reset on the web, open the mailed link, set a new password, sign
      in with it. Then the same from Expo, finishing in the browser. **This is the acceptance
      test for the whole spec** — everything else is a step towards it.
