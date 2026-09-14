# Parity: the signed-out surface — Shaping Notes

## Why this exists

`frontend/` (web + PWA) and `mobile/` (Expo, the native client since 2026-09-12) are supposed
to be the same app on a phone. This spec covers everything a user sees **before** they are
signed in — sign in, sign up, password reset — plus what signing *out* actually clears.

The web mobile client is the reference. Expo conforms. Where the audit found the web itself to
be wrong, that is called out rather than copied into the native client.

## The headline: nobody can reset a password, on either client

The audit started from "Expo's sign-in screen has no *Forgot your password?* link". It is
worse than that.

- `POST /api/auth/forgot-password` and `POST /api/auth/reset-password` both exist
  (`backend/src/routes/auth.ts:20-21`) and both work.
- `forgotPassword` mails a link to `${FRONTEND_ORIGIN}/reset-password?token=…&email=…`
  (`backend/src/services/auth.ts:535`).
- **There is no `/reset-password` route in the repo.** Grepping the string across every
  `.ts`/`.tsx`/`.md`/`.json` file outside `node_modules` returns exactly two hits: the line
  that registers the API endpoint and the line that builds the email link. No page, no screen,
  no component, no test.
- On the web the mailed link falls through to `routes.tsx`'s catch-all `/*`
  (`frontend/src/routes.tsx:321`) → `ProtectedRoutes` → `<Navigate to="/login" replace />`
  (lines 68-70), which drops `token` and `email` from the URL on the way. The user lands on
  the sign-in page they already could not get past.
- `POST /api/auth/reset-password` therefore has **no caller anywhere in the repo**. Web users
  can request a reset and never complete one. Expo users cannot even request one: `AuthStack`
  is Login + Signup only (`mobile/src/navigation/RootNavigator.tsx:19-26`), and
  `mobile/src/screens/LoginScreen.tsx` has no reset link.

**Answer to the sizing question: a native-only user cannot reset a password — and neither can
anyone else.** Whoever forgets their password is locked out permanently on every client. The
Expo gap is real, but closing only the Expo gap fixes nothing, because the email still points
at a page that does not exist. **The web page is task one, and it is the task that unblocks
both clients.**

## Scope

1. **`/reset-password` on the web** — the missing landing page for a link the backend already
   sends. Unblocks every user on every client.
2. **`ForgotPasswordScreen` in Expo**, plus the *Forgot your password?* link on `LoginScreen`,
   posting to the same endpoint and ending on the same "check your email" state
   (`frontend/src/pages/ForgotPassword.tsx:32-50`).
3. **Signup password rules that agree with the server.** Expo enforces 6 characters and no
   complexity (`mobile/src/screens/SignupScreen.tsx:91-94`), placeholder text included
   (`:133`, "Password (min 6 characters)"). The server requires 8 characters plus one
   uppercase, one lowercase and one digit (`backend/src/services/auth.ts:74-79`), and the web
   mirrors that rule client-side (`frontend/src/pages/Signup.tsx:30-37`). An Expo user typing
   `hunter6` is told it is fine, then rejected by the API.
4. **Sign-out clears the same things.** The web calls `POST /api/auth/logout`, which blocklists
   the token server-side (`backend/src/controllers/auth.ts:142-150`), then clears the token,
   the React Query cache, the offline queue and the `api-cache`
   (`frontend/src/context/AuthContext.tsx:96-115`). Expo deletes the SecureStore token and
   nulls the user, nothing else (`mobile/src/context/AuthContext.tsx:66-69`) — its `authApi`
   has no `logout` method at all (`mobile/src/core/api/auth.ts`). Two consequences: a
   signed-out token stays valid for the rest of its life (365 days by default,
   `backend/src/config/index.ts:22`), and the next person to sign in on that device reads the
   previous user's cached data until every query refetches.
5. **The signed-out screens look like the app.** The web shows the logo, the product name and
   "Body, energy, and goals in one place." (`frontend/src/pages/Login.tsx:41-49`). Expo shows
   a text title and placeholder-only inputs. Every *other* Expo form uses Paper's
   `TextInput mode="outlined" label=…` (`WorkoutFormScreen.tsx:115`,
   `FoodEntryFormScreen.tsx:242`) — the two auth screens are the only bare React Native
   `TextInput`s in the app, so the field's label vanishes the moment the user types, and no
   `placeholderTextColor` is set anywhere in `mobile/src`.

## What already matches — checked, not assumed

- **Signup collects the same three fields**, in the same order: Name, Email, Password
  (`Signup.tsx:77-116` / `SignupScreen.tsx:113-139`).
