# Parity: the Settings screen — Shaping Notes

## Why this exists

The web's Settings page renders nine sections; Expo's Settings screen renders three. This spec
walks them side by side, says where each setting is stored, and separates the layout gaps from
the one genuine data question.

Sibling specs: `…-1200-parity-auth-surface` (sign in / sign up / reset / sign out) and
`…-1202-parity-onboarding-and-profile` (the wizard, plus the Profile and Cycle sections, which
are profile-backed and land there). This spec owns the device-preference and account-status
sections. The Settings **tab's name** — "Settings" on Expo, "Profile" on the web — is PR #306's.

## The capability table

| Setting | Web | Expo | Persisted where | Agree? |
|---|---|---|---|---|
| Subscription plan + manage/upgrade | `SubscriptionSection` | **absent** | server (`/api/auth/me`) | No |
| Free-tier AI quota ("N free AI calls remaining") | shown when not Pro | **absent** | server (computed in `models/user.ts:60-67`) | No |
| Account (email) | `AccountSection`, email only | name + email | server | Near — Expo also shows the name |
| Profile (sex, DOB, height, weights, activity, water goal, BMI) | `ProfileSection` | **absent** | server (`user_profiles`) | No — owned by spec 1202 |
| Cycle tracking | `CycleSection`, female only | **absent** | server (`user_profiles`) | No — owned by spec 1202 |
| Date format | `DateFormatSection` | **absent** | device (`trackvibe_settings`) | No |
| Units (metric/imperial) | `UnitsSection` | present, same two options | device (`trackvibe_settings`) | Control matches, **effect does not** |
| Theme (light/dark/system) | `AppearanceSection` via next-themes | present | **different keys — see below** | No |
| Accent colour | `AppearanceSection`, 4 options | present, same 4 options | device (`trackvibe_settings`) | **Yes** |
| Notifications + reminder times | `NotificationsSection` | **absent** (removed 2026-09-13) | device (`trackvibe_notification_preferences`) | No |
| Push notifications | behind `VITE_FF_PWA_PUSH` | **absent** | server (`/api/push/subscribe`) | No — and not portable as-is |
| Export all data | `DataManagementSection` | **absent** | n/a | No |
| Reset settings to defaults | `DataManagementSection` | **absent** | device | No |
| Clear all data | present — **and it lies** | absent (removed on purpose) | device only | **Expo is right** |
| Account deletion | **absent** | **absent** | n/a | Yes — both missing, no endpoint exists |
| Sign out | header user menu | Settings screen button | n/a | Yes — each right for its shell (spec 1200) |
| Currency | in `AppSettings`, no UI | in `AppSettings`, no UI | device | Yes — dead on both |

## Settings persistence: the honest answer

The brief asked whether a setting the web syncs to the backend is kept only on-device by Expo.
**No — and the symmetry is the finding.**

- The web stores `AppSettings` in `localStorage` under `trackvibe_settings`
  (`AppContext.tsx:18-21` → `STORAGE_KEYS.SETTINGS`, `lib/storage.ts:189`).
- Expo stores `AppSettings` in AsyncStorage under **the same key name**,
  `trackvibe_settings` (`SettingsContext.tsx:12`), merging over `DEFAULT_SETTINGS` exactly as
  the web does, and its own comment says so.
- **Neither client sends any of it to the server.** There is no settings endpoint, no
  `user_settings` table, and nothing in `packages/shared` that syncs one.

So units, date format and accent colour already diverge between a user's browser and their
phone — but that is a property of the design both clients share, not Expo drift. The
mitigation is the same one the web already relies on: the values are cheap to re-pick.
Recorded here so nobody "fixes" it as a mobile bug.

**One field is genuinely inconsistent: `theme`.**

- The web mounts next-themes at `App.tsx:14` (`attribute="class" defaultTheme="dark"
  enableSystem`), `AppearanceSection.tsx:27-30` calls next-themes' `setTheme`, and the value
  lands in next-themes' own `localStorage` key. `AppSettings.theme` is never written by any
  web UI, and the one consumer that takes it ignores it — `useThemeEffect(_theme, accentColor)`
  names the parameter with a leading underscore and only reads the accent
  (`frontend/src/hooks/useThemeEffect.ts:9-29`).
- Expo writes `settings.theme` into `trackvibe_settings` and resolves the scheme from it
  (`useAppTheme.ts:57-60`).

Same field name, live on one client and dead on the other. Nothing breaks today, because the
two stores are physically separate. It becomes a real bug the moment anyone syncs the settings
blob — the web would publish a `theme` that is not the theme it is showing. See open question 1.

