# Backend CORS rejects the native app's origin — every API call fails on iOS

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **critical**. The native app cannot get past the login screen.

## The mismatch

Signing in from the iOS app shows a red **"Load failed"** under the TrackVibe heading.
No request appears to succeed; the app is a static shell.

WebKit says why:

```
WebContent: [pageID=8, …, resourceID=302] SubResourceLoader::didFail: (type=2, code=0)
```

`type=2` is WebKit's `ResourceError::Type::AccessControl` — a **CORS rejection**. Not a
timeout, not App Transport Security, not a connection failure. The response came back and
the WebView refused it.

Confirmed against the running backend:

```
$ node -e "fetch('http://localhost:3000/api/auth/login', {
    method:'POST',
    headers:{'Content-Type':'application/json','Origin':'capacitor://localhost'}, … })"

status 429
acao: http://localhost:5173      # ← echoed regardless of the request Origin
```

A Capacitor iOS WebView serves the bundled app from **`capacitor://localhost`**. That
origin is never allowed.

## Why it happens

The backend has no notion of the Capacitor origin anywhere:

```
$ grep -rniE "capacitor://|ionic://|localhost:8100" backend/
(no matches)
```

So the allowlist can only ever contain the web origins. In development
`config.corsOrigin` falls back to `true` (reflect any origin) when `CORS_ORIGIN` is
unset, which is why nobody has hit this in a browser — but any deployment that sets
`CORS_ORIGIN` explicitly, which production is *required* to do
(`backend/src/config/index.ts` throws otherwise), locks the native app out completely.

Note this is not a dev-only artifact: it is the shipping configuration that breaks.

## Fix

Add the Capacitor/Ionic WebView origins to the allowlist alongside the web origin —
`capacitor://localhost` for iOS, `https://localhost` for Android (Capacitor's
`androidScheme: 'https'` is already set in `capacitor.config.ts`), and `ionic://localhost`
if older shells are still in the field.

This depends on the companion task about multi-origin `CORS_ORIGIN` — today you cannot
configure more than one origin without the backend refusing to boot.

## Acceptance criteria

- [ ] `capacitor://localhost` and `https://localhost` are accepted origins
- [ ] Sign-in succeeds in the iOS simulator against a backend with an explicit `CORS_ORIGIN`
- [ ] A test covers the Capacitor origin so a future allowlist edit cannot silently drop it
- [ ] `backend/.env.example` documents the native origins
