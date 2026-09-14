# Parity: the capabilities Expo has no entry point for — Shaping Notes

## Scope

The sibling spec (`2026-09-14-1130-parity-food-journal-screen`, PR #304) covered the
numbers and the layout of the journal screen. This one covers the harder half: things a
native user **simply cannot do**, because the entry point does not exist on Expo at all.

These are absences, not weak implementations. Against `origin/main` (`34a51d9`):

```
grep -rEin "voice|speech|microphone|recording" mobile/src   →  0 hits
grep -rEin "barcode|camera"                    mobile/src   →  0 hits
grep -rin  "water"                             mobile/      →  0 hits
```

## Capability table

| Capability | Web | Expo | Backend endpoint | Native module needed |
|---|---|---|---|---|
| **Voice food logging** | `QuickVoiceEntry` — a primary mic on every meal card | **none** | web's own path needs none; `POST /api/voice/transcribe` + `/api/voice/understand` **exist** | **yes** — microphone. See decision D1 |
| **Barcode scan** | `BarcodeScanner` in `FoodEntryModal` | **none** | `GET /api/food/barcode/:code` **exists** | **yes** — camera. `expo-camera`. See D2 |
| **Water tracking** | whole `/water` page + `WaterTracker` card on Home | **none** | 5 routes **exist** (see below) | no |
| **"Meal tools"** — bulk text / voice / CSV | `BulkFoodEntryModal` | **none** | `POST /api/food-entries/batch` **exists** (max 50) | no (CSV would want a document picker) |
| **"Copy day"** | `DuplicateDayDialog` | **none** | `POST /api/food-entries/duplicate-day` **exists** | no |
| **"Log again" recent foods** | `RecentFoodsStrip` in the modal | **none** | **no endpoint needed** — pure client-side | no |
| **"Look up with AI"** when search finds nothing | modal empty state | **none** | `POST /api/food/lookup-or-create` **exists** | no |
| **Food search** | in the modal, always | in the form, **only when creating** | `GET /api/food/search` — both use it | no |

Every row is backed by an endpoint that already exists, or needs none. **There is no
backend work in this spec.** Two rows need a native module, and those are decisions, not
details — D1 and D2 below.

**The web is the reference.** Where Expo is genuinely better — and in portion handling it
is — that is an open question, not a silent reversal.

## The gaps, in order of what they cost a user

### 1. Voice — the product's primary input method is absent from the native client

`CLAUDE.md` says voice is the primary input method.
`agent-os/standards/global/domain-conventions.md` puts it in the domain rules: *"Voice is
the primary path for food logging; manual search/barcode/form entry is secondary. A new
food-logging capability should be reachable by voice, not only by form."*

On the web, every meal card's largest control is a full-width primary **Voice log** button,
with **Add** deliberately demoted to a secondary button beside it
(`MealJournalCard.tsx:94-111`). On Expo the meal header has one control: **Add**, opening a
form. The client running on the device with the best microphone in the product is the only
one that cannot talk to it.

This is the single most expensive gap in the audit, and it should be sized as a feature,
not as a missing button.

**What the web's flow actually is** — this matters, because it is not what the endpoint
names suggest. `QuickVoiceEntry` never calls `/api/voice/*`. It runs `useBrowserSpeech`
(Web Speech API, on-device, free, live partial results), parses the transcript locally with
`parseFoodItems` (`frontend/src/features/energy/parseFoodText.ts`), resolves each item
through `GET /api/food/search` with `POST /api/food/lookup-or-create` as a fallback, shows
a review list where each item's meal can be reassigned, and saves the lot through
`POST /api/food-entries/batch`. The `/api/voice/*` routes back the AI coach chat and the
global voice agent — different surfaces.

So the reusable part of the web's pipeline is everything **after** the transcript, and it
is substantial: parser, resolution loop, review step, batch save. Only the first step —
"get me a transcript" — has no React Native equivalent. Hence decision D1.

### 2. Water — a whole screen with no counterpart

The web has `frontend/src/pages/Water.tsx` (a ring, a grid of tappable glass tiles, +/-
controls, `ml` readout against `profile.waterGoalGlasses`), a `WaterTracker` card on Home
that links to it, a `useWater` hook with a genuinely careful optimistic-update
implementation, and a water goal field in Settings. Expo has **zero occurrences of the
string "water"** anywhere in the package.

All five endpoints exist: `GET /api/water-entries`, `GET /api/water-entries/history`,
`PUT /api/water-entries`, `POST /api/water-entries/add-glass`,
`POST /api/water-entries/remove-glass`. The goal lives on `GET /api/profile` as
`waterGoalGlasses`. No native module. This is a screen-and-a-hook task over a live API —
the cheapest large win in the audit.

Two details in `frontend/src/hooks/useWater.ts` are not incidental and must be ported, not
re-derived:

- **`setGlasses` writes the whole count in one request.** Tapping the 6th tile used to fire
  six sequential add-glass calls with the UI frozen; the hook's comment records that.
- **Out-of-order responses are guarded with a `latestSetRef` request counter,** so a slow
  reply for "3" cannot overwrite a later "5". On a phone with worse connectivity than a
  desktop browser, dropping this guard would be worse on Expo than it ever was on the web.

Where the Water screen hangs in the navigation is **not** this spec's call — the tab set
and screen names are owned by the shell workstream (#306). This spec builds the screen and
the hook, and recommends mirroring the web: a Home water card that navigates to it.

### 3. Barcode scanning

The web puts a scan button beside the search field in `FoodEntryModal`; `BarcodeScanner`
opens a full-screen viewfinder (`html5-qrcode`) and `lookupBarcode` calls
`GET /api/food/barcode/:code` — which caches the product into the local food DB — falling
back to Open Food Facts directly when the backend can't answer.

Expo has no scanner and no camera dependency. The lookup half is already portable:
`frontend/src/features/energy/barcodeLookup.ts` is 80 lines of `fetch` and JSON shaping
with no DOM in it, and its only platform tie is `getApiBase()`.

### 4. Meal tools and Copy day — two buttons in the journal header

Both live at `Energy.tsx:448-465` and neither exists on Expo.

- **Meal tools** (`BulkFoodEntryModal`) is a three-tab bulk importer — paste text, dictate,
  or upload a CSV — parsing into an editable review table (name, meal, cal, P/C/F per row)
  and saving through `POST /api/food-entries/batch`.
- **Copy day** (`DuplicateDayDialog`) takes a source and a target date and posts to
  `POST /api/food-entries/duplicate-day`. Two date pickers over a live endpoint — the
  smallest task in this spec.

The plumbing is missing a layer down too: `mobile/src/core/api/food.ts` has no `addBatch`
and no `duplicateDay`, and `mobile/src/hooks/useEnergy.ts` exposes neither action, where
the web hook exposes both.

### 5. "Log again" — the cheapest capability in the audit

`useRecentFoods` ranks the user's own foods by how often they are logged *at this meal*,
then overall, then recency, over a bounded 300-entry window of data **already in the React
Query cache**. No request, no endpoint, no native module. `RecentFoodsStrip` renders the
chips above the search field, on the stated argument that searching for the same breakfast
every morning is the slowest way to log it.

It is a pure function of `FoodEntry[]`, and `useEnergy` on Expo already holds exactly that
array.

### 6. The food form, field by field

| | Web `FoodEntryModal` | Expo `FoodEntryFormScreen` |
|---|---|---|
| Meal picker | 4 segmented buttons | 4 segmented buttons — **matches** |
| Recent foods | yes | no |
| Search | always, incl. when editing | **only when creating** (`{!existing && …}`) |
| AI fallback | "Look up with AI" | no |
| Barcode | yes | no |
| Name | required, zod, max 100 | required, `name.trim()` only |
| Portion | `Select` of presets + Custom; grams internally | numeric field + preset chips; unit-aware |
| Portion unit | derived on save: `defaultUnit`, else `ml` for liquids, else `g` | first-class `portionUnit` state |
| `servingType` | state exists, **never set** — dead | not sent |
| Cal / P / C / F | 4 zod-validated fields | 4 unvalidated fields |
| `startTime` | `MEAL_START_TIMES[meal]` | `MEAL_START_TIMES[meal]` — **matches, same values** |
| Date | always today for a new entry | always today — **matches** |
| Presentation | centred `Dialog` | full-screen stack modal — platform-idiomatic, fine |

Two things fall out of that table.

**Validation.** `foodEntryFormSchema` lives in `packages/shared/src/schemas/foodEntry.ts`
under a comment saying it is there *"so both clients validate identically."* The web
imports it; Expo does not. Expo checks that the name is non-empty and sends
`parseFloat(x) || 0` for everything else — so it will save 99,999 kcal, and it turns a typo
into a silent `0`. `react-hook-form` and `@hookform/resolvers` are already in
`mobile/package.json`.

**Portion handling — Expo is ahead, and must not be regressed.** Expo carries a real
`portionUnit` through the form, offers `servingSizesInMl` for drinks and whole counts for
countable foods, and re-scales through `scalePortion` from `@trackvibe/shared/domain` using
the food's own `referenceGrams`. The web converts everything to grams internally and only
reconstructs a unit at save time, with its per-100g scaling hand-rolled inline rather than
using the shared helper that was derived from it. `packages/shared/src/domain/portion.ts:100-124`
documents exactly where seeding a drink at its serving size instead of 100 ml diverged by
2.5x — this area has been reasoned about carefully once already, and "conform to the web"
would undo it. See open question 2.

## Decisions that need making (tech-stack)

### D1 — how Expo gets a transcript

React Native has no Web Speech API, so the web's first step has no direct port. Two routes,
and they differ in more than plumbing:

| | Server transcription | On-device recognition |
|---|---|---|
| How | record audio → base64 → `POST /api/voice/transcribe` | platform ASR (`SFSpeechRecognizer` / Android `SpeechRecognizer`) |
| Module | `expo-audio` (the SDK 54 successor to `expo-av`); in the Expo Go runtime | `expo-speech-recognition` or `@react-native-voice/voice` — third-party native modules |
| Expo Go | **stays** | **leaves** — needs a custom dev client |
| Cost to user | `requirePro` → 10 AI calls/month on free tier (`middleware/requirePro.ts`); no live transcript; fails offline; a round-trip per utterance | free, live partial results, works offline — i.e. what the web actually does |
| Reuses the web pipeline | fully, from `parseFoodItems` onward | fully, from `parseFoodItems` onward |

`mobile/CLAUDE.md` is explicit: *"Don't add native modules that need a custom dev client
without saying so — the app currently runs in Expo Go, and breaking that changes everyone's
workflow."* So this is exactly the decision it asks to be surfaced. It is recorded as open
question 1 rather than settled in the plan.

`expo-audio`'s presence in the Expo Go runtime for SDK 54 must be **confirmed by installing
and recording on a device** before the task is committed to — the plan says so rather than
assuming it. There is no `node_modules` in this worktree to check against, and this
write-up does not drive a simulator.

### D2 — camera for barcode

`expo-camera` provides barcode scanning and is part of the Expo Go runtime, so unlike D1
this carries no dev-client consequence and no quota consequence. It is a straightforward
`global/tech-stack` addition: one dependency, one permission string
(`NSCameraUsageDescription` / `android.permission.CAMERA`) in `app.config.js`, which
currently declares no permissions at all.

## What already matches — verified, not assumed

- **The meal picker vocabulary and order** — `breakfast, lunch, dinner, snack`, lowercase
  on the wire, on both. Matches `global/domain-conventions`.
- **`MEAL_START_TIMES`** — `08:00 / 12:30 / 18:00 / 15:00`, identical constants in
  `FoodEntryModal.tsx:35-39`, `FoodEntryFormScreen.tsx:30-35` and `parseFoodText.ts:11-16`.
- **Default meal on open** — inferred from the hour with the same `<11 / <14 / <17`
  cut-offs, and a meal passed in from the tapped section wins over it, on both.
- **Food search** — both call `GET /api/food/search?q=&limit=` with a 300ms debounce and a
  2-character minimum, and both cap the visible list (web 10, Expo 8 of 10).
- **New entries are dated today** on both; neither form has a date picker.
- **Both derive `startTime` from the meal**, so an entry logged at 22:00 into Breakfast
  still reads as Breakfast.
- Expo's `FoodSearchResult` is the *fuller* of the two types — it already carries
  `defaultUnit`, `unitWeightGrams`, `preparation` and `imageUrl`, and its comment explains
  that hiding them is what previously broke drinks and countable foods.

## Open questions — recommendation only, not decided here

1. **D1: how Expo gets a transcript.** **Recommendation: ship server transcription first.**
   It is the smaller change, it keeps the app in Expo Go, it reuses `parseFoodItems`
   unaltered, and it closes a "the primary input method is entirely absent" gap in one
   release. Treat on-device recognition as a follow-up tied to whenever the app moves to a
   dev client for other reasons. The cost to accept knowingly: voice food logging on Expo
   lands behind the free tier's 10-call monthly AI quota, where the web's is unlimited.
2. **Portion model.** Expo's unit-aware model is better than the web's grams-internal one,
   and it is the model already captured in `packages/shared/src/domain/portion.ts`.
   **Recommendation: leave Expo alone and move the web onto the shared helpers** — the
   reverse of the usual direction. Not decided here because it changes the shipping client.
3. **The web's dead `servingType`.** `FoodEntryModal` declares the state and writes it on
   save, but nothing ever sets it to a non-empty value, so the field is never sent. Either
   the picker was lost or the state should go. Web-side cleanup, recorded so the Expo work
   does not faithfully reproduce a no-op.

## Constraints

- **No API changes.** Every endpoint named here already exists and is consumed by the web
  client and the MCP server, which ships separately.
- **`POST /api/food-entries/batch` caps `entries` at 50** (`createFoodEntriesBatchSchema`).
  Any bulk UI must chunk or refuse above that.
- **`/api/voice/*` and `/api/food/lookup-or-create` sit behind `requirePro`** — a 10-call
  monthly quota for free users, not a hard block. Anything built on them needs a
  `403 free_quota_exhausted` path.
- **Expo Go.** Nothing outside Task 1 leaves it. Task 1 might; that is D1.
- **No inline hex** — the AST guards in `mobile/src/theme/__tests__` fail the build.
- **Navigation is not this spec's.** The tab set and screen names belong to #306; the Paper
  theme belongs to the design-system workstream; `HomeScreen`'s calorie-goal source belongs
  to the Home workstream.