## The findings worth acting on

### 1. Units is a dead control on Expo, and a mislabel on the web

Expo persists `settings.units` and reads it **nowhere**: `MobileWorkoutCard.tsx:114` renders
`` `${exercise.weight}kg` `` and `WorkoutFormScreen.tsx:193` labels the field "Weight (kg)".
Flipping the radio to Imperial changes nothing on screen. The web reads it in three places via
`getWeightUnit(settings.units)` (`ExerciseList.tsx:25`, `WorkoutModal.tsx:718`,
`WorkoutCard.tsx:78`).

But the reference is not clean either: `getWeightUnit` returns `'kg' | 'lbs'`
(`frontend/src/lib/utils.ts:127-129`) and **no conversion exists anywhere in the repo** — no
`2.20462`, no `kgToLbs`, nothing. Choosing Imperial on the web prints the same kilogram number
with "lbs" after it. `global/domain-conventions` says weight is kilograms, so the stored value
is right and the display is wrong. See open question 2.

### 2. Notifications were removed from Expo for a reason that is false

`mobile/src/screens/SettingsScreen.tsx:21-33` and its test
(`__tests__/SettingsScreen.test.tsx:14-15`) say the notifications switch was dropped because it
"persisted nothing and had no web counterpart at all — `frontend/src/pages/Settings.tsx` has no
setting it backs".

The first half is true. The second is not: `frontend/src/pages/Settings.tsx:68` renders
`<NotificationsSection />`, and has since 2026-02-13 (`420eb7d`) — the Expo removal is
2026-09-13 (`136388e`). The web section is substantial: a permission prompt, a master switch,
food and sleep reminders with editable hour/minute, a test notification, and a push toggle
behind `FEATURE_FLAGS.PWA_PUSH_NOTIFICATIONS`.

**Removing the dead switch was still the right call** — it is the stated reason that is wrong,
and it is now written into a test comment where the next person will believe it. Restoring the
feature properly is a real piece of work, not a port (see Scope).

### 3. Expo shows nothing about the subscription, though the data is already on the wire

`/api/auth/login`, `/register`, `/me` and `/refresh` all return `subscriptionStatus`,
`subscriptionPlan`, `subscriptionCurrentPeriodEnd` and `aiCallsRemaining`
(`backend/src/models/user.ts:43-57`). Expo's `ApiUser` simply omits the four fields
(`mobile/src/core/api/auth.ts:3-9`), so it throws away data it is already being handed. A
read-only plan-and-quota card costs one type change and one component — **zero new API work.**
The upgrade button is a different question (open question 3).

### 4. The web's "Clear All Data" deletes nothing, and Expo already knows

`frontend/src/pages/Settings.tsx:28-36` runs `storage.clear()` — `localStorage.clear()` — then
reloads. The confirmation says: *"All workouts, food entries, and other data will be
permanently deleted."* Every one of those lives on the server and is untouched. What actually
happens is that the user's token, settings and notification preferences are wiped and they are
signed out; the next sync brings all the data back.

Expo deleted its equivalent control in the mobile-foundation phase for precisely this reason
("a Clear All Data control whose confirm handler deleted nothing"). **This is the one place
where Expo is right and the reference is wrong**, so it is an open question rather than a task
(open question 4).

Two smaller things in the same section: `exportAllData` serialises whatever happens to be in
the React Query cache (`DataManagementSection.tsx:20-22` — `queryClient.getQueryData` for three
keys), so an export taken from a cold load can be empty; and `DataExportModal.tsx` is a richer
export UI that nothing in the app renders.

### 5. Neither client can delete an account

`DELETE /api/users/:id` is admin-only and explicitly refuses self-deletion — *"Cannot delete
your own account"* (`backend/src/routes/users.ts:120-122`, mounted with `withAdmin` at `:240`).
There is no self-serve deletion anywhere. Both clients match, so it is not a parity gap — but
App Store guideline 5.1.1(v) requires in-app account deletion for any app that supports account
creation, so it blocks the Expo app's submission. Needs a new endpoint. Open question 5.

## Scope

1. **Subscription + AI quota card in Expo** (read-only), from data `/api/auth/me` already
   returns.
2. **Date Format section in Expo**, and the five hardcoded `date-fns` patterns start honouring
   it (`EnergyScreen.tsx:187`, `WorkoutFormScreen.tsx:128`, `HomeScreen.tsx:138`,
   `SleepFormScreen.tsx:57`, `MobileWorkoutCard.tsx:103`).
