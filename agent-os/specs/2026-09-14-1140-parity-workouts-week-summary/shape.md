# Workouts Parity — Week Summary, Filters and the Workout List

## Scope

The Expo Body screen and the web Body page are showing different things about the same
data. This spec covers the **list surface**: the header block, the type filters, how
workouts are bucketed into sections, the card itself, and the empty states.

The add/edit flow is a separate spec (`2026-09-14-1143-parity-workouts-editor`). Voice and
weight are a third (`2026-09-14-1146-parity-workouts-voice-and-weight`).

**The web is the reference.** `frontend/src/pages/Body.tsx` ships to users today; Expo
conforms to it. Two places where Expo's existing behaviour is arguably better are recorded
as open questions rather than decided here.

## What each client computes today

| | Web (`pages/Body.tsx`) | Expo (`screens/BodyScreen.tsx`) |
|---|---|---|
| Header block | Weekly goal ring: eyebrow `Goal · 4/week`, `{n}/4`, `ProgressRing` 72px, plus a Mon–Sun day strip with a tick per day that has a workout and a ring on today | Two `MetricCard`s: `THIS WEEK` = count of this week's workouts, meta `workouts`; `VOLUME` = **count of exercises**, meta `{minutes} min` |
| Week window | `getPeriodRange('weekly')` → Sun–Sat | `startOfWeek(now, { weekStartsOn: 0 })` → Sun–Sat |
| Type filter | All · Strength · Cardio · Flexibility | All · Strength · Cardio |
| Sections | Upcoming (asc) · This week · Last week · Earlier, each grouped by day with `Today` / `Yesterday` / `EEEE, MMM d` headers | This week · Older, flat |
| Older-history paging | "Earlier" reveals 10 at a time | renders every older workout at once |
| Card | `WorkoutCard` — completion toggle, exercise photo, `formatDate(settings.dateFormat)`, `getWeightUnit(settings.units)` | `MobileWorkoutCard` — tap to expand, dumbbell glyph, hardcoded `EEE, MMM d`, hardcoded `kg`, no completion control |
| Empty states | Two: first-run (`Add your first workout`) and no-match (`No workouts match` / `Clear filters`) | One: `No workouts yet` / `Log your first workout` |
| Add affordance after the list | `AddAnotherCard` — "Add another workout" | Paper contained `Add Workout` button |
| Success feedback | toasts on add / update / delete | toast only on delete **failure** |
| Accessibility | `role="group"` + `aria-pressed` on the chips, `sr-only` per-day summary, `role="progressbar"` on the ring, `aria-label` on the card | no `accessibilityLabel` / `accessibilityRole` anywhere in `mobile/src` |

## The bug this uncovered

**Expo silently hides future-dated workouts.** `groupWorkouts()` builds exactly two buckets:

```ts
thisWeek: sorted.filter((w) => w.date >= weekStart && w.date <= weekEnd),
older:    sorted.filter((w) => w.date < weekStart),
```

Nothing catches `w.date > weekEnd`. A workout scheduled for next week is fetched, counted
in no metric, and rendered in no section. The web has an `Upcoming` bucket for exactly
this, and the web editor's `<input type="date">` lets a user create one — so a session
planned on the web is invisible on the phone.

Worse, the screen does not fall back to the empty state, because that branch tests
`filtered.length === 0` and `filtered` still holds the hidden rows. A user whose only
workouts are in the future sees two metric tiles, a search box, filter chips and an
`Add Workout` button, with no list and no explanation.

The web has the mirror of this guarded deliberately — the comment on `workoutsEarlier`
says the four windows exist so that "older workouts would [not] be unreachable — invisible,
and so uneditable, since editing is a tap on the card."

## Decisions

- **Port the goal ring and the day strip; retire the two tiles.** The ring answers "am I on
  track this week", the tiles answer "how many exercises did I do", and only the first is
  what the screen is for. `mobile/src/components/shared/ProgressRing.tsx` already exists and
  takes `value` (0–100), `displayValue` and `label`, so no new primitive is needed.
- **`VOLUME` is not volume.** Its value is `exercises.length` and its meta is minutes.
  The word already means something specific in this codebase — `exerciseVolume()` in
  `WorkoutModal.tsx` is `sets × reps × weight`. Rather than fix the label, the tile goes:
  the web does not show this number and there is no product ask for it.
