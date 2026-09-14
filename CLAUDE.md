<!-- Shared section: edit here, then run `npm run sync:agents` to regenerate AGENTS.md. -->
<!-- AGENT-CONTEXT:START -->
# TrackVibe

A mobile-first fitness tracking PWA: food and calories, workouts, exercises, sleep, weight, water, cycle. Voice is the primary input method. The app works and has users — changes should improve it, not restart it.

Monorepo, on npm workspaces: `backend/` (Node/Express/TS) · `frontend/` (React/Vite/TS) · `mobile/` (Expo) · `packages/shared` · `twa/` (Android wrapper).

`frontend/` ships as the web app and the PWA. `mobile/` is **the native client**: the Expo app came back into active development on 2026-09-12 (Expo SDK 54) and is where iOS and Android work belongs. Code both clients need goes in `packages/shared`.

The Capacitor shell inside `frontend/` is **not** the native path any more. No CI job builds it, `frontend/ios/` is not in the repo, and its `@capacitor/cli` is a major behind its runtime — so it does not currently build from a clean checkout. Leave it alone rather than repairing it; new native work goes to `mobile/`.

## Critical rules

1. **Never break existing functionality.**
2. **Never remove working features.**
3. **Don't rewrite backend logic** unless the task genuinely requires it.
4. **Don't change API shapes** unless required — the web client, the Expo app and the MCP server all consume them, and the MCP server ships separately. All three are consumers to keep in sync.
5. Default focus is UI, UX, and bug fixing. This project evolves gradually.
6. **Per-user data must stay bounded.** New per-user tables need `user_id ... ON DELETE CASCADE` and a compaction story. Never read a user's whole history in a request path — pass `{ limit, offset }` or filter by date in SQL. See `backend/data-lifecycle`.

## Standards

Detailed conventions live in `agent-os/standards/` and are injected on demand rather than loaded on every turn. **Read the ones relevant to your task before writing code** — or run `/agent-os:inject-standards`.

Standards folders are `backend/`, `frontend/`, `mobile/`, and `global/`. Put new ones in those.

| Standard | Read it when |
|---|---|
| `backend/api-layers` | Touching any backend endpoint |
| `backend/response-format` | Returning data from a controller |
| `backend/errors` | Anything that can fail |
| `backend/models` | Writing SQL or data access |
| `backend/events` | Mutating domain state |
| `backend/routes` | Adding or changing a route |
| `backend/data-lifecycle` | Adding a per-user table, embeddings, or anything the AI reads |
| `frontend/data-fetching` | Any server state in React |
| `frontend/api-client` | Calling the API from the frontend |
| `frontend/components` | Creating or restructuring components |
| `frontend/design-tokens` | Any color, shadow, or radius |
| `frontend/mobile-ui` | Any screen layout or card |
| `mobile/design-tokens` | Touching `buildPaperTheme` or any colour on the Expo client |
| `global/domain-conventions` | Dates, units, nutrition, meal types |
| `global/testing` | Writing or running tests |
| `global/critical-rules` | Large UI changes |
| `global/tech-stack` | Adding a dependency |

Product context — mission, roadmap, tech stack — is in `agent-os/product/`. Feature specs are in `agent-os/specs/`.

## Agent OS workflow

These live in `.claude/commands/agent-os/`, so they are namespaced — the `agent-os:` prefix is required.

| Command | Use |
|---|---|
| `/agent-os:shape-spec` | Starting significant work. **Run inside plan mode.** Saves a spec to `agent-os/specs/`. |
| `/agent-os:inject-standards` | Pull relevant standards into context before implementing |
| `/agent-os:discover-standards` | A convention exists in the code but isn't written down yet |
| `/agent-os:index-standards` | Rebuild `agent-os/standards/index.yml` after adding standards |
| `/agent-os:plan-product` | Update mission/roadmap/tech-stack |

First-time setup on a new machine — see `docs/AGENT-OS.md`.

## Project commands

| Command | Does |
|---|---|
| `/typecheck` | TypeScript check, both packages |
| `/test-all` | Backend unit, frontend unit, E2E |
| `/fix-tests` | Run tests and fix failures |
| `/test-e2e` | Playwright E2E |
| `/add-feature` | Scaffold a domain feature (backend API + hook + UI) |

`npm run lint` is `tsc --noEmit`. There is no root `tsconfig.json` — run it inside `backend/` or `frontend/`.
<!-- AGENT-CONTEXT:END -->

## Claude-specific tooling

Agent profiles in `.claude/agents/`: `coder`, `tester`, `reviewer`, `devops`, `product-manager`.

> There is deliberately no orchestrator profile. Agent OS v3 retired its own orchestration phases — modern models plan and delegate well without a scripted lead. Plan with `/agent-os:shape-spec` in plan mode instead.

Settings and hooks: `.claude/settings.json`. A PostToolUse hook typechecks the package you edited after every Write/Edit; a PreToolUse hook blocks force-pushes.

MCP server at `backend/mcp-server/` (configured in `.mcp.json`) exposes **45 tools** across 12 modules in `backend/mcp-server/tools/` — goals, workouts, food entries, food search, exercises, weight, water, check-ins, profile, streaks, an `ops_*` group, and a `test-mode` group — plus **4 resources**: `trackvibe://goals`, `trackvibe://profile`, `trackvibe://water-today`, `trackvibe://streaks`.
