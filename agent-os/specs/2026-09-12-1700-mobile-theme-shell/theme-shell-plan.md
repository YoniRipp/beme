# Mobile Theme + Shell Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development.

**Goal:** Make the Expo app's visual shell — palette, dark mode, typography, and the
settings that drive them — behave the same way the live web client's does.

**Architecture:** The web keeps user settings in `localStorage` under
`trackvibe_settings` and resolves light/dark through `next-themes`. Mobile gets the
same model: one shared settings type + default object in `@trackvibe/shared`, an
AsyncStorage-backed provider on mobile, and a theme hook that resolves
`settings.theme` against the OS scheme. Screens stop importing a frozen light-mode
`colors` object and read the active palette from context instead.

**Spec:** This file. Derived from direct reading of the web client — every value in
Global Constraints was read out of `frontend/` source, not invented.

## Global Constraints

- The web client is the reference. When mobile and web disagree, **web wins** — mobile
  is the one that is wrong. Do not "improve" on the web's choices in this phase.
- `AppSettings` shape, verbatim from `frontend/src/types/settings.ts`:
  `{ currency, dateFormat, units, theme, balanceDisplayColor, balanceDisplayLayout }`.
- `DEFAULT_SETTINGS`, verbatim from `frontend/src/types/settings.ts:105`:
  `{ currency: 'USD', dateFormat: 'DD/MM/YYYY', units: 'metric', theme: 'dark',
     balanceDisplayColor: 'green', balanceDisplayLayout: 'with_income_expenses' }`.
- `Units` is `'metric' | 'imperial'`. It is **not** `'kg' | 'lbs'` — mobile invented
  that vocabulary and it must be replaced, not preserved.
- `Theme` is `'light' | 'dark' | 'system'`. The web's `ThemeProvider` is mounted with
  `defaultTheme="dark" enableSystem` (`frontend/src/App.tsx:14`), so **mobile's default
  is dark too**. Matching this makes the app boot dark; that is the intended change.
- Storage key is `trackvibe_settings` (`frontend/src/lib/storage.ts:189`) on both
  clients, so the two stay conceptually one setting even though the backing stores
  differ (localStorage vs AsyncStorage).
- The web has **no** notifications setting. Mobile's notifications switch therefore has
  no counterpart to port; it is removed, not wired up.
- Do not change any API shape, and do not touch `backend/`. This phase is client-only
  and adds no network calls — web settings are local-only and mobile's must be too.
- `frontend/` must stay at 244/244 tests. Any change there is a re-export shim only.
- Every task ends green on: `npm test -w @trackvibe/shared`, `npm test -w mobile`,
  `npm test -w frontend`, and typecheck in `frontend/`, `mobile/`, `packages/shared`.
- After any dependency change, restart Metro with `--clear` and check mobile's test
  **count**, not just that it is green. See the dependency-gotchas note in the ledger.

---

### Task 1: Shared settings module

**Files:**
- Create: `packages/shared/src/settings/types.ts`, `packages/shared/src/settings/accent.ts`,
  `packages/shared/src/settings/index.ts`
- Create: `packages/shared/src/settings/__tests__/accent.test.ts`
- Modify: `packages/shared/package.json` (add the `./settings` export subpath, matching
  how `./tokens` and `./types` are already exposed)
- Modify: `frontend/src/types/settings.ts` — becomes a re-export shim, exactly like
  `frontend/src/types/workout.ts` already is. Its full export surface must be preserved:
  every type, every const (`CURRENCIES`, `CURRENCY_LABELS`, `BALANCE_DISPLAY_COLORS`,
  `DEFAULT_SETTINGS`, …). Verify with a compile probe, not a grep.
- Modify: `frontend/src/lib/themePalette.ts` — re-export shim over the shared accent map.

**Interfaces produced:** `AppSettings`, `DEFAULT_SETTINGS`, `Units`, `Theme`,
`BalanceDisplayColor`, `ACCENT_PALETTE` (HSL, unchanged for the web), and
`accentHex: Record<BalanceDisplayColor, { primary, primaryForeground, darkPrimary,
darkPrimaryForeground }>` in hex, for React Native.

- [ ] **Step 1:** Move the contents of `frontend/src/types/settings.ts` into
  `packages/shared/src/settings/types.ts` unchanged. Same for
  `frontend/src/lib/themePalette.ts` → `packages/shared/src/settings/accent.ts`.
- [ ] **Step 2:** Add `accentHex`, derived from `ACCENT_PALETTE` by a small
  `hslToHex(h, s, l)` helper in the same file. Do **not** hand-type hex values.