- **Four filter chips, matching the web: All · Strength · Cardio · Flexibility.**
  `flexibility` is a real `WorkoutType` in `@trackvibe/shared/types`, the Expo *form*
  already offers it (its `SegmentedButtons` map over `WORKOUT_TYPES`), and the backend
  accepts it — so today Expo can create a flexibility workout it can never filter for.
- **Four sections, matching the web: Upcoming · This week · Last week · Earlier**, with the
  same per-day grouping and `Today` / `Yesterday` headers. This is what fixes the hidden
  future workouts; it is a correctness fix, not decoration.
- **Page the Earlier bucket at 10, as the web does.** `useWorkouts` reads the whole history
  through `requestAllPages`, so on a long-lived account "Older" is a few hundred cards on a
  phone. Rendering all of them is also against `CLAUDE.md` rule 6 in spirit.
- **The card respects the user's settings.** `settings.units` and `settings.dateFormat` are
  in the shared `AppSettings` and Expo already has a `SettingsContext` reading the same
  storage blob — the workout card just never consults it. An imperial user is shown `kg`.
- **Completion is a control, not a field.** Expo can only ever write
  `completed: existing?.completed ?? false`; there is no way to tick a workout off on the
  phone. Port the web's tap-target toggle onto `MobileWorkoutCard`; `useWorkouts` on mobile
  needs the `toggleWorkoutCompleted` action the web hook already exposes.
- **Copy comes from the web, verbatim**, including the two distinct empty states and the
  three success toasts.
- **Accessibility labels ship with the port,** not after it. The ring, the day chips and
  the filter chips are all "a number with no text" without them.

## Open questions — do not decide while implementing

1. **Where does the weekly goal target come from?** The web hardcodes `const weeklyGoal = 4`
   and renders `Goal · 4/week` regardless of what the user set. Expo's own `HomeScreen`
   already does it properly:
   `goals.find((g) => g.type === 'workouts' && g.period === 'weekly')?.target || 4`.
   **Recommendation:** Expo's approach is right and should become the shared one — read the
   goal, fall back to 4. `computeGoalProgress` in `@trackvibe/shared/domain` already counts
   workouts in a period, so this belongs there rather than in either screen. That means
   changing the web too, which is out of this spec's remit. Ship the port reading the goal
   with a 4 fallback **only if the owner agrees**; otherwise hardcode 4 and file the web fix.
2. **`sports` is a `WorkoutType` neither client can filter for.** `WORKOUT_TYPES` is
   `['strength', 'cardio', 'flexibility', 'sports']`, the web's `WorkoutModal` type picker
   maps over all four, and `createWorkoutSchema` accepts all four — but the web's filter row
   is a hardcoded `['All', 'Strength', 'Cardio', 'Flexibility']`. So a web user can create a
   sports workout and then not find it. **Recommendation:** derive both clients' chips from
   `WORKOUT_TYPES` instead of a literal, which fixes the web and keeps the two in step
   forever. Needs owner sign-off because it changes the reference client's UI.
3. **The web's day strip disagrees with its own ring.** `workoutsThisWeek` (the ring) is
   derived from `filteredWorkouts`, but `hasWorkoutByDay` (the ticks) is derived from the
   unfiltered `workouts`. Filter to Cardio and the ring drops while the ticks stay.
   **Recommendation:** the ticks are right — a weekly-consistency strip should not move when
   you search. Make the ring unfiltered too, on both clients. Same caveat: it changes the
   reference.
4. **Day-strip ordering.** The strip renders Mon→Sun while the week window is Sun→Sat, so
   the first day of the current window is drawn last. `WEEK_SUNDAY` in
   `@trackvibe/shared/domain` and `domain-conventions.md` ("Week — Sunday to Saturday") both
   say Sunday. Port the strip exactly as the web draws it and raise this separately rather
   than quietly "fixing" it mid-port.

## Constraints

- **No API changes.** Everything here is served by `GET /api/workouts` and
  `PATCH /api/workouts/:id`, both already consumed by Expo.
- **Do not touch the palette.** `MobileWorkoutCard`, `MetricCard` and `ProgressRing` have
  colour issues (the ring hardcodes `#e5e7eb` for its track); the design-system agent owns
  those. Use whatever `useThemedStyles` gives you.
- **Do not port the three unreferenced web components.** `BodyStatCard.tsx`,
  `ExerciseList.tsx` and `WorkoutFrequencyChart.tsx` live in `frontend/src/components/body/`
  and nothing imports them. They are not parity targets.
