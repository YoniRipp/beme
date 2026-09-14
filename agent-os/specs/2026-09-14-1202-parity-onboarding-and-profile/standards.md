# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/data-fetching` | The new `useProfile` is a React Query hook: centralised key, explicit `staleTime`, `setQueryData` on mutate |
| `frontend/api-client` | All HTTP goes through `mobile/src/core/api/client.ts`'s `request`; no `fetch` in a screen |
| `frontend/components` | The wizard is one component per step, not one 300-line screen |
| `frontend/design-tokens` | Every colour comes from `useThemedStyles` / `useAppTheme` |
| `frontend/mobile-ui` | 44px targets, one column, cards with generous padding, nothing touching the screen edge |
| `global/domain-conventions` | Height cm, weight kg, dates as `YYYY-MM-DD` day strings |
| `global/critical-rules` | The wizard is a large UI addition: analyse, name the problem, then build |
| `global/tech-stack` | The date picker is a new dependency — raise it, do not assume it |
| `global/testing` | `jest-expo` + RNTL; note the `__tests__` convention below |
| `backend/data-lifecycle` | Read the note below before adding anything per-user |

## Key points carried into the work

- **No backend change and no new table.** `user_profiles` is one row per user with
  `ON DELETE CASCADE` already, and `PUT /api/profile` upserts it. Onboarding must not
  introduce a second store — in particular not an AsyncStorage "has onboarded" flag, which
  would be per-user state living outside the database with no lifecycle story and no way for
  the web to see it.
- **Query keys are centralised.** `profile` goes in `mobile/src/lib/queryKeys.ts` beside
  `goals`, `workouts`, `checkIns`, `foodEntries`. Never inline `['profile']`.
- **`staleTime` is always explicit.** The web uses 5 minutes for the profile; match it.
- **Mutations write the cache, not an invalidate.** `updateProfile` seeds `setQueryData` with
  the response, so the settings form does not flash while it refetches — the same rule the web
  hook follows.
- **Hooks expose actions and display strings**, not mutation objects and not `Error`s.
- **Enum values are contract, not copy.** `sex` and `activity_level` are written to the
  database and read back by the AI prompt builders; the five activity values and four sex
  values must be exactly the web's.
- **Partial writes only.** Send `undefined` for a field the user left blank, never `''` or
  `0` — `models/profile.ts` omits absent fields from the INSERT so the column default applies,
  and an explicit null would bypass it. This is the bug that used to break new-user
  onboarding.
- **`SETTINGS_SECTION_TITLES` is load-bearing.** `mobile/src/screens/SettingsScreen.tsx:21-36`
  documents it: `SettingsCard` only accepts a title from that list, so the JSX and the list
  cannot drift, and a test pins the list. Adding a section means editing both plus the test.
- **`global/testing` says co-locate tests, "not in a `__tests__/` folder".** Everything in
  `mobile/` is in `__tests__/`. Follow the package's own precedent rather than splitting the
  convention inside one package.
