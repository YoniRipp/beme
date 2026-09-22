# Parity: the Journal screen — Shaping Notes

## Scope

`frontend/src/pages/Energy.tsx` (web, the shipping client) and
`mobile/src/screens/EnergyScreen.tsx` (Expo, the native client) are meant to be the same
screen. They agree on the meal vocabulary and the period vocabulary, and then diverge on
almost everything the user reads off the screen: the numbers, the goal, the shape of the
history, and where sleep lives.

This spec covers the screen itself — totals, rings, grouping, sleep. The missing *entry
points* (voice, barcode, meal tools, copy day, "Log again") are a separate spec,
`2026-09-14-1132-parity-food-entry-points`. Water is a third,
`2026-09-14-1134-parity-water-screen`.

**The web is the reference.** Where Expo's behaviour is arguably better, it is recorded as
an open question below rather than decided here.

## What is actually wrong

### 1. Expo sums where the web averages — the same week reads ~7x higher

The web's `periodTotals` (`Energy.tsx:205-226`) divides by the number of distinct days with
entries for every period except `daily`, and labels the ring `of {goal}/ day kcal`. Its
period chips do the same (`Energy.tsx:384-387`): `daily` shows a total, the other three
show `${avg} avg`.

Expo's `totals` (`EnergyScreen.tsx:158-163`) is a plain `reduce` over every entry in range,
displayed under a `Calories` eyebrow with no qualifier. Pick "Weekly" on both clients on
the same account and the web says `2,010` while Expo says `14,070`.

The same applies to the per-bucket rollups: the web's `CollapsibleGroup` averages per day
for monthly and yearly (`Energy.tsx:110-115`, `"N cal/day"`), Expo has no buckets at all.

This is the highest-severity item in the spec: it is not a layout difference, it is the
same data reported as a different number.

### 2. There is no goal on the Expo screen

The web shows a 132px calorie ring against `calorieGoal` from `useMacroGoals`
(`macroCarbs * 4 + macroFat * 9 + macroProtein * 4`, from `/api/profile`), three macro
rings via `MacroCircles`, and a `MacroGoalModal` to edit the targets in place. Expo shows a
number and three plain `P/C/F` strings, with nothing to compare them to.

Expo already has the pieces: `components/shared/ProgressRing.tsx` (SVG ring, themed) and
`react-native-svg`. What it does not have is any profile client — `mobile/src/core/api/`
has `auth`, `client`, `food`, `goals`, `pagination`, `users`, `workouts` and no `profile`,
so `GET/PUT /api/profile` has to be wired up before the ring has a target to draw.

> The Home screen's calorie target is sourced differently again (`HomeScreen.tsx:112-113`
> reads a `calories` **goal row**, not the profile macros). That discrepancy is owned by
> another workstream — this spec does not touch `HomeScreen` and does not re-decide it. It
> only requires that the Expo **Energy** screen use the same source the web **Energy** page
> uses, so the two Journal screens agree with each other.

### 3. Weekly / monthly / yearly history is an undifferentiated list

The web renders non-daily periods as a `Card` of collapsible buckets — by day for weekly,
by Sunday-week for monthly, by month for yearly — each with its own entry count, day count
and calorie rollup, first bucket open (`Energy.tsx:35-85`, `95-148`, `489-505`). Expo
renders every entry in the range as a flat stack of `MobileFoodCard`s
(`EnergyScreen.tsx:264-275`). On a yearly period that is one scroll of hundreds of
identical cards with no dates on them — `MobileFoodCard` never renders the entry date.

### 4. Sleep is behind a tab, and shares the food period selector

The web puts sleep in a card at the bottom of the same scroll, with **its own** period
selector (`sleepPeriod` is independent of `caloriePeriod`) and a "Sleep log" list that is
deliberately *not* period-filtered — it shows everything from the start of last week
onward, so the list is useful whatever period is selected (`Energy.tsx:261-267`).

Expo hides food behind a `SegmentedButtons` Food/Sleep switch and reuses the one shared
`period` for both. Consequences: you cannot see food and sleep at once; the default
"Daily" sleep tab shows at most one row; and the only way to see last week's sleep is to
change a control that also changes the food view you will return to.

### 5. Smaller mismatches, same screen

- **Ordering inside a meal.** The web sorts entries with a time before entries without,
  then by `startTime` ascending (`Energy.tsx:176-190`). Expo sorts by `date` only
  (`EnergyScreen.tsx:149`) — and within one day every entry has the same date, so the
  order inside a meal card is whatever the API happened to return.
- **Period chips carry no data.** The web's chips are two-line (label + the period's
  calories); Expo's are Paper `Chip`s with a label only. Choosing a period on Expo is a
  blind tap.
