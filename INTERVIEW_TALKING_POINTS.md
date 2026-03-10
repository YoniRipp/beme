# BeMe - Interview Talking Points

## 1. Elevator Pitch (30 seconds)

> "BeMe is a **full-stack mobile-first fitness platform** I built using a
> **monorepo architecture** — React frontend, Node/Express backend, PostgreSQL,
> Redis, and WebSockets. It handles food tracking, workout logging, and even
> has a **real-time voice assistant** powered by Gemini. The backend is designed
> around **event-driven architecture** with support for multiple message
> transports — BullMQ over Redis or SQS — so it can scale from a single box
> to a distributed cloud deployment."

---

## 2. Architecture Overview

**Talk through this flow:**

```
React (Vite/PWA)  -->  Express REST API  -->  PostgreSQL
       |                     |
       |              Redis (cache + queues)
       |                     |
  WebSocket  <------>  Gemini Live API
                             |
                    BullMQ Workers / SQS
                             |
                    Event Bus (pub/sub)
```

**Key buzzwords to hit:**
- **Monorepo** — frontend, backend, mobile (React Native), TWA all in one repo
- **Layered architecture** — controllers → services → models (separation of concerns)
- **Database connection pooling** — `pg.Pool` with per-context DB URLs (bounded contexts)
- **Containerized** — Docker Compose with Redis, backend, frontend services
- **Health checks** — Docker healthcheck probes on `/health`

---

## 3. Redis & Caching Strategy

> "We use Redis as a **multi-purpose layer** — not just caching."

**Three uses of Redis in the project:**

1. **Caching** — Food search results and API responses are cached with TTL to reduce external API calls and DB load
2. **Job result store** — Voice processing jobs store their results in Redis with `setEx` (auto-expiring keys, 5-min TTL), so the client can poll for completion
3. **Distributed rate limiting** — Redis-backed rate limiter for API endpoints
4. **BullMQ backing store** — Redis powers the message queue for async job processing

**Graceful degradation:**
> "Redis is **optional** — the app detects if Redis is configured and falls back to **in-memory stores** when it's not. We have `isRedisConfigured()` and `isRedisHealthy()` health checks. This means local dev works without Redis, but production gets the full distributed stack."

---

## 4. Event-Driven Architecture

> "The backend follows an **event-driven architecture** with a custom event bus."

**Flow:**

```
Write operation (e.g. create food entry)
  → Controller calls Service
    → Service persists to DB
      → Service calls publishEvent()
        → Event envelope created (UUID, type, payload, metadata)
          → Routed to transport: Redis (BullMQ) | SQS | In-memory
            → Workers/consumers pick up and process
```

**Key points to mention:**

- **Event envelope schema** — every event has `eventId`, `type`, `payload`, `metadata` (userId, timestamp, correlationId, causationId, version) — validated with **Zod**
- **Correlation & causation IDs** — full **distributed tracing** across event chains
- **Multiple transports** — `EVENT_TRANSPORT` config switches between `redis`, `sqs`, or `memory` — **strategy pattern**
- **Dead letter queue (DLQ)** — failed events go to a DLQ for retry/inspection
- **Dispatcher pattern** — subscribe handlers by event type, supports wildcard (`*`) listeners
- **Domain events** — named like `money.TransactionCreated`, `food.EntryLogged` — follows **domain-driven design** naming

---

## 5. WebSockets & Real-Time Voice

> "We have a **real-time voice assistant** that uses WebSockets for bidirectional streaming."

**Flow:**

```
Browser (mic audio)
  --[WebSocket]--> Backend relay server
    --[WebSocket]--> Gemini Live API
    <--[tool calls]-- Gemini Live API
  <--[actions/results]-- Backend
    --> Execute actions (log food, create workout, etc.)
```

**Key points:**

