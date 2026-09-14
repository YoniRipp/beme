# Product Roadmap

## Phase 1: Shipped

- **Body** — workout logging (sets, reps, kg), workout types, streaks and frequency charts, exercise catalog with images/video
- **Energy** — food tracking with full macros, daily check-ins and sleep, calorie/macro trends, barcode scanning (Open Food Facts)
- **Voice Agent** — natural language for all operations via Gemini function calling; text mode sync, audio mode async via Redis queue
- **Goals** — calories/workouts/sleep against weekly, monthly, or yearly targets
- **Additional tracking** — weight, water, menstrual cycle, user profile
- **Identity** — email/password, social login, JWT sessions, admin role
- **Platform** — PWA with offline mutation queue, Expo mobile app, TWA Android wrapper

## Phase 2: In flight

- **UI/UX production polish** — make the app feel like a shipped consumer product rather than a prototype, without breaking working features.
- **Native client parity and App Store submission** — the current focus. `mobile/` (Expo SDK 54) is the native client; the Capacitor shell in `frontend/` is retired. The two clients had drifted apart, and the Expo app is the one going to the store. Open work, sequencing, and the owner actions that block a build are tracked in [`docs/HANDOFF.md`](../../docs/HANDOFF.md).
- **Payment processing** — no provider is configured in production today. Lemon Squeezy is no longer used, and Max/Hyp clearing is not wired up (`agent-os/specs/2026-08-11-0000-max-hyp-payment-processing/`). The live consequence: `tryConsumeAiCall` treats every user as Pro when no provider key is set, so the free tier is unenforced and Gemini spend is uncapped.

## Phase 3: Planned

- **Meal plans** — named plans ("Cutting Diet") with foods per meal
- **CSV import** — bulk-create a week of entries from a spreadsheet
- **Recurring schedules** — "apply this plan Monday through Friday"
- **Meal templates** — save a day's entries, re-apply with one tap

Today's workaround for repetition is the `copy_food_entries` voice command.

## Architectural direction

Bounded contexts (`identity`, `body`, `energy`, `goals`, `voice`) are logical modules in one app today, each mountable as a standalone service via config flags. Extraction should be a move of code, not a redesign.