3. **Units becomes a real setting on Expo** — the two hardcoded `kg` strings read the setting,
   pending open question 2 on whether the number converts.
4. **Notifications in Expo**: local daily reminders via `expo-notifications`, matching the
   web's controls. Sized honestly below.
5. **Export in Expo**, and *not* "Clear All Data" until open question 4 is answered.
6. **Section order matches the web's**: Subscription, Account, Profile, Cycle, Date Format,
   Units, Appearance, Notifications, Data.

## What already matches — checked, not assumed

- **The storage key and the merge semantics are identical.** Both read the blob, merge it over
  `DEFAULT_SETTINGS`, and fall back to the defaults on corrupt JSON. Expo's extra
  `settingsLoading` flag exists only because AsyncStorage is async, and `ThemeProvider` gates
  on it so the app cannot flash the default theme — a genuine improvement with no web
  equivalent needed.
- **`AppSettings` itself is already shared** — one definition in
  `packages/shared/src/settings/types.ts`, re-exported by `frontend/src/types/settings.ts`.
  There is no drift in the type.
- **The accent colour matches exactly**: the same four `BALANCE_DISPLAY_COLORS`, and
  `accentHex` is derived from the same `ACCENT_PALETTE` the web's CSS variables use, with a
  test pinning the two derivations together.
- **The screen subtitle is already verbatim** — "Manage your account, preferences, and data."
  on both (`Settings.tsx:49`, `SettingsScreen.tsx:53`).
- **Units offers the same two labelled options** — "Metric (kg, cm)" / "Imperial (lbs, in)" —
  after the 2026-09-13 fix that replaced Expo's invented "Kilograms (kg)" vocabulary.
- **Currency is dead on both.** It is in `AppSettings` and `useFormat.formatCurrency` reads it,
  but no Settings UI on either client exposes it. Leave it alone.
- **Sign out and account deletion** behave the same on both (see specs 1200 and open question
  5).

## Open questions for the owner

1. **`AppSettings.theme` is dead on the web and live on Expo.** Options: (a) the web
   dual-writes — `AppearanceSection` calls `updateSettings({ theme })` alongside next-themes'
   `setTheme`, one line, and the field becomes true on both; (b) document `theme` as
   mobile-owned and drop the dead parameter from `useThemeEffect`. **Recommendation: (a).** It
   is smaller, it makes a future settings sync possible, and it removes a field whose meaning
   depends on which client wrote it.
2. **Imperial units convert nothing.** Expo should honour the setting — but honouring it the
   way the web does means printing kilograms labelled "lbs". **Recommendation: add
   `convertWeight()` to `packages/shared` and have both clients convert on display, keeping kg
   as the stored unit per `global/domain-conventions`.** That changes web behaviour, so it
   needs a yes. The fallback — Expo copies the label swap — ships a known-wrong number to a
   second client and is not recommended.
3. **Does the Expo subscription card get an upgrade button?** The web sends the user to
   `/pricing` and then to a Lemon Squeezy checkout. On iOS, selling access to digital features
   through an external checkout is App Store 3.1.1. **Recommendation: read-only status plus the
   AI quota on Expo, no upgrade CTA and no external link, until an IAP decision is made.** A
   Pro user still sees that they are Pro.
4. **The web's "Clear All Data".** Fix it (wire it to per-domain deletes), relabel it honestly
   ("Sign out and clear this device"), or remove it. **Recommendation: relabel now, since that
   is a copy change with no data risk, and fold real deletion into the account-deletion work in
   open question 5.** Expo should not gain the control until it is honest.
5. **Account deletion needs a new endpoint** (`DELETE /api/account`, self-authenticated,
   cascading). It is App Store 5.1.1(v) blocking for the Expo submission and is arguably a GDPR
   obligation for the web too. Out of scope here because it is backend work, not parity —
   flagged so it is scheduled deliberately rather than discovered at review.
6. **Notifications on native are not a port.** Local daily reminders need `expo-notifications`
   (a new dependency; Expo Go can schedule local notifications, so no dev client), and *remote*
   push cannot reuse `/api/push/subscribe` at all — that endpoint takes a Web Push
   subscription, `{ endpoint, keys: { p256dh, auth } }` with VAPID
   (`backend/src/controllers/push.ts:19-37`), which an Expo push token does not fit.
   **Recommendation: ship local reminders only, and leave push behind the same flag posture the
   web uses.** Worth noting the web's own reminders are `setTimeout`-based
   (`lib/notifications.ts:107-115`) and die with the tab, so the native implementation would be
   the more reliable of the two.