- **JWT authentication over WebSocket** — token passed via query string, verified on upgrade
- **Per-connection session isolation** — each browser WS gets its own Gemini Live session
- **Inactivity timeout** — 30-second timeout with automatic cleanup
- **Graceful fallback** — if streaming is unavailable, falls back to **batch mode**
- **Tool calling** — Gemini returns structured tool calls, backend executes them against the same service layer as the REST API

---

## 6. Async Job Processing (Queue Workers)

> "Heavy operations like voice parsing run **asynchronously** through a job queue."

**Flow:**

```
API request → enqueue job (BullMQ or SQS) → return jobId immediately
Client polls GET /jobs/:id → Redis lookup → { status, result }
Worker picks up job → processes audio → stores result in Redis with TTL
```

**Buzzwords:**

- **BullMQ** — Redis-based queue with retry, backoff, concurrency control
- **SQS fallback** — same interface, different transport (cloud-native)
- **Optimistic response** — client gets a job ID immediately, polls for result
- **TTL-based cleanup** — job results auto-expire after 5 minutes

---

## 7. Idempotency & Reliability

> "All create endpoints support **idempotency keys** for safe retries."

- Client sends `X-Idempotency-Key` header
- Middleware checks key-value store (Redis or in-memory)
- If key exists → return **cached response** (no duplicate creation)
- If new → execute handler, cache 2xx response for **24 hours**
- Prevents **duplicate entries** from network retries or double-taps

---

## 8. Middleware & Cross-Cutting Concerns

- **Request ID tracking** — every request gets a unique ID via `requestContext` (AsyncLocalStorage)
- **Structured logging** — Pino logger with request correlation
- **Metrics middleware** — request duration, status codes, endpoint tracking
- **Zod validation** — request body validation middleware with typed schemas
- **Auth middleware** — JWT-based with role support (`requirePro` for premium features)
- **Error handler** — centralized error handling with proper HTTP status mapping

---

## 9. Frontend Highlights

- **React + Vite** — fast HMR, optimized builds
- **PWA** — service worker for offline support
- **TWA** — Trusted Web Activity wrapper for Play Store distribution
- **Mobile-first** — card-based UI, bottom navigation, touch-optimized
- **Feature-based structure** — `features/`, `hooks/`, `components/`, `pages/`

---

## 10. DevOps & Infrastructure

- **Docker Compose** — one command spins up Redis + backend + frontend
- **Health checks** — container-level health probes
- **Environment-based config** — single config module, env vars drive behavior
- **Graceful degradation** — every external dependency (Redis, SQS, Gemini) has a fallback path
- **Monorepo scripts** — unified `test:all`, `lint`, `build` from root

---

## Quick Reference: Buzzword Checklist

| Buzzword | Where in project |
|---|---|
| Redis | Caching, job results, rate limiting, BullMQ backing |
| Cache invalidation | TTL-based expiry on food lookups and idempotency keys |
| Event-driven | Event bus with pub/sub, domain events after writes |
| WebSockets | Real-time voice streaming relay to Gemini |
| Message queues | BullMQ (Redis) + SQS transport |
| Dead letter queue | Failed events routed to DLQ |
| Idempotency | X-Idempotency-Key middleware on create endpoints |
| Distributed tracing | correlationId + causationId on every event |
| Domain-driven design | Bounded contexts, domain events, service layer |
| Graceful degradation | Redis/SQS optional, in-memory fallbacks |
| Zod validation | Schema validation on API inputs + event envelopes |
| JWT auth | REST + WebSocket authentication |
| Worker pattern | Background voice processing workers |
| Strategy pattern | Pluggable event transports (redis/sqs/memory) |
| Docker | Compose with health checks |
| PWA | Service worker, offline support |

---

## Closing Statement

> "The architecture prioritizes **reliability** and **scalability** — every
> write publishes a domain event, every external dependency has a fallback,
> and the system can run locally with zero infrastructure or scale to a
> distributed cloud deployment with Redis and SQS. It's designed to be
> **production-grade** from day one."

Good luck! You've got this.
