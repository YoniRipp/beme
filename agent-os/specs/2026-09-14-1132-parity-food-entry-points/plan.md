# Plan — Parity: the capabilities Expo has no entry point for

Status: **not started.** This is an audit write-up; no application code has been changed.

**No backend work anywhere in this spec.** Every task below is backed by an endpoint that
already exists, or needs none. Each task states which, and which native module (if any) it
requires — that is a `global/tech-stack` decision and it is written down as one.

Tasks are independent apart from the stated dependencies, so a stall on Task 1's open
question does not block the rest.

| Task | Endpoint | New endpoint? | Native module |
|---|---|---|---|
| 1 Voice | `/api/voice/transcribe`, `/api/food/search`, `/api/food/lookup-or-create`, `/api/food-entries/batch` | no | **yes** — see D1 |
| 2 Water | `/api/water-entries` ×5, `/api/profile` | no | no |
| 3 Barcode | `/api/food/barcode/:code` | no | **yes** — `expo-camera` |
| 4 Batch + duplicate plumbing | `/api/food-entries/batch`, `/api/food-entries/duplicate-day` | no | no |
| 5 Copy day | `/api/food-entries/duplicate-day` | no | no |
| 6 Meal tools | `/api/food-entries/batch` | no | no (CSV deferred) |
| 7 Food form | `/api/food/search`, `/api/food/lookup-or-create` | no | no |

## Task 0 — Save spec documentation

- [x] `shape.md` — the capability table, the gaps in cost order, D1/D2, what matches
- [x] `standards.md` — which standards apply and the points carried into the work
- [x] `references.md` — the code read on both sides before writing any of this
- [x] `plan.md` — this file

## Task 1 — Voice food logging *(blocked on open question 1 / D1)*

**Endpoints: all exist.** **Native module: yes — decision required before starting.**

Files: `packages/shared/src/domain/foodText.ts` (new), `mobile/src/core/api/voice.ts` (new),
`mobile/src/hooks/useVoiceFoodEntry.ts` (new),
`mobile/src/components/energy/QuickVoiceSheet.tsx` (new),
`mobile/src/screens/EnergyScreen.tsx`

- [ ] **Settle D1 first.** Everything below assumes server transcription
      (`expo-audio` → `POST /api/voice/transcribe`, stays in Expo Go). The on-device route
      (`expo-speech-recognition` / `@react-native-voice/voice`, leaves Expo Go, needs a
      custom dev client) changes only the first step — the rest of the task is identical.
- [ ] **Confirm the audio module runs in Expo Go before building on it.** `npx expo install
      expo-audio`, record and play back on a device. If it turns out to need a dev client,
      that reopens D1 rather than being worked around quietly.
- [ ] Move `frontend/src/features/energy/parseFoodText.ts` into
      `packages/shared/src/domain/` and repoint the web at it in the same change. It is
      pure string handling — no DOM, no React — and it is the largest single piece of reuse
      in this spec. It carries a Title-Case `MealType`; normalise to the lowercase wire
      union at the boundary rather than widening the shared domain type. Its tests move
      with it.
- [ ] `core/api/voice.ts` — `transcribe(base64, mimeType)` against
      `POST /api/voice/transcribe`. Handle `413` (recording too long),
      `403 free_quota_exhausted` and `503` (`GEMINI_API_KEY` unset) with distinct copy. A
      silent failure on the product's primary input method is the worst possible outcome.
- [ ] Port the resolution loop from `QuickVoiceEntry.resolveItems`: `searchFoods(name, 1)`
      first, `lookupOrCreateFood(name)` as fallback; per-item meal from the transcript when
      it names one, else the meal the sheet was opened from, else the hour. Port it — do
      not re-derive it.
- [ ] A review bottom sheet before saving: one row per item with name, kcal, P/C/F, a meal
      reassignment control and a remove button, then **Save All (N)**. The review step
      exists because ASR mishears food names; dropping it is not a simplification.
- [ ] Save through `POST /api/food-entries/batch` (Task 4 adds the client).
- [ ] Meal cards get a primary **Voice log** action with **Add** demoted beside it, matching
      `MealJournalCard.tsx:94-111`. The hierarchy is the point, not the presence of a mic.
- [ ] Language toggle: the web offers `en-US` / `he-IL` and remembers the choice.
- [ ] Microphone permission string in `app.config.js`, which currently declares none.

