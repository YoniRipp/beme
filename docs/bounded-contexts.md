# Bounded contexts (BMe)

Bounded contexts define ownership of data and behavior. Each context will eventually own its own API, data store (or schema), and publish events when its state changes. Cross-context communication is via events (and optional read APIs), not direct DB access or sync HTTP writes.

---

## Identity

**Owns:** Users, authentication, sessions, roles.

**Data:** `users` table (id, email, password_hash, name, role, auth_provider, provider_id, created_at).

**API surface:** Register, login, OAuth (Google, Facebook, Twitter), `/api/auth/me`, token exchange.

**Events (future):** `identity.UserRegistered`, `identity.SessionCreated`, `identity.UserUpdated`.

---

## Body

**Owns:** Workouts, exercises (sets, reps, weight).

**Data:** Workouts and exercises tables.

**API surface:** CRUD for workouts and exercises.

**Events (future):** `body.WorkoutCreated`, `body.WorkoutUpdated`, `body.WorkoutDeleted`.

---

## Energy

**Owns:** Food entries (calories, macros), daily check-ins (sleep, etc.).

**Data:** `food_entries`, `daily_check_ins` (and related).

**API surface:** CRUD for food entries and daily check-ins; food search/lookup.

**Events (future):** `energy.FoodEntryCreated`, `energy.FoodEntryUpdated`, `energy.FoodEntryDeleted`, `energy.CheckInCreated`, `energy.CheckInUpdated`.

---

## Goals

**Owns:** Goals (type, target, period) and progress.

**Data:** Goals table.

**API surface:** CRUD for goals; progress tracking.

**Events (future):** `goals.GoalCreated`, `goals.GoalUpdated`, `goals.GoalDeleted`.

---

## Voice

**Owns:** Voice job orchestration (request, parse via Gemini, result). Does not own user data; triggers writes in other contexts via API or events.

**Data:** Job state in Redis (or queue); no primary domain tables.

**API surface:** `POST /api/voice/understand`, `GET /api/jobs/:jobId`; worker consumes queue and calls Gemini.

**Events (future):** `voice.VoiceJobRequested`, `voice.VoiceJobCompleted`, `voice.VoiceJobFailed`.

