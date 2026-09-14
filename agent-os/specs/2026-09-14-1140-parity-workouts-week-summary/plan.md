# Plan — Workouts Parity: Week Summary, Filters and the Workout List

Status: not started. Audit only — no application code was changed for this spec.

All work is in `mobile/`. No backend work: every field this needs is already on
`GET /api/workouts`, and `completed` is already accepted by `PATCH /api/workouts/:id`.

## Task 1 — Bucket the list the way the web does (the correctness fix)

- [ ] Replace `groupWorkouts()` in `mobile/src/screens/BodyScreen.tsx` with four windows
      matching `frontend/src/pages/Body.tsx`: **upcoming** (`date > weekEnd`, ascending),
      **this week**, **last week** (`subWeeks(weekStart/weekEnd, 1)`), **earlier**
      (`date < lastWeekStart`). Together they must cover the whole timeline — that is the
      point of the change, not the section headings.
- [ ] Group each section by day and label the day `Today` / `Yesterday` /
      `EEEE, MMM d` / `EEEE, MMM d, yyyy` when the year differs — port
      `groupWorkoutsByDate()` verbatim.
- [ ] Use `getPeriodRange('weekly')` from `../lib/dateRanges` instead of calling
      `startOfWeek(now, { weekStartsOn: 0 })` inline. Same result today; one source of truth
      tomorrow.
- [ ] Page the Earlier bucket: `EARLIER_PAGE_SIZE = 10`, a "Show N more" button, and reset
      to the first page when the search or filter changes (the web does this in a
      `useEffect` keyed on `[searchQuery, filter]`).
- [ ] Regression test: a workout dated next week renders under **Upcoming** and is not
      dropped. This is the bug — pin it.

## Task 2 — Weekly goal ring and day strip

- [ ] Delete the `MetricCard` row (`THIS WEEK` / `VOLUME`) from `BodyScreen`.
- [ ] Build the header card: eyebrow `Goal · {target}/week`, `{count}/{target}` at display
      size, and `ProgressRing` from `mobile/src/components/shared/ProgressRing.tsx` at
      `size={72} strokeWidth={10}`, `value` = `min(count / target, 1) * 100` (the mobile ring
      takes 0–100; the web ring takes 0–1 — do not pass the fraction).
- [ ] Day strip: seven 32×32 chips labelled `M T W T F S S`, a check glyph on any day with a
      workout, and a ring on today. Index maps `getDay()` with
      `idx === 0 ? 6 : idx - 1`, exactly as the web does.
- [ ] `accessibilityRole="progressbar"` + `accessibilityValue` on the ring, and an
      `accessibilityLabel` per day chip carrying the full day name, whether it is today, and
      whether a workout was logged — the tick is otherwise the only cue.
- [ ] **Target source is an open question** (`shape.md` #1). Default to the web's hardcoded
      `4` unless the owner accepts the recommendation to read the weekly `workouts` goal.

## Task 3 — Filter chips

- [ ] Add **Flexibility** to the `SegmentedButtons`. Four segments is the practical ceiling
      for Paper's `SegmentedButtons` at 390px — check the labels do not truncate; if they do,
      port the web's horizontally scrolling chip row instead, which is what the web uses and
      what would also accommodate a fifth chip.
- [ ] Keep matching on the lowercase `WorkoutType`, as both clients already do.
- [ ] `accessibilityState={{ selected }}` per chip (Paper's `SegmentedButtons` does this for
      you — verify rather than assume).
- [ ] Do **not** add `Sports` in this task; see `shape.md` #2.

## Task 4 — `MobileWorkoutCard` parity

- [ ] Completion toggle on the left, ≥44px hit area, tick when complete, title struck
      through and the card dimmed — mirroring `WorkoutCard.tsx`.
- [ ] Add `toggleWorkoutCompleted(id, completed)` to `mobile/src/hooks/useWorkouts.ts`,
      wrapping the existing update mutation exactly as the web hook does. Nothing else in
      the hook changes.
- [ ] Date line through `settings.dateFormat`, weight through `settings.units`. Mobile has
      no `formatDate` / `getWeightUnit`; they live in `frontend/src/lib/utils.ts`. Move both
      to `@trackvibe/shared/domain` and re-export from the web rather than copying — this is
      the pattern `dateRanges.ts` and `types/workout.ts` already follow on both clients.
- [ ] `accessibilityLabel` on the card ("Workout: {title}, {type}, {n} minutes") and on the
      toggle and delete buttons.
- [ ] Leave the tap-to-expand behaviour: it has no web equivalent, it removes nothing, and
      the web's answer to "see the rest" is to open the modal, which Expo also does on Edit.

## Task 5 — Empty states, add affordance and toasts

- [ ] Two empty states, with the web's copy verbatim:
      first run — icon, "Add your first workout", "Start tracking strength, cardio, and
      weekly consistency.", action "Add a workout";
      no match — no icon, "No workouts match", "Try a different search or filter.", action
      "Clear filters" which resets both the query and the filter.
- [ ] Guard the empty branch on the **rendered** count, not on `filtered.length`, so it
      cannot be defeated by rows that no section claims.
- [ ] Replace the trailing contained `Add Workout` button with the web's dashed
      "Add another workout" affordance (`AddAnotherCard`).
- [ ] Success toasts on add / update / delete ("Workout added" / "Workout updated" /
      "Workout deleted"), matching the web. Expo currently only toasts on failure.
- [ ] Delete confirmation copy: title "Delete workout", message "Are you sure you want to
      delete this workout? This cannot be undone."

## Task 6 — Tests

- [ ] Pure helpers (`groupWorkoutsByDate`, the four-window split, the day-strip flags) get
      unit tests. Export them from the screen module the way `mergeExerciseEdits` is
      exported from `WorkoutFormScreen.tsx` — mobile's existing tests avoid rendering React
      Query because its `notifyManager` batch timer outlives the run and hangs jest.
- [ ] Cases: a future-dated workout lands in Upcoming; a Sunday workout lands in the current
      week (Sun–Sat, per `domain-conventions.md`); Earlier pages at 10; the day strip flags
      the right index for each weekday.
- [ ] `cd mobile && npx tsc --noEmit` and `npm test`.

## Verification

- [ ] `mobile: npx tsc --noEmit`
- [ ] `mobile: npm test`
- [ ] `frontend: npx tsc --noEmit` — only if the shared `formatDate` / `getWeightUnit` move
      lands, which touches the web's re-exports
- [ ] `cd packages/shared && npx tsc --noEmit` plus its own tests, same condition
- [ ] Side-by-side pass at 390px against the web Body page: header block, chip row, section
      order, empty states. **Needs a device or simulator — cannot be confirmed from code.**

## Deliberately not done

- **The tiles are not kept "as well as" the ring.** Two summaries of the same week on one
  screen is what `frontend/mobile-ui` warns about for the mic.
- **No `Sports` chip**, no change to the web's hardcoded goal target, no reordering of the
  day strip, no change to which list feeds the ring — all four are open questions in
  `shape.md` and belong to the owner, not to this port.
- **No palette work.** Owned by the design-system agent.
