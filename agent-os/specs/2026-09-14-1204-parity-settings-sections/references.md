# Code Read Before Writing This Spec

A code audit — nothing here was observed in a simulator or a browser.

## The web Settings page, section by section

- `frontend/src/pages/Settings.tsx` — the nine sections and their order (61-72), the avatar
  card (50-60), the subtitle "Manage your account, preferences, and data." (49),
  `handleClearData` calling `storage.clear()` (28-36), `handleResetSettings` (38-45), and the
  two confirmation dialogs including the "permanently deleted" copy (74-94)
- `frontend/src/components/settings/SubscriptionSection.tsx` — the status label map (11-21),
  the plan row, the AI-quota sentences (50-58)
- `frontend/src/components/settings/AccountSection.tsx` — email plus "You can sign out from the
  account menu in the top bar"
- `frontend/src/components/settings/UnitsSection.tsx` — the two options and the helper line
  "Used for weight and measurements in workouts"
- `frontend/src/components/settings/AppearanceSection.tsx` — theme via next-themes' `setTheme`
  (27-30), accent via `updateSettings({ balanceDisplayColor })` (22-25)
- `frontend/src/components/settings/DateFormatSection.tsx` — three options and the live preview
  (41)
- `frontend/src/components/settings/NotificationsSection.tsx` — permission states (48-70),
  master switch, food and sleep reminders with hour/minute inputs, test notification, and the
  push toggle behind `FEATURE_FLAGS.PWA_PUSH_NOTIFICATIONS` (183-206)
- `frontend/src/components/settings/DataManagementSection.tsx` — export built from
  `queryClient.getQueryData` for three keys (20-22), reset, clear
- `frontend/src/components/settings/SettingsSection.tsx` — the card shell every section shares

## Where each setting is stored

- `frontend/src/context/AppContext.tsx:18-25` — `useLocalStorage(STORAGE_KEYS.SETTINGS, …)`,
  partial update by shallow merge, re-merged over `DEFAULT_SETTINGS` on read (31)
- `frontend/src/lib/storage.ts:182-192` — the key table: `trackvibe_settings` (189),
  `trackvibe_notification_preferences` (191), `trackvibe_token` (183)
- `mobile/src/context/SettingsContext.tsx` — the same key name (12), the same merge-over-
  defaults contract (32-42, 44-50), and `settingsLoading` because AsyncStorage is async (5-10)
- `packages/shared/src/settings/types.ts` — the one `AppSettings` definition, `DEFAULT_SETTINGS`
  (theme `dark`, units `metric`, dateFormat `DD/MM/YYYY`, accent `green`)
- `packages/shared/src/settings/accent.ts` — `accentHex`, derived from the same `ACCENT_PALETTE`
  the web's CSS variables use, with `__tests__/accent.test.ts` pinning the two derivations
- **No settings endpoint anywhere.** No `user_settings` table in `backend/src/db/schema.ts`,
  no route in `backend/src/routes/`, nothing in `packages/shared` that syncs one.

## Theme: two sources of truth

- `frontend/src/App.tsx:14` — `<ThemeProvider attribute="class" defaultTheme="dark" enableSystem>`
- `frontend/src/hooks/useThemeEffect.ts:9-29` — signature `(_theme: unknown, accentColor)`; the
  theme argument is unused, the hook only writes the accent custom properties
- `frontend/src/routes.tsx:90` — the one call site, passing `settings.theme` into that unused
  parameter
- `mobile/src/theme/useAppTheme.ts:21-26, 57-68` — `resolveScheme(settings.theme, osScheme)`,
  with a comment stating it mirrors next-themes' semantics

## Expo's Settings screen as it stands

- `mobile/src/screens/SettingsScreen.tsx` — three sections (34), the doc comment explaining the
  list contract and the removals (21-33), Account rows (54-57), Units radio (59-67), Appearance
  (69-87), Sign Out (89-91)
- `mobile/src/screens/__tests__/SettingsScreen.test.tsx` — the removal rationale (9-21) and the
  pinning test (36-38)
- `mobile/src/hooks/useSettings.ts` — the context accessor
- `mobile/src/core/api/auth.ts:3-9` — the `ApiUser` that drops the subscription fields

## Where the settings are (or are not) read

- Web units: `ExerciseList.tsx:25`, `WorkoutModal.tsx:718`, `WorkoutCard.tsx:78`, all through
  `getWeightUnit` (`frontend/src/lib/utils.ts:127-129`)
- Web date format: `WorkoutModal.tsx:577, 1053-1054, 1277`, `ProfileSection.tsx:85`,
  `hooks/useFormat.ts:15`, all through `formatDate` (`frontend/src/lib/utils.ts:22-35`)
- Web currency: `hooks/useFormat.ts:11` — the only reader, and no UI sets it
- Expo units: **no reader.** `MobileWorkoutCard.tsx:114` and `WorkoutFormScreen.tsx:193`
  hardcode `kg`
- Expo dates: `EnergyScreen.tsx:187`, `WorkoutFormScreen.tsx:128`, `HomeScreen.tsx:138`,
  `SleepFormScreen.tsx:57`, `MobileWorkoutCard.tsx:103` — hardcoded `date-fns` patterns

**Negative result:** `2.20462`, `0.4536`, `kgToLbs`, `lbsToKg`, `convertWeight` and
`toImperial` return zero hits across `backend/src`, `frontend/src`, `mobile/src` and
`packages/shared/src`. Imperial mode changes a label and nothing else.

## Backend surfaces referenced

- `backend/src/models/user.ts:43-57` — `rowToUser`, which puts the four subscription fields on
  every auth response; `:60-67` — the free-tier calculation, 10 calls a month, `-1` for Pro
- `backend/src/routes/subscription.ts` — checkout (14), portal (39), `GET /status` (55)
- `backend/src/controllers/push.ts:11-37` — VAPID key and Web Push subscribe, taking
  `{ endpoint, keys: { p256dh, auth } }`
- `backend/src/routes/users.ts:116-122, 240` — `DELETE /api/users/:id`, admin-only, refusing
  self-deletion
- `frontend/src/lib/notifications.ts:88-115` — `getMsUntilTime` and `scheduleDailyReminder`,
  both `setTimeout`-based

## Git history checked

- `420eb7d` (2026-02-13) added `NotificationsSection` to `frontend/src/pages/Settings.tsx`
- `136388e` (2026-09-13) removed the Expo notifications switch, stating the web had no
  counterpart. Seven months after the web gained one.

## Prior work leaned on

- `agent-os/specs/2026-09-12-1230-mobile-foundation/plan.md`, Task 7 — "Make 'Clear All Data'
  honest", which removed Expo's control and named the account sub-project as the owner of this
  surface. This spec is part of that sub-project.
- PR #306 — shell, tabs and screen names. Owns the Settings/Profile tab-name difference.
- PR #303 — workouts. Owns `MobileWorkoutCard.tsx` and `WorkoutFormScreen.tsx`, which Task 3
  needs to touch.
- Sibling specs `…-1200-parity-auth-surface` and `…-1202-parity-onboarding-and-profile`.