- **No food photo.** The web's `FoodCard` resolves a Pexels URL by keyword through
  `getFoodImageUrl` (`hooks/useFoodImages.ts` — a static map, no request, works offline)
  and falls back to `ImagePlaceholder`. Expo draws the same `food-apple` icon for every
  entry. `useFoodImages` is a pure `[keyword, url][]` lookup and belongs in
  `packages/shared`.
- **Screen naming.** The web page is "Food log" with a "Journal" section inside it and a
  "Food" tab label; Expo names the whole screen "Journal" behind an "Energy" tab. (Tab
  labels sit with whoever owns navigation; the in-screen title does not.)
- **`RootStackParamList` is out of date.** It declares
  `FoodEntryForm: { entryId?: string } | undefined`, but `EnergyScreen` navigates with
  `{ mealType }` and `FoodEntryFormScreen` reads `route.params?.mealType`. Both sides use
  `useRoute<any>()` / `useNavigation<any>()`, so TypeScript never sees it.

## What already matches — verified, not assumed

Worth recording, because these were the obvious suspects:

- **Meal types.** Both clients use exactly `breakfast | lunch | dinner | snack` and both
  persist them lowercase, which is what `agent-os/standards/global/domain-conventions.md`
  requires. The web's `MealType` union is Title-Case (`'Breakfast'`) but that is a display
  type — `FoodEntryModal` and the `defaultMealType` prop both lower-case at the boundary.
  **No domain bug here.**
- **Meal inference.** Stored `mealType` wins on both; otherwise the hour comes from
  `startTime ?? endTime`, else the entry date. The cut-offs are identical
  (`<11` breakfast, `<14` lunch, `<17` snack, else dinner) — Expo imports
  `inferMealTypeFromHour` from `@trackvibe/shared/domain`, the web keeps its own copies
  (see the open question).
- **Meal start times.** `08:00 / 12:30 / 18:00 / 15:00` on both.
- **The period vocabulary.** Both offer Daily / Weekly / Monthly / Yearly, both resolve
  ranges through the same `getPeriodRange` in `@trackvibe/shared/domain`, both weeks start
  Sunday.
- **The four meal sections always render on Daily,** empty ones included, on both clients.
- **Meal iconography** is conceptually the same (sun / partly-cloudy / sunset / cookie).
- **`useEnergy` mutation strategy.** Both use `setQueryData` rather than `invalidateQueries`,
  both expose `Promise<void>` actions and an error string, both map API → domain through an
  `apiFoodEntryToFoodEntry` that is byte-identical apart from import paths. This part of
  `frontend/data-fetching` is honoured on both sides.
- **Delete confirmation** exists on both.

## Open questions — recommendation only, not decided here

1. **Sleep average denominator.** The web divides total hours by *every* check-in in range
   (`Energy.tsx:236-245`), so a check-in saved with no `sleepHours` — which
   `createCheckInSchema` allows — counts as a logged day of 0h and drags the average down.
   Expo filters `sleepHours != null` first (`EnergyScreen.tsx:153-156`). **Expo is right and
   the web has the bug.** Recommendation: fix the web rather than copy it, in a separate
   change so this parity work does not silently alter a number on the shipping client.
2. **Food/Sleep as a segmented tab.** Expo's tab is a defensible small-screen pattern. The
   ground rule says the web is the reference, so this spec plans for one scroll. If the
   owner prefers the tab, the fix is narrower: give sleep its own period state and stop
   period-filtering the sleep log.
3. **Meal inference lives in `packages/shared` and only Expo uses it.** The web has three
   copies of the same cut-offs (`features/energy/mealType.ts`, `FoodEntryModal`'s
   `getCurrentMealType` + `inferMealTypeFromEntry`, `parseFoodText.inferMealFromTime`).
   They agree today. Recommendation: point the web at `inferMealTypeFromHour` too — that is
   a web-side change and belongs to whoever owns the web Energy page.

## Constraints

- **No API changes.** Everything here is a client-side read of endpoints that already
  exist. The MCP server and the web client consume the same routes.
- **No new native modules.** Nothing in this spec needs anything outside Expo Go; the
  calorie ring uses `react-native-svg`, which is already a dependency.
- **No inline hex.** `mobile/src/theme/__tests__` has AST guards that fail the build on a
  frozen hex value — every colour goes through `useThemedStyles` / `useAppTheme`.
- **Per-user data stays bounded.** `foodApi.listAll()` already walks pages under
  `MAX_PAGES`; nothing here widens that read.
- Do not restyle the Paper theme — the purple leak is owned by the design-system
  workstream.
