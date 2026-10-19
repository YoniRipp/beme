# References — code read before writing this spec

Every claim in `shape.md` was checked against both trees at `origin/main` (`6750660`).

## Web — the reference client

| File | What it establishes |
|---|---|
| `frontend/src/pages/Energy.tsx` | Four periods with per-period chip summaries; `periodTotals` averaging for non-daily (`:205-226`); the calorie ring and its `/ day` label (`:393-404`); `groupFoodEntries` (`:35-85`) and `CollapsibleGroup` (`:95-148`); independent `sleepPeriod`; the non-period-filtered sleep log (`:261-267`); the entry comparator (`:176-190`) |
| `frontend/src/features/energy/mealType.ts` | The Title-Case display union, `getMealType` precedence, `groupByMeal`, and the `<11 / <14 / <17` cut-offs |
| `frontend/src/components/energy/MealJournalCard.tsx` | Four always-rendered meal cards, per-meal kcal + P/C/F header, voice + add actions |
| `frontend/src/components/energy/FoodCard.tsx` | Card anatomy: image, name, portion, calories |
| `frontend/src/hooks/useFoodImages.ts` | Keyword → Pexels URL, static map, no request |
| `frontend/src/hooks/useEnergy.ts` | `staleTime: 2 * 60 * 1000`; `setQueryData` on every mutation; also `addFoodEntriesBatch` / `duplicateDay`, which Expo lacks |
| `frontend/src/hooks/useMacroGoals.ts` | Goal source: profile macros, `carbs*4 + fat*9 + protein*4` |
| `frontend/src/components/shared/PeriodSelector.tsx` | Two-line chip: label over summary |

## Expo — the client being brought into line

| File | What it establishes |
|---|---|
| `mobile/src/screens/EnergyScreen.tsx` | Food/Sleep `SegmentedButtons` (`:199-206`); one shared `period`; `totals` as a bare sum (`:158-163`); flat non-daily list (`:264-275`); `inferMeal` using shared `inferMealTypeFromHour` (`:36-41`); sleep filtered to the period and to `sleepHours != null` (`:153-156`) |
| `mobile/src/components/shared/PeriodSelector.tsx` | Same four periods, label-only Paper `Chip`s |
| `mobile/src/components/shared/MobileFoodCard.tsx` | Generic `food-apple` icon, no date, adds a P/C/F line the web card does not have |
| `mobile/src/components/shared/ProgressRing.tsx` | The ring primitive already exists (`react-native-svg`) |
| `mobile/src/hooks/useEnergy.ts` | Same mutation strategy as the web, no `staleTime`, no batch/duplicate actions |
| `mobile/src/core/api/` | `auth`, `client`, `food`, `goals`, `pagination`, `users`, `workouts` — **no `profile`** |
| `mobile/src/lib/queryKeys.ts` | `goals`, `workouts`, `checkIns`, `foodEntries` — no `profile` |
| `mobile/src/lib/queryClient.ts` | Default `staleTime: 60 * 1000`, one retry, no retry on 401 |
| `mobile/src/types/navigation.ts` | `FoodEntryForm: { entryId?: string } \| undefined` — missing the `mealType` param the screen actually passes |
| `mobile/src/screens/HomeScreen.tsx` | `:112-113` reads a `calories` goal row for its target — a different source from the web Energy page, owned by another workstream |

## Shared

| File | What it establishes |
|---|---|
| `packages/shared/src/domain/meals.ts` | `inferMealTypeFromHour` — the web's cut-offs, imported by Expo only |
| `packages/shared/src/domain/dates.ts` | `getPeriodRange`, `WEEK_SUNDAY`, `toLocalDateString`, `parseLocalDateString` — used by both |
| `packages/shared/src/types/energy.ts` | `FoodEntry` / `DailyCheckIn`, re-exported by both clients |
| `packages/shared/src/domain/analytics.ts` | Precedent: the web's implementation moved here verbatim and both clients repointed |

## Backend — to confirm nothing here needs API work

| File | What it establishes |
|---|---|
| `backend/src/routes/profile.ts` | `GET /api/profile`, `PUT /api/profile` already exist |
| `backend/src/routes/foodEntry.ts` | list / add / batch / duplicate-day / patch / delete already exist |
| `backend/src/routes/dailyCheckIn.ts` | list / add / patch / delete already exist |
| `backend/src/schemas/routeSchemas.ts` | `createCheckInSchema` allows a check-in with no `sleepHours` — the premise of open question 1 |

## Standards

- `agent-os/standards/global/domain-conventions.md`
- `agent-os/standards/frontend/data-fetching.md`
- `agent-os/standards/frontend/mobile-ui.md`
- `CLAUDE.md`, `frontend/CLAUDE.md` (`mobile/CLAUDE.md` exists on the
  `claude/docs-mobile-is-the-native-client` branch, not yet on `main`)