- [ ] **Step 3:** Write the failing test first. It must pin the derivation against
  values that already exist in `packages/shared/src/tokens/colors.ts`, which was
  converted from the same CSS source:
  - `accentHex.green.primary` === `lightColors.primary` (`'#37624d'`) — both come from
    `150 28% 30%`.
  - `accentHex.blue.primary` === `lightColors.workout` (`'#3376c1'`) — both from
    `212 58% 48%`.
  - `accentHex.neutral.primary` === `lightColors.text` (`'#29241f'`) — both from
    `30 14% 14%`.
  - `accentHex.primary` deep-equals `accentHex.green` — the web defines them identically.
  A derivation that disagrees with the existing token file is wrong; fix the helper,
  never the expectation.
- [ ] **Step 4:** Run it, watch it fail, implement, watch it pass.
- [ ] **Step 5:** Prove the frontend shim lost nothing — compile probe for TS2305/TS2724
  specifically, plus `npm test -w frontend` still 244/244. Commit.

---

### Task 2: Mobile settings store

**Files:**
- Create: `mobile/src/context/SettingsContext.tsx`, `mobile/src/hooks/useSettings.ts`
- Create: `mobile/src/context/__tests__/SettingsContext.test.tsx`
- Modify: `mobile/App.tsx` (mount the provider inside `QueryClientProvider`, outside
  `PaperProvider` — the theme depends on settings)

**Interfaces consumed:** `AppSettings`, `DEFAULT_SETTINGS` from Task 1.
**Interfaces produced:** `useSettings(): { settings: AppSettings; updateSettings: (u: Partial<AppSettings>) => void; settingsLoading: boolean }`

Mirror `frontend/src/context/AppContext.tsx` semantics exactly:
- Read once on mount from AsyncStorage key `trackvibe_settings`; write back on update.
- **Always merge over `DEFAULT_SETTINGS`** on read (`{ ...DEFAULT_SETTINGS, ...stored }`),
  so a settings blob written by an older build that lacks a field still works. The web
  does this at `AppContext.tsx` — `mergedSettings`.
- `updateSettings` takes a partial and merges.
- Unlike the web, AsyncStorage is async: expose `settingsLoading` and render nothing
  theme-dependent until the first read resolves, or the app will flash the wrong theme.

- [ ] **Step 1:** Write failing tests: defaults when storage is empty; a partial stored
  blob merges over defaults; `updateSettings` persists and is readable on remount;
  corrupt JSON in storage falls back to defaults rather than throwing.
- [ ] **Step 2:** Run, fail, implement, pass. Commit.

---

### Task 3: Theme resolution

**Files:**
- Create: `mobile/src/theme/ThemeContext.tsx`, `mobile/src/theme/useAppTheme.ts`
- Create: `mobile/src/theme/__tests__/resolve.test.ts`
- Modify: `mobile/src/theme.ts` — keep the existing named exports working, add the
  resolver. Do not delete `colors`/`lightColors`/`darkColors` in this task; Task 4
  migrates the call sites and only then may the static default be reconsidered.
- Modify: `mobile/App.tsx`

**Interfaces consumed:** `useSettings()` from Task 2; `lightColors`/`darkColors` from
`@trackvibe/shared/tokens`; `accentHex` from Task 1.
**Interfaces produced:**
`resolveScheme(themeSetting: Theme, osScheme: 'light'|'dark'|null): 'light'|'dark'`
and `useAppTheme(): { scheme, colors: ColorRoles, paperTheme }`.

- [ ] **Step 1:** Write the failing test for `resolveScheme` as a pure function — it is
  the whole of the logic worth testing and needs no renderer:
  `('light', *) → 'light'`; `('dark', *) → 'dark'`; `('system', 'dark') → 'dark'`;
  `('system', 'light') → 'light'`; `('system', null) → 'dark'` (React Native returns
  null when the OS scheme is unavailable; fall back to the app default, which is dark).
- [ ] **Step 2:** Implement `resolveScheme`, then build `useAppTheme` on top of it using
  `useColorScheme()` from `react-native`.
- [ ] **Step 3:** Apply `accentHex[settings.balanceDisplayColor]` over the resolved
  palette's `primary`, matching what `useThemeEffect` does on the web — it overrides
  `--primary` only, so override `colors.primary` only.