- **Both clients trim the email and leave the password untouched** before calling the API
  (`Login.tsx:28` / `LoginScreen.tsx:98`).
- **Both surface the server's error message verbatim**, falling back to a generic string —
  `err instanceof Error ? err.message : …` on both sides. The backend's "Invalid email or
  password" reaches the user unchanged on both.
- **Both cross-link sign-in ↔ sign-up** and redirect into the app on success.
- **Neither client confirms a sign-out.** Same behaviour, no change wanted.
- **Sign-out placement differs but is correct on both.** The web signs out from the header
  user menu (`Base44Layout.tsx:246-252`) and its Settings page deliberately has no button,
  saying so in `AccountSection.tsx`. Expo has no header user menu, so its Settings-screen
  button is the right adaptation, not drift.

## Decisions

- **Fix the web page first, then add the Expo entry point.** In that order the Expo screen is
  useful the day it ships. Reversed, it mails users into the same dead end.
- **No deep link for the reset flow.** The Expo screen posts to `/api/auth/forgot-password`
  and tells the user to check their mail; the mailed link opens the web page in the system
  browser. A `trackvibe://` scheme would need `app.json` config, does not behave uniformly in
  Expo Go, and buys nothing over a browser hand-off.
- **One password rule, in `packages/shared`.** The 8-plus-complexity rule is currently written
  out three times (backend register, backend reset, web signup) and wrongly a fourth time in
  Expo. Add `validatePassword()` to `packages/shared` and have both clients call it. The
  backend keeps its own copy as the authority — it must never trust a client — but the clients
  stop inventing their own.
- **Expo's logout gains the server call, not the web's whole cache-clearing shape.** Expo has
  no offline queue and no `caches` API. The parity items are `POST /api/auth/logout` and
  `queryClient.clear()`; nothing else from `clearClientSession` applies.
- **The Expo auth screens move to Paper inputs** rather than getting a hand-tuned
  `placeholderTextColor`. That is how the rest of the app already renders a labelled field,
  and it keeps the two screens inside the theme guard in `mobile/src/theme/__tests__`.

## Deliberately not in scope

- **Social sign-in on native.** See Open Questions — a product decision, not a gap to close
  silently.
- **The `?plan=monthly` trial path** the web's signup handles (`Signup.tsx:41-47`). Paid
  upgrade on iOS is an in-app-purchase question; the settings/subscription spec raises it.
- **Session rolling.** The web re-mints its token on launch and on resume
  (`AuthContext.tsx:47-88`); Expo's token is fixed at login. With the default 365-day TTL this
  cannot log anyone out in practice. Recorded, not scheduled.
- **Account deletion.** Neither client has it and no self-serve endpoint exists
  (`DELETE /api/users/:id` is admin-only and explicitly refuses self-deletion,
  `backend/src/routes/users.ts:120-122`). Raised as an open question in the settings spec,
  where the destructive-actions surface lives.

## Open questions for the owner

1. **Does the native client get social sign-in?** The web offers Google, rendering a disabled
   button with an explanatory tooltip when `VITE_GOOGLE_CLIENT_ID` is unset
   (`SocialLoginButtons.tsx:49-60`). Expo offers none — though `mobile/src/core/api/auth.ts:21-26`
   already declares `loginWithGoogle`, `loginWithFacebook` and `loginWithTwitter`, none of
   which anything calls. The backend is ready either way: `loginWithGoogle` accepts both a
   Google ID token and an OAuth access token (`backend/src/services/auth.ts:192-228`).
   **Recommendation: defer, and delete the three dead methods meanwhile.** Two reasons.
   `@react-native-google-signin` needs a custom dev client, which `mobile/CLAUDE.md` says not
   to require without saying so first; and App Store guideline 4.8 obliges an app offering
   third-party sign-in to offer Sign in with Apple too — a second provider the backend does
   not have. Password reset is the flow users are actually locked out of.
2. **`mobile/app.json` names the app `mobile`** — `"name": "mobile"`, `"slug": "mobile"`. The
   home-screen label reads "mobile".
   **Recommendation: set `name` to `TrackVibe` in this spec's branding task and leave `slug`
   alone**, since the slug identifies the EAS project and renaming it can orphan builds.
   Confirm before touching `slug`.
3. **Should the web's `/forgot-password` page move behind the same layout as `/login`?** It is
   the one auth page with no logo and no `shadow-card-lg` (`ForgotPassword.tsx:53-58` vs
   `Login.tsx:39-49`). Cosmetic, on the reference client, so it is listed as a task but flagged
   here rather than assumed.
