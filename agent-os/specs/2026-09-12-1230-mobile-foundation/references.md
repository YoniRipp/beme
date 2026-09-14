# References

## Evidence behind this spec

The parity audit ran 11 agents across 8 domain areas on 2026-09-12.

| Measure | frontend/ | mobile/ |
|---|---:|---:|
| Non-test source files | 238 | 49 |
| Lines of code | 29,408 | 4,021 |
| Test suites | 36 | 0 |

Gaps by area: app shell 26, voice 23, workouts 22, insights 22, food 21, account 19,
goals 15, health trackers 14. **Total 162.**

## Verified defects (read, not inferred)

| File | Defect |
|---|---|
| `mobile/src/screens/WorkoutFormScreen.tsx` | No `repsPerSet`/`weightPerSet`/`completedPerSet`; editing destroys per-set data |
| `mobile/src/core/api/food.ts:21` | `/api/food-entries` fetched with no `limit`/`offset`; totals truncate at 50 |
| `mobile/src/screens/FoodEntryFormScreen.tsx:108` | Hard-codes `portionUnit: 'g'`, scales `/100`, ignores `referenceGrams`/`isLiquid`/`unitWeightGrams` |
| `mobile/src/screens/SettingsScreen.tsx:61` | "Clear All Data" confirm handler only closes the dialog; deletes nothing |

## Voice spike, 2026-09-12

Run on the iPhone 17 Pro simulator against Expo Go, SDK 54. Throwaway; code deleted.

| Step | Result |
|---|---|
| Mic permission | granted |
| 3s record | 90,971 bytes |
| Base64 read | 121,296 chars |
| WebSocket open | 52ms |
| Binary frame | 30,000 bytes sent + acked |
| Control frames | `start` / `stop` acked |

Not proven: the live Gemini round-trip (no `GEMINI_API_KEY` in the dev environment) and
real-speech latency. `backend/index.ts:58` only mounts the voice WS when both
`config.voiceStreaming` and `config.geminiApiKey` are set.

## Dependency alignment, 2026-09-12

`npx expo install --fix` corrected five packages that were off SDK 54, which had caused a
render crash in `RootNavigator.tsx` (`expected dynamic type 'boolean', but had type 'string'`).
Most notable: `expo-linear-gradient` was pinned at `^55.0.8`, a version that does not exist for
this SDK line — and nothing in `mobile/src` imports it. It should be dropped.

## Related work

Two bugs found while booting the app were filed separately and are **not** in this spec's scope:

- Food entry date off-by-one in timezones ahead of UTC (`backend/src/models/foodEntry.ts:15`).
  Affects both clients — the mobile dashboard reads "0 meals logged" for food logged today.
- `user_profiles` NOT NULL drift breaking new-user onboarding.