- [ ] **Step 4:** Mount it: `PaperProvider` takes the resolved paper theme,
  `NavigationContainer` takes a matching navigation theme (`DarkTheme`/`DefaultTheme`
  with the palette's colors), and `<StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />`
  — the current `style="auto"` follows the OS, which is exactly the mismatch being fixed.
- [ ] **Step 5:** Tests green, commit.

---

### Task 4: Migrate call sites off the frozen palette

**Files:** the 17 modules that currently `import { colors } from '../theme'` and bake it
into `StyleSheet.create`. Get the current list with:
`grep -rl 'colors\.' mobile/src --include='*.tsx' --include='*.ts' | grep -v __tests__`

`StyleSheet.create` runs once at module load, so a static `colors` import can never go
dark no matter what the provider says. Each file moves to building its styles from the
active palette inside the component.

- [ ] **Step 1:** Establish the pattern on ONE file first — `MetricCard.tsx`, the
  smallest — and get it reviewed before touching the other 16. Prefer a
  `useThemedStyles(fn)` helper (memoised per palette) over inlining style objects, so
  the diff stays mechanical and the styles stay out of render.
- [ ] **Step 2:** Apply the same pattern to the remaining files. Purely mechanical.
- [ ] **Step 3:** Add a guard test that fails if any module under `mobile/src` still
  imports the static `colors` into a `StyleSheet.create` call — otherwise this
  regresses the first time someone adds a screen.
- [ ] **Step 4:** Typecheck, tests, commit.

---

### Task 5: Fonts

**Files:**
- Modify: `mobile/package.json` — add `expo-font`, `@expo-google-fonts/inter`,
  `@expo-google-fonts/fraunces`. Install with `npx expo install <pkg>`, never a bare
  `npm install`, so the SDK 54 ranges are respected.
- Modify: `mobile/App.tsx` (load fonts, hold first paint until ready)
- Modify: `mobile/src/theme.ts` (Paper `fonts` config using the loaded families)

The web pairs Fraunces (display) + Inter (body) — `frontend/index.html:32`,
`frontend/src/index.css:98`. `@trackvibe/shared/tokens` already names these in
`fontFamily` but ships no files; this task supplies them.

The font binaries come from the `@expo-google-fonts/*` packages, which vendor the TTFs
as npm modules. Do **not** try to download font files — outbound `curl` is denied by
this repo's policy, and hand-vendored binaries have no license trail. The Google Fonts
packages carry the SIL Open Font License with them.

- [ ] **Step 1:** `npx expo install expo-font @expo-google-fonts/inter @expo-google-fonts/fraunces`.
  Then immediately re-check the hoisting trap: confirm `react-native-paper` and the
  `@react-navigation/*` packages still resolve, and that mobile's test **count** has not
  dropped. A range change can leave a package nested where a root-hoisted peer cannot
  see it; that has already happened three times in this workspace.
- [ ] **Step 2:** Load with `useFonts`; render nothing until loaded, so type does not
  reflow on first paint.
- [ ] **Step 3:** Map Paper's `fonts` so body text uses Inter and the display /
  `titleLarge` variants use Fraunces at weight 500 — the web sets `h1`/`h2` to 500, not
  Fraunces's default 700 (`packages/shared/src/tokens/typography.ts` documents this).
- [ ] **Step 4:** Restart Metro with `--clear`, confirm the test count, launch the app
  and look at it. Commit.

---

### Task 6: Settings screen parity

**Files:**
- Modify: `mobile/src/screens/SettingsScreen.tsx`
- Modify/create: `mobile/src/screens/__tests__/SettingsScreen.test.tsx`

Three defects to close, all verified against the web:
1. The kg/lbs radio is local `useState` (`SettingsScreen.tsx:28`) that never persists and
   resets on remount. The web's `UnitsSection.tsx:18` calls `updateSettings({ units })`.
   Replace with **metric/imperial**, persisted through `useSettings()`.
2. The notifications switch (`SettingsScreen.tsx:29`) persists nothing and has no web
   counterpart at all. **Remove the section.** A control that does nothing is worse than
   an absent one — the same call already made for "Clear All Data" in the previous phase.
3. No Appearance section. Add one matching `AppearanceSection.tsx`: a
   light / dark / system selector and the four-option accent colour picker
   (`BALANCE_DISPLAY_COLORS`).

- [ ] **Step 1:** Update `SETTINGS_SECTION_TITLES` — it is load-bearing, and
  `SettingsCard` only accepts a title drawn from it, so the compiler enforces the match.
- [ ] **Step 2:** Write the failing test for the new section list and for units
  persisting through `useSettings`.
- [ ] **Step 3:** Implement, pass, commit.