## Task 2 — Water

**Endpoints: all 5 exist.** **Native module: none.**

Files: `mobile/src/core/api/water.ts` (new), `mobile/src/hooks/useWater.ts` (new),
`mobile/src/screens/WaterScreen.tsx` (new), `mobile/src/lib/queryKeys.ts`,
`mobile/src/core/api/profile.ts` + `mobile/src/hooks/useProfile.ts` (shared with
`2026-09-14-1130` Task 3 — whichever lands first creates them)

- [ ] `core/api/water.ts` — `getToday(date)`, `history(start, end)`, `upsert({date, glasses})`,
      `addGlass(date)`, `removeGlass(date)` against `GET /api/water-entries`,
      `GET /api/water-entries/history`, `PUT /api/water-entries`,
      `POST /api/water-entries/add-glass`, `POST /api/water-entries/remove-glass`.
- [ ] `useWater` ported from `frontend/src/hooks/useWater.ts`, keeping **both** of the
      things its comments exist to protect:
      - `setGlasses` writes the day's whole count in **one** request. Tapping the 6th tile
        must not fire six sequential calls.
      - The `latestSetRef` request counter, so a slow reply for "3" cannot overwrite a later
        "5". Taps outrun responses on a phone more than they ever did in a browser.
      Optimistic `setQueryData` in `onMutate`, rollback in `onError` **only** if nothing
      newer has been applied, server response authoritative in `onSuccess`, no refetch.
- [ ] `queryKeys.waterToday(date)` and `queryKeys.waterHistory` — date-keyed, as the web's
      are; never an inline array.
- [ ] `WaterScreen`: ring (`components/shared/ProgressRing`, already present), the grid of
      tappable glass tiles with the web's "tap the last filled tile to clear it" rule, +/-
      controls, and the `ml` readout. Goal from `profile.waterGoalGlasses`, defaulting to 8.
- [ ] Register the screen in `RootNavigator`. **Where it hangs in the navigation is not this
      spec's call** — the tab set and screen names belong to #306. Recommendation, matching
      the web: a Home water card (`WaterTracker`) that navigates to it. Coordinate rather
      than inventing a tab.
- [ ] Water goal in Settings, as `ProfileSection` has it — depends on the profile client.

## Task 3 — Barcode scanning

**Endpoint exists.** **Native module: `expo-camera`** (in the Expo Go runtime; no dev
client, no quota).

Files: `packages/shared/src/domain/barcode.ts` (new),
`mobile/src/components/energy/BarcodeScannerScreen.tsx` (new),
`mobile/src/screens/FoodEntryFormScreen.tsx`, `mobile/app.config.js`

- [ ] Move `frontend/src/features/energy/barcodeLookup.ts` into `packages/shared` and
      repoint the web at it. It is `fetch` + JSON shaping; its one platform tie is
      `getApiBase()`, which becomes a parameter.
- [ ] `expo-camera` viewfinder. Request permission with a real explanation and handle
      denial the way `BarcodeScanner.tsx:44-50` does — a distinct message for "permission
      denied" versus "camera busy".
- [ ] Camera permission string in `app.config.js`.
- [ ] Scan button beside the search field, matching the web's placement.
- [ ] On a hit: fill name and per-100 macros, seed the portion, toast `Found: <name>`. On a
      miss: toast and leave the form usable for manual entry — never a blank form and no
      explanation.
- [ ] Keep the Open Food Facts direct call as the fallback, as the web does.

## Task 4 — Batch and duplicate-day plumbing

**Both endpoints exist.** **Native module: none.** Prerequisite for Tasks 1, 5 and 6.

Files: `mobile/src/core/api/food.ts`, `mobile/src/hooks/useEnergy.ts`

- [ ] `foodApi.addBatch({ date, entries })` → `POST /api/food-entries/batch`. Cap at 50
      client-side to match `createFoodEntriesBatchSchema`.
- [ ] `foodApi.duplicateDay(sourceDate, targetDate)` → `POST /api/food-entries/duplicate-day`.
- [ ] `useEnergy` gains `addFoodEntriesBatch` and `duplicateDay`, both `Promise<void>`, both
      writing the returned rows into the cache with `setQueryData` — the same shape as
      `frontend/src/hooks/useEnergy.ts:139-172`. No `invalidateQueries`.
