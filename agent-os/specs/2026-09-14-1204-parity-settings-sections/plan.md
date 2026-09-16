# Plan — Parity: the Settings screen

Status: **proposed**. No code has been written; this is the task write-up from the web-vs-Expo
audit of 2026-09-14.

**Goal:** Expo's Settings screen offers the same sections the web's does, in the same order,
storing each value in the same place — and the two controls that exist but do nothing start
doing something.

**Architecture:** mostly `mobile/` client work. Two tasks are blocked on an owner decision
(units conversion, and the web's "Clear All Data"), and one — notifications — needs a new
Expo-Go-safe dependency. Nothing here changes an API shape.

**Spec:** `agent-os/specs/2026-09-14-1204-parity-settings-sections/` — read `shape.md` first,
including the six open questions. Tasks 3, 5 and 6 are gated on them.

**Order:** land after `…-1202-parity-onboarding-and-profile`, which introduces
`mobile/src/hooks/useProfile.ts` and adds the Profile and Cycle sections to the same screen.
Both specs edit `SettingsScreen.tsx` and its `SETTINGS_SECTION_TITLES` list; doing 1202 first
avoids a three-way merge on a file whose section list is compile-checked.

## Global constraints

- **CLAUDE.md rule 2: never remove a working feature.** Everything the Expo screen has today
  keeps working.
- **CLAUDE.md rule 4: do not change API shapes.** Adding fields to Expo's `ApiUser` type is a
  client-side widening to match what the server already sends; the wire format does not move.
- The web is the reference — except where `shape.md` names it as wrong, and there the task is
  blocked on an owner answer rather than copied.
- `SETTINGS_SECTION_TITLES` in `mobile/src/screens/SettingsScreen.tsx:34` is compile-checked
  and test-pinned. Every section added means the JSX, the list and the test move together.
- No inline hex in `mobile/`; the AST guards in `mobile/src/theme/__tests__` fail the build.
- Every task ends green (`cd mobile && npx tsc --noEmit && npm test`) and is revertible alone.

## File structure

| File | Responsibility |
|---|---|
| `mobile/src/core/api/auth.ts` | Widen `ApiUser` to the four subscription fields the server sends |
| `mobile/src/types/user.ts` → `packages/shared` | The shared `User` already carries them; stop dropping them in `apiUserToUser` |
| `mobile/src/components/settings/SubscriptionSection.tsx` | **New.** Read-only plan + AI quota |
| `mobile/src/components/settings/DateFormatSection.tsx` | **New.** Three options + preview |
| `mobile/src/lib/formatDate.ts` | **New.** One date formatter that honours the setting |
| `mobile/src/components/settings/NotificationsSection.tsx` | **New.** Local reminders (gated on open question 6) |
| `mobile/src/components/settings/DataSection.tsx` | **New.** Export only |
| `mobile/src/screens/SettingsScreen.tsx` | Section registration and order |
| `packages/shared/src/domain/units.ts` | **New**, only if open question 2 is answered "convert" |

---

## Task 1 — Expo stops discarding the subscription fields

**Verified gap:** `backend/src/models/user.ts:43-57` puts `subscriptionStatus`,
`subscriptionPlan`, `subscriptionCurrentPeriodEnd` and `aiCallsRemaining` on every auth
response. `mobile/src/core/api/auth.ts:3-9` declares an `ApiUser` without them, and
`AuthContext.apiUserToUser` (`:15-23`) copies five fields and drops the rest.

- [ ] **Step 1: Widen Expo's `ApiUser`** to match `frontend/src/core/api/auth.ts:3-13`. The
      shared `User` type in `packages/shared` already carries the fields — check before adding
      a local declaration.
- [ ] **Step 2: Carry them through `apiUserToUser`** in `mobile/src/context/AuthContext.tsx`,
      the same way `frontend/src/context/AuthContext.tsx:24-36` does, including its
      `'free'` default for a missing status.
- [ ] **Step 3: Add `mobile/src/hooks/useSubscription.ts`** mirroring the web's derived flags:
      `isPro`, `aiCallsRemaining`, `hasAiAccess`, `subscriptionStatus`. **Read-only** — no
      `subscribe`, `startTrial` or `manage` until open question 3 is answered.
- [ ] **Step 4: Test** that a login response with `subscriptionStatus: 'pro'` reaches the hook
      and that a missing field defaults to `free` / `0`.
- [ ] **Step 5: Verify + commit.**

## Task 2 — The Subscription section in Expo

- [ ] **Step 1: `mobile/src/components/settings/SubscriptionSection.tsx`**, matching
      `frontend/src/components/settings/SubscriptionSection.tsx`: the same `statusLabels` map
      (free / pro / trainer / trainer_pro / past_due / canceled / paused / expired), the same
      "Current Plan" row, and for a non-Pro user the same quota sentence — *"You have N free AI
      call(s) remaining this month."*, or *"You've used all your free AI calls this month.
      Exciting updates coming soon!"* Copy verbatim; this text is the product's voice.
- [ ] **Step 2: No upgrade button** pending open question 3. A Pro user sees "Pro"; a free user
      sees their quota. Nothing links out.
- [ ] **Step 3: Register it first** in `SETTINGS_SECTION_TITLES` — the web renders Subscription
      above everything else (`frontend/src/pages/Settings.tsx:61`).
- [ ] **Step 4: Test + commit.**

## Task 3 — Units stops being a control that does nothing

> **Blocked on open question 2.** Do not start until the owner has chosen "convert" or "label
> only".

**Verified defect:** Expo persists `settings.units` and reads it nowhere.
`MobileWorkoutCard.tsx:114` and `WorkoutFormScreen.tsx:193` hardcode `kg`.

- [ ] **Step 1 (if "convert"): `packages/shared/src/domain/units.ts`** — `weightUnitLabel(units)`
      and `toDisplayWeight(kg, units)` / `fromDisplayWeight(value, units)`, with tests. kg stays
      the stored unit (`global/domain-conventions`).
- [ ] **Step 2: Both clients switch to the shared helpers.** The web's `getWeightUnit`
      (`frontend/src/lib/utils.ts:127-129`) becomes a re-export or is replaced at its three call
      sites (`ExerciseList.tsx:25`, `WorkoutModal.tsx:718`, `WorkoutCard.tsx:78`).
- [ ] **Step 3: Expo reads the setting** in `MobileWorkoutCard.tsx` and `WorkoutFormScreen.tsx`
      — the label, and the value too if converting. **Coordinate with the workouts parity PR
      (#303), which owns those two files.**
- [ ] **Step 4: Test** both clients at metric and imperial, including the round trip through the
      workout form so an imperial user's entry is stored in kg.
- [ ] **Step 5: Verify + commit.**

## Task 4 — Date Format in Expo

**Verified gap:** the web has `DateFormatSection` and threads `settings.dateFormat` through
`formatDate` (`frontend/src/lib/utils.ts:22-35`). Expo hardcodes five `date-fns` patterns and
has no section.

- [ ] **Step 1: `mobile/src/lib/formatDate.ts`** — one function taking the value and
      `settings.dateFormat`, mapping the three `DATE_FORMATS` from `@trackvibe/shared/settings`
      to `date-fns` patterns exactly as `frontend/src/lib/utils.ts:22-35` does. Do not
      re-derive the mapping.
- [ ] **Step 2: Route the five hardcoded call sites through it** — `EnergyScreen.tsx:187`,
      `WorkoutFormScreen.tsx:128`, `HomeScreen.tsx:138`, `SleepFormScreen.tsx:57`,
      `MobileWorkoutCard.tsx:103`. Note that three of these are *friendly* formats
      (`EEE, MMM d`) with no web counterpart; only the numeric-date renderings should follow
      the setting, matching how the web uses it. Say which is which in the PR.
- [ ] **Step 3: `mobile/src/components/settings/DateFormatSection.tsx`** — the three options
      from `DATE_FORMATS` with the same live preview line the web shows
      (`DateFormatSection.tsx:41`).
- [ ] **Step 4: Register it** before Units, matching the web's order.
- [ ] **Step 5: Test + commit.**

## Task 5 — Data section in Expo: export, and nothing that lies

> **The "Clear All Data" half is blocked on open question 4.** Expo must not gain that control
> while the web's version deletes nothing.

- [ ] **Step 1: `mobile/src/components/settings/DataSection.tsx`** with **Export All Data**
      only, mirroring `DataManagementSection`'s export. Writing a file and handing it to the
      share sheet needs `expo-file-system` and `expo-sharing`, and **`mobile/package.json` has
      neither** — two new dependencies. Raise them the way spec 1202 raises the date picker, or
      defer this task. Do not add a dependency inside a "port a section" task.
- [ ] **Step 2: The same JSON shape** the web writes (`frontend/src/lib/export.ts:18`) so one
      backup file is readable by both clients. Note the web's export only serialises what is in
      the React Query cache (`DataManagementSection.tsx:20-22`), so a cold-load export can be
      empty — worth fixing on the web rather than reproducing.
- [ ] **Step 3: "Reset settings to defaults"** is safe and honest — it writes
      `DEFAULT_SETTINGS` through `updateSettings`, exactly what `Settings.tsx:38-45` does. Port
      it.
- [ ] **Step 4: Test + commit.**

## Task 6 — Notifications in Expo

> **Blocked on open question 6.** Needs `expo-notifications` (Expo-Go-safe for *local*
> notifications). Remote push cannot reuse `/api/push/subscribe`, which takes a Web Push
> subscription with VAPID keys (`backend/src/controllers/push.ts:19-37`).

- [ ] **Step 1: Correct the false comment first**, in one small commit:
      `mobile/src/screens/SettingsScreen.tsx:21-33` and
      `mobile/src/screens/__tests__/SettingsScreen.test.tsx:14-15` both assert the web has no
      notifications setting. It does — `frontend/src/pages/Settings.tsx:68`, since 2026-02-13.
      The *removal* was right (the switch persisted nothing); the reason recorded is wrong and
      will mislead whoever reads it next.
- [ ] **Step 2: `mobile/src/components/settings/NotificationsSection.tsx`** with the web's
      controls: permission request, master switch, food reminder + time, sleep reminder + time,
      test notification. Same copy as `NotificationsSection.tsx`.
- [ ] **Step 3: Persist the preferences under the same key shape the web uses** —
      `trackvibe_notification_preferences` (`frontend/src/lib/storage.ts:191`), in AsyncStorage,
      the same relationship `trackvibe_settings` already has across the two clients.
- [ ] **Step 4: Schedule with `expo-notifications`' daily trigger**, not a `setTimeout`. The
      web's reminders are `setTimeout`-based and die with the tab
      (`frontend/src/lib/notifications.ts:107-115`); the native scheduler is the more reliable
      of the two, and matching the weaker implementation would be a bug on purpose.
- [ ] **Step 5: No push toggle.** The web's is behind `VITE_FF_PWA_PUSH` and speaks Web Push;
      native push needs a backend path that does not exist.
- [ ] **Step 6: Test + commit.**

## Task 7 — Section order and the screen's shape

- [ ] **Step 1: `SETTINGS_SECTION_TITLES` ends as** Subscription, Account, Profile, Cycle, Date
      Format, Units, Appearance, Notifications, Data — the web's order
      (`frontend/src/pages/Settings.tsx:61-72`), minus anything a blocked task did not ship.
- [ ] **Step 2: Update the pinning test** in one place, and keep its comment accurate about
      *why* each section is there — that comment is the reason this audit found the
      notifications mistake at all.
- [ ] **Step 3: Verify + commit.**

## Verification for the whole spec

- [ ] `cd mobile && npx tsc --noEmit && npm test`
- [ ] `cd frontend && npx tsc --noEmit && npx vitest run` — only if Task 3 touched the web
- [ ] Manual, once: set units, date format and accent on the phone, force-quit, reopen — all
      three survive. Then check the same account in the browser and confirm they are
      **independent**, which is expected (see `shape.md`, persistence) and not a regression.
- [ ] Manual, once: a free account shows its remaining AI calls on both clients, and the two
      numbers agree, since both read the same server-computed field.
