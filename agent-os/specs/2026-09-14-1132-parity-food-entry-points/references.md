# References — code read before writing this spec

Every claim in `shape.md` was checked against both trees at `origin/main` (`34a51d9`).
No simulator and no browser were driven; everything here is read from source.

## The three absences, as measured

```
grep -rEin "voice|speech|microphone|recording|expo-av|expo-audio"  mobile/src   →  0
grep -rEin "barcode|expo-camera|Camera"                            mobile/src   →  0
grep -rin  "water"                                                 mobile/      →  0
```

`mobile/src/core/api/` contains `auth`, `client`, `food`, `goals`, `pagination`, `users`,
`workouts` — no `voice`, no `water`, no `profile`.
`mobile/src/lib/queryKeys.ts` contains `goals`, `workouts`, `checkIns`, `foodEntries`.
`mobile/app.config.js` declares no permissions of any kind.

## Web — the reference client

| File | What it establishes |
|---|---|
| `frontend/src/components/energy/QuickVoiceEntry.tsx` | The voice flow end to end: `useBrowserSpeech` → `parseFoodItems` → `searchFoods` / `lookupOrCreateFood` → review sheet with per-item meal reassignment → batch save. **Never calls `/api/voice/*`** |
| `frontend/src/features/energy/parseFoodText.ts` | The transcript parser — pure, no DOM; `"Breakfast: 2 eggs"`, `"… for lunch"`, amount+unit prefix/suffix, count+item; `MEAL_TIMES` `08:00/12:30/15:00/18:00` |
| `frontend/src/hooks/useBrowserSpeech.ts` | Web Speech API directly, on-device, `en-US` / `he-IL` — the step React Native has no equivalent for |
| `frontend/src/components/energy/MealJournalCard.tsx` | `:94-111` — full-width primary **Voice log**, **Add** demoted beside it |
| `frontend/src/components/energy/BarcodeScanner.tsx` | `html5-qrcode` viewfinder; `:44-50` distinguishes "permission denied" from "camera busy" |
| `frontend/src/features/energy/barcodeLookup.ts` | Backend-first (`/api/food/barcode/:code`, which caches), Open Food Facts fallback; `fetch` + JSON only |
| `frontend/src/components/energy/BulkFoodEntryModal.tsx` | Three tabs — text / voice / CSV — into an editable review table, saved via batch |
| `frontend/src/components/energy/DuplicateDayDialog.tsx` | Two dates, refuses equal dates, toasts the target day |
| `frontend/src/components/energy/FoodEntryModal.tsx` | The field-by-field table in `shape.md`: search always available, AI fallback, barcode button, portion `Select`, zod validation, `servingType` declared at `:122` and written at `:428` but never set |
| `frontend/src/hooks/useRecentFoods.ts` | Ranking: at-this-meal count → overall count → recency; 300-entry window, 8 suggestions; pure, no request |
| `frontend/src/hooks/useEnergy.ts` | `:139-172` — `addFoodEntriesBatch` and `duplicateDay`, both `setQueryData` |
| `frontend/src/pages/Water.tsx` | Ring, glass-tile grid ("tap the last filled tile to clear it"), +/-, `ml` readout, goal from `profile.waterGoalGlasses` |
| `frontend/src/hooks/useWater.ts` | One request per change (`setGlasses`), and the `latestSetRef` guard against out-of-order replies — both with comments explaining the bug they fixed |
| `frontend/src/components/home/WaterTracker.tsx` | The Home card that links to `/water` — the recommended Expo entry point |
| `frontend/src/components/settings/ProfileSection.tsx` | `waterGoalGlasses` is edited in Settings, 1-30 |
| `frontend/src/hooks/useNativeSpeech.ts` | Precedent: on-device recognition already existed in the legacy Capacitor shell |

## Expo — the client being brought into line