- [ ] Dates go over the wire as `YYYY-MM-DD` via `toLocalDateString`, never
      `toISOString().slice(0,10)`.

## Task 5 — Copy day

**Endpoint exists.** **Native module: none.** The smallest task here. Depends on Task 4.

Files: `mobile/src/components/energy/DuplicateDayDialog.tsx` (new),
`mobile/src/screens/EnergyScreen.tsx`

- [ ] Paper `Dialog` with source and target date pickers, defaulting to today and tomorrow
      as the web does.
- [ ] Refuse when the two dates are equal, with the web's message.
- [ ] Success toast naming the target day; failure toast that keeps the dialog open.
- [ ] Reachable from the journal header, alongside Meal tools.

## Task 6 — Meal tools (bulk entry)

**Endpoint exists.** **Native module: none** for text and voice. Depends on Tasks 1 and 4.

Files: `mobile/src/components/energy/BulkFoodEntrySheet.tsx` (new)

- [ ] Text and voice tabs. **CSV upload is deliberately deferred** — it needs a document
      picker and a file reader, and pasting text covers the same need on a phone. Say so in
      the UI rather than shipping a dead tab.
- [ ] Parse with the shared `parseFoodItems` from Task 1, resolve with the same loop, and
      show the same editable review table: name, meal, cal, P/C/F per row.
- [ ] Save through `addFoodEntriesBatch`, chunked at 50.

## Task 7 — The food form itself

**Endpoints exist.** **Native module: none.**

Files: `mobile/src/screens/FoodEntryFormScreen.tsx`

- [ ] **Validate with the shared schema.** Import `foodEntryFormSchema` from
      `@trackvibe/shared/schemas` through `react-hook-form` + `@hookform/resolvers/zod` —
      both already in `mobile/package.json`. The schema exists precisely so both clients
      validate identically; today only one does. `WorkoutFormScreen` is the in-repo
      precedent.
- [ ] **Search while editing.** Drop the `{!existing && …}` guard — correcting a wrong pick
      is exactly when you need search, and the web allows it.
- [ ] **"Look up with AI" fallback** when search returns nothing, as the web's empty state
      does, with the `403 free_quota_exhausted` path handled.
- [ ] **"Log again" chips.** Move `frontend/src/hooks/useRecentFoods.ts` into
      `packages/shared` — a pure function of `FoodEntry[]` — and render the strip above the
      search field. **No endpoint**: it reads entries `useEnergy` already holds. Keep the
      300-entry scan window and the 8-suggestion cap.
- [ ] Do **not** change the portion model (open question 2). Expo's is the better one.

## Verification

- [ ] `mobile: npx tsc --noEmit`
- [ ] `mobile: npm test`
- [ ] `packages/shared: npx vitest run` — `parseFoodItems`, barcode lookup and the
      recent-food ranking each arrive with the tests they already have
- [ ] `frontend: npx tsc --noEmit` and `npx vitest run` — Tasks 1, 3 and 7 each move a
      module into `packages/shared` and repoint the web; the shipping client must stay green
- [ ] On a device: log the same meal by voice on both clients and diff the saved rows —
      name, `mealType`, `startTime`, portion, macros
- [ ] On a device: scan the same barcode on both and compare
- [ ] Water: tap the 6th tile and confirm **one** request goes out; then tap 3 → 5 quickly
      on a throttled connection and confirm the count settles on 5
- [ ] Free-tier account: the quota-exhausted path shows a real message on the voice sheet
      and on the AI lookup

## Deliberately not done

- **No backend work.** Every endpoint is live. An implementation finding itself adding a
  route has misread something.
- **CSV import on Expo** — deferred with a reason (Task 6), not forgotten.
- **Changing Expo's portion model to match the web's** — open question 2; Expo's is better
  and `packages/shared/src/domain/portion.ts` already documents why.
- **Removing the web's dead `servingType` state** — open question 3, web-side cleanup.
- **The global voice agent / AI coach mic** — a different surface from meal-section voice
  logging.
- **Navigation.** Where the Water screen and the journal actions sit in the tab set belongs
  to #306; this spec builds the screens and says what it recommends.
- **Cycle and weight tracking.** Also web-only, also outside the food-and-journal area.
