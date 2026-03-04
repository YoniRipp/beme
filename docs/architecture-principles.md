# Architecture principles (BMe event-driven)

These rules guide the migration to event-driven, multi-service design. Follow them in every plan so we don't have to change the core mid-way.

---

## 1. Domain logic stays inside its context

- **Body**, **Energy**, **Goals**, **Voice**: each context owns its domain logic and data access.
- No "god" service that orchestrates business rules across contexts. Orchestration is via events and optional thin BFF/gateway for reads.

---

## 2. Contexts communicate via events (and optional read API)

- **Writes:** A context does not call another context's API to perform a write. It publishes an event; the other context (if needed) subscribes and reacts.
- **Reads:** Allowed via (a) each context's own read API, (b) gateway/BFF aggregating read APIs, or (c) a dedicated read model built from events. No cross-context direct DB access.
- **Event contract:** Event types and payloads are the public contract between contexts. They are versioned and documented (see [event-schema.md](event-schema.md)).

---

## 3. Event types are a versioned public contract

- Changing an event's payload in a breaking way requires a new type or version (e.g. `body.WorkoutCreated.v2`).
- Old consumers can keep consuming old events until deprecated. New consumers subscribe to new types.
- No undocumented or ad-hoc event shapes.

---

## 4. Bounded contexts map to deployables (eventually)

- Each context in [bounded-contexts.md](bounded-contexts.md) is a candidate for its own service (own repo or subfolder, own deploy, own DB or schema).
- Until extracted, contexts are logical modules in one app; same principles (no cross-context DB, communicate via events) still apply so extraction is a move of code, not a redesign.

---

## 5. Cross-context: no sync writes; read strategy

- **No sync HTTP write calls between services.** When a flow spans contexts (e.g. dashboard or voice action), the client (or BFF) calls the owning service’s API to perform the write; that service publishes events. Other contexts do not call another service’s API to perform a write—they react via event consumers if needed.
- **Read strategy:** The gateway/BFF is the single entrypoint. It aggregates read APIs from each service (proxy by path, e.g. `/api/workouts/*`, `/api/food-entries/*`). No service calls another service for reads in the write path; for read-only aggregation the gateway calls each service’s read API. Optionally a read-model consumer can build views from events and serve reads.

---

## 6. AWS and scaling (optional path)

- The event bus supports **Redis (BullMQ)** and **SQS** today. For AWS-native: add an EventBridge (or SNS+SQS) transport; event envelope and types stay the same. Consumers can run as Lambda (triggered by SQS/EventBridge) or ECS/Fargate.
- API: main app (or gateway) can sit behind API Gateway + CloudFront; context services behind ALB or as Lambda. DB: RDS/Aurora per service (or shared DB with per-context URLs). Use Secrets Manager for credentials. Auto-scaling and monitoring complete the picture.
