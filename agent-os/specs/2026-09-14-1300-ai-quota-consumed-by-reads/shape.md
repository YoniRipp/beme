# `requirePro` spends an AI call on endpoints that never call a model

Status: **not started**. Found 2026-09-14 while auditing web/Expo parity; it is not a
parity problem — it is a live defect on the shipping web client.
Severity: **high**. It silently consumes a free user's monthly allowance.

## The problem

`backend/src/middleware/requirePro.ts` does not check entitlement. It **spends** it:

```ts
// requirePro.ts:18
const result = await tryConsumeAiCall(req.user.id);
```

Every route behind that middleware decrements the user's remaining AI calls, whether or
not the request goes anywhere near a model. Three of them never do:

| Route | Calls a model? | Spends a call today |
|---|---|---|
| `GET /api/chat/history` | no — reads rows | **yes** |
| `DELETE /api/chat/history` | no — deletes rows | **yes** |
| `GET /api/insights/freshness` | no — returns a timestamp | **yes** |
| `GET /api/insights` | cached read, model only on miss | yes |
| `GET /api/insights/today` | yes | yes |
| `POST /api/insights/refresh` | yes | yes |
| `POST /api/chat`, `/agent`, `/agent/stream`, `/agent/confirm-plan` | yes | yes |
| `POST /api/food/lookup-or-create` | yes | yes |
| `POST /api/voice/understand`, `/transcribe` | yes | yes |

A free account gets 10 calls a month (`backend/src/models/user.ts`). So a user can burn
their allowance **reading and deleting their own chat history**, or by leaving the
Insights page open while it polls freshness. Opening Insights once was measured at six of
the ten, because the page fetches insights plus three prefetched periods plus today plus
freshness.

The user is never told. `hasAiAccess` on the client is `isPro || aiCallsRemaining > 0`
computed from a `/api/auth/me` payload that is already stale by then, so the UI keeps
offering AI while the balance drains behind it.

## Why it is worth fixing properly rather than patching the routes

The middleware's name says "require", which is what every call site assumes it means. The
consuming behaviour is invisible at the point of use — `router.get('/api/chat/history',
withUser, requirePro, ...)` reads as a guard. Any endpoint added behind it in future
inherits the same bug for free.

## Suggested shape

Split the middleware in two, so the call site states the intent:

- `requireAiAccess` — checks `isPro || aiCallsRemaining > 0`, spends nothing. Use on
  `GET`/`DELETE /api/chat/history` and `GET /api/insights/freshness`.
- `requireAiQuota` — the present behaviour, renamed so it is obvious it debits. Use on
  everything that actually reaches a model.

Then decide the cached-read case deliberately rather than by accident: `GET /api/insights`
serves a cache and only calls a model on a miss, so charging on entry overcharges the
common path. Charging inside the service at the point the model is invoked is the honest
version, and it is the same change that would let `res.locals.remainingCalls` stop lying.

Out of scope here, but connected: the web prefetches three extra periods on the Insights
page. Even after this fix that is three model calls where a user asked for one. Worth its
own look.

## Acceptance criteria

- [ ] Reading or deleting chat history spends no AI call
- [ ] Polling insights freshness spends no AI call
- [ ] A cache hit on `GET /api/insights` spends no AI call
- [ ] Endpoints that reach a model still debit exactly once
- [ ] A test per endpoint asserting the balance before and after, so the next route added
      behind the middleware cannot quietly re-introduce this
- [ ] `aiCallsRemaining` reported to the client reflects the balance after the request