| File | What it establishes |
|---|---|
| `mobile/src/screens/EnergyScreen.tsx` | The meal header's only control is **Add** (`:237-239`); no voice, no meal tools, no copy day |
| `mobile/src/screens/FoodEntryFormScreen.tsx` | Search gated behind `{!existing && …}` (`:219`); validation is `name.trim()` only (`:184-187`); `parseFloat(x) \|\| 0` for every macro; `MEAL_START_TIMES` identical to the web's; unit-aware portion model on `scalePortion` / `defaultPortionFor` / `servingSizesInMl` |
| `mobile/src/core/api/food.ts` | `list` / `listAll` / `add` / `update` / `delete` / `searchFoods` — **no `addBatch`, no `duplicateDay`, no `lookupOrCreateFood`**. `FoodSearchResult` here is the fuller of the two types |
| `mobile/src/hooks/useEnergy.ts` | Exposes neither batch nor duplicate-day |
| `mobile/src/navigation/RootNavigator.tsx` | Stack: `Main`, `WorkoutForm`, `FoodEntryForm`, `SleepForm`, `GoalForm` — no water, no scanner |
| `mobile/src/components/shared/ProgressRing.tsx` | The ring the water screen needs already exists (`react-native-svg`) |
| `mobile/package.json` | `react-hook-form` + `@hookform/resolvers` already present; no camera, no audio |
| `mobile/CLAUDE.md` | "Don't add native modules that need a custom dev client without saying so" — the reason D1 is an open question |

## Backend — confirming there is no API work

| File | What it establishes |
|---|---|
| `backend/src/routes/voice.ts` | `POST /api/voice/understand`, `POST /api/voice/transcribe` — both behind `requireAuth` + `requirePro` |
| `backend/src/controllers/voice.ts` | `transcribe` takes base64 + mimeType **synchronously**, no Redis; `understand` needs Redis only for the audio path, not the transcript path |
| `backend/src/routes/foodSearch.ts` | `GET /api/food/search`, `GET /api/food/barcode/:code`, `POST /api/food/lookup-or-create` |
| `backend/src/routes/foodEntry.ts` | `POST /api/food-entries/batch`, `POST /api/food-entries/duplicate-day` |
| `backend/src/routes/water.ts` | All five water routes |
| `backend/src/routes/profile.ts` | `GET` / `PUT /api/profile` — carries `waterGoalGlasses` |
| `backend/src/schemas/routeSchemas.ts` | `createFoodEntriesBatchSchema` caps `entries` at 50 |
| `backend/src/middleware/requirePro.ts` | Not a hard block: 10 AI calls per calendar month on the free tier, then `403 free_quota_exhausted` |

## Shared

| File | What it establishes |
|---|---|
| `packages/shared/src/schemas/foodEntry.ts` | `foodEntryFormSchema`, there "so both clients validate identically" — imported by the web, **not** by Expo |
| `packages/shared/src/domain/portion.ts` | `scalePortion` / `defaultPortionFor` / `servingSizesInMl`; `:100-124` documents the 2.5x drink divergence — the basis for open question 2 |
| `packages/shared/src/domain/meals.ts` | `inferMealTypeFromHour`, imported by Expo only |
| `packages/shared/src/constants/limits.ts` | Client guard rails, deliberately no looser than the server's |
| `packages/shared/src/domain/analytics.ts` | Precedent for the moves in this plan: the web's implementation moved verbatim, both clients repointed |

## Standards and context

- `agent-os/standards/global/domain-conventions.md` — the voice-first rule, meal types, dates
- `agent-os/standards/frontend/data-fetching.md`
- `agent-os/standards/frontend/mobile-ui.md`
- `CLAUDE.md`, `frontend/CLAUDE.md`, `mobile/CLAUDE.md`

## Related work, deliberately not restated here

- `agent-os/specs/2026-09-14-1130-parity-food-journal-screen/` (PR #304) — the journal
  screen's totals, rings, grouping and sleep. Its Task 3 introduces the Expo profile
  client that this spec's water task also needs.
- #306 — tab set and screen names. Route-level navigation is not this spec's.
- #302 / #307 (Home), #303 (workouts), #305 (goals).
