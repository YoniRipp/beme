# Event schema (TrackVibe)

All events on the bus use a single envelope so producers and consumers can rely on a consistent shape. This works with Redis (BullMQ), SQS, or EventBridge.

---

## Envelope (required fields)

Every event MUST have:

| Field | Type | Description |
|-------|------|-------------|
| `eventId` | string (UUID) | Unique id for this event. Producers MUST assign a unique eventId (e.g. UUID) to every event. Used for deduplication and idempotent consumption. |
| `type` | string | Event type, e.g. `body.WorkoutCreated`, `energy.FoodEntryCreated`. Format: `context.Verb` or `context.NounVerb`. Version suffix optional: `body.WorkoutCreated.v1`. |
| `payload` | object | Domain-specific data. Structure is defined per event type. |
| `metadata` | object | Common metadata. See below. |

---

## Metadata (required)

| Field | Type | Description |
|-------|------|-------------|
| `userId` | string | User who triggered the action (when applicable). |
| `timestamp` | string (ISO 8601) | When the event was produced. |
| `correlationId` | string (optional) | Request or trace id for linking logs. |
| `causationId` | string (optional) | eventId of the event that caused this one (for chains). |
| `version` | number (optional) | Envelope version; default 1. Consumers may use this for ordering or compatibility. |

---

## Example

```json
{
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "type": "body.WorkoutCreated",
  "payload": {
    "id": "workout-uuid",
    "date": "2025-02-24",
    "title": "Morning Strength",
    "type": "strength",
    "duration_minutes": 45,
    "exercises": [
      { "name": "Squat", "sets": 3, "reps": 5, "weight": 100 }
    ]
  },
  "metadata": {
    "userId": "user-123",
    "timestamp": "2025-02-24T12:00:00.000Z",
    "correlationId": "req-abc"
  }
}
```

---

## Event types (catalog)

- **Body:** `body.WorkoutCreated`, `body.WorkoutUpdated`, `body.WorkoutDeleted`
- **Energy:** `energy.FoodEntryCreated`, `energy.FoodEntryUpdated`, `energy.FoodEntryDeleted`, `energy.CheckInCreated`, `energy.CheckInUpdated`
- **Goals:** `goals.GoalCreated`, `goals.GoalUpdated`, `goals.GoalDeleted`
- **Voice:** `voice.VoiceJobRequested`, `voice.VoiceJobCompleted`, `voice.VoiceJobFailed`

Payload shape per type is defined in code (e.g. Zod schema) and should match the domain model returned by the API for that entity.

---

## Consumer contract

- **Idempotency:** Consumers MUST be idempotent. Use `eventId` (and optionally `payload.id`) to deduplicate. Processing the same event twice must not change outcome. When in doubt, upsert by `eventId` so duplicate delivery leaves state correct.
- **Ordering:** If ordering matters, use one queue per aggregate (e.g. per user) or include `version` / `sequenceId` in payload and handle out-of-order in the consumer.
- **Versioning:** When changing payload shape, introduce a new event type or version (e.g. `body.WorkoutCreated.v2`) and support both until old consumers are retired.
