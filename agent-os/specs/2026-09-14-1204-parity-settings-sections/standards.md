# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `frontend/components` | Each settings section is its own component, as on the web — not more JSX in one screen |
| `frontend/design-tokens` | Every colour on the new sections comes from `useThemedStyles` / `useAppTheme` |
| `frontend/mobile-ui` | Card-shaped sections, 44px targets, spacing off the `4·8·12·16·24·32` scale |
| `frontend/data-fetching` | The subscription card reads auth context, not a new query; if that changes, it goes through a keyed hook with an explicit `staleTime` |
| `frontend/api-client` | Any new call goes through `mobile/src/core/api/client.ts` |
| `global/domain-conventions` | Weight is kilograms; the units question is about *display*, never about what is stored |
| `global/tech-stack` | Three tasks want a new dependency. Raise each, do not assume |
| `global/critical-rules` | Rule 2 — nothing the Expo screen does today may stop working |
| `global/testing` | `SETTINGS_SECTION_TITLES` is pinned by a test; keep it and its comment true |

## Key points carried into the work

- **Kilograms are the stored unit, always.** `global/domain-conventions` is explicit, and the
  units setting is a display preference. If open question 2 lands on "convert", the conversion
  happens at render and at form submit — never in the database, never in the API payload.
- **Copy is verbatim.** The subscription quota sentences, the "Metric (kg, cm)" labels and the
  date-format option labels are product voice; they already exist in
  `packages/shared/src/settings/types.ts` or in the web components. Import or copy exactly.
  Expo previously invented "Kilograms (kg)" and it took a dedicated test to remove.
- **Enum values are contract.** `units`, `dateFormat`, `theme` and `balanceDisplayColor` are
  typed in `@trackvibe/shared/settings`; the sections must accept those unions, not strings.
- **`SETTINGS_SECTION_TITLES` moves with the JSX.** `mobile/src/screens/SettingsScreen.tsx:21-36`
  explains why it exists: `SettingsCard` accepts only a title from the list, so the two cannot
  drift, and the test pins the list exactly. Its comment is also where a false claim about the
  web has been sitting since 2026-09-13 — fixing that comment is Task 6, Step 1.
- **One formatter, not five call sites.** The date-format setting only means something if every
  numeric date goes through the same helper, mapped exactly as `frontend/src/lib/utils.ts:22-35`
  maps it.
- **Do not port a control that lies.** The web's "Clear All Data" promises server-side deletion
  and performs `localStorage.clear()`. Expo already removed its equivalent. That control stays
  out of Expo until the web's is honest.
- **Per-user data stays bounded.** Nothing here adds a per-user table. If a settings-sync
  endpoint is ever built off open question 1, it is one row per user with
  `user_id … ON DELETE CASCADE`, per `backend/data-lifecycle`.

## Standards friction worth recording

- **`global/testing` says tests co-locate, "not in a `__tests__/` folder".** Every test in
  `mobile/` is in one. Follow the package's precedent rather than splitting the convention
  inside one package.
- **`frontend/data-fetching` assumes TanStack Query owns all server state.** Subscription
  status arrives on the auth response and lives in auth context on the web
  (`useSubscription` reads `useAuth().user`), not in a query. Expo mirrors that rather than
  inventing a second source of truth for the same field.
