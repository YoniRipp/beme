# Standards That Apply

| Standard | Why it applies here |
|---|---|
| `global/tech-stack` | The only reason to touch `frontend/package.json` is a dependency change, and the stack doc is the register of what this project runs on. It is also **out of date** — it lists Expo and TWA as "mobile" and never mentions Capacitor, which this work has to correct. |
| `global/critical-rules` | Bumping a build toolchain a whole major is the highest-risk kind of change this repo allows: it can break Android, which currently ships. "Never break existing functionality" is the binding constraint on the sequencing below. |
| `global/testing` | The fix has no unit test that can prove it. The verification story is a native build plus the existing web gates, and it has to be written down rather than assumed. |
| `frontend/api-client`, `frontend/data-fetching`, `frontend/components`, `frontend/design-tokens`, `frontend/mobile-ui` | **Do not apply.** No `src/` file is touched. Named here so a reviewer can see they were considered and ruled out, not skipped. |
| All `backend/*` | **Do not apply.** No backend file, route, model or event is touched. |

## Key points carried into the work

### From `global/tech-stack`

- The doc's "Other" section reads *"Mobile: Expo React Native app in `mobile/`; TWA wrapper
  in `twa/`."* Capacitor is absent, while root `CLAUDE.md` says `frontend/` "ships as the
  web app, as a PWA, and as a native shell via Capacitor" and calls `mobile/` dormant.
  **The stack doc and `CLAUDE.md` disagree about what the shipping mobile client is.**
  A task whose whole subject is the Capacitor toolchain is the right place to reconcile
  them — see Task 6.
- Node is not pinned anywhere in the standards, only in `.github/workflows/ci.yml`
  (`node-version: '20'`, six times) and `.github/workflows/pwa-checks.yml` (twice).
  Since `@capacitor/cli@8` declares `engines: { node: '>=22.0.0' }`, the runtime version
  becomes a stack fact and belongs in the stack doc once it moves.
- Adding a dependency is a stack decision. This is not adding one — it is correcting the
  range on four that already exist — but the same bar applies: say why the major moves
  forward rather than back.

### From `global/critical-rules`

1. **Never break existing functionality.** `frontend/android/` is committed, scaffolded by
   the same v7 CLI, and is the only native target with any history. Every step that could
   change Android output must be its own commit with the generated diff readable, so it can
   be reverted alone.
2. **Never remove working features.** The Android project, its `AndroidManifest.xml`
   permissions and its icon/splash assets are hand-carried state. `npx cap add android`
   would destroy them. Regeneration is for iOS only; Android gets `sync`, reviewed.
3. **Don't rewrite** what the task doesn't require. Capacitor 9 alphas exist on the
   registry (`9.0.0-alpha.6`). They are out of scope — the target is "the CLI matches the
   core that is already installed," which is `8.5.x`, nothing further.
4. **Don't change API shapes.** Nothing here goes near the wire. The MCP server is
   unaffected.
5. **Default focus is UI, UX, and bug fixing.** This is a build-toolchain bug that blocks
   a whole platform's UX fixes — the companion iOS sweep tasks have nowhere to land until
   it is resolved. It earns its place under rule 5 only because of what it unblocks, which
   is why the plan stays narrow and refuses adjacent cleanups.

### From `global/testing`

- There is no test that can assert "a fresh `cap add ios` builds." The substitute is a
  written, reproducible command sequence in the plan's verification section plus a cheap
  CI drift guard that compares declared majors and greps the generated build settings —
  a lint, not a build.
- The existing gates must stay green and must be run, because a Node bump touches every
  job: `backend: npx vitest run`, `frontend: npx vitest run`, both `npx tsc --noEmit`,
  `npm run build`, and Playwright.

### Repo facts that constrain the work

These are not standards, but they bind the implementation as tightly as one:

- **Root `package.json` declares npm workspaces** (`frontend`, `backend`, `mobile`,
  `packages/*`) and there is a single root `package-lock.json`. A range change in
  `frontend/package.json` regenerates the root lockfile; CI runs `npm ci` from the root.
- **Root `.npmrc` sets `legacy-peer-deps=true`** repo-wide, with a comment explaining it
  works around an npm arborist crash. Peer-conflict detection is therefore off: npm will
  not warn about a Capacitor mismatch, so the fix cannot be validated by install output.
- **`engine-strict` is not set**, so `npm ci` on Node 20 with `@capacitor/cli@8` will print
  `EBADENGINE` and install anyway. The failure would surface later, when `cap` runs. The
  Node bump is a prerequisite, not a follow-up.
