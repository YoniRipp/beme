# TrackVibe MCP Server

MCP server that exposes TrackVibe goals, workouts, and other domain data as tools and resources. All data is read/written only via the TrackVibe backend API (your DB); no external APIs.

## Prerequisites

- TrackVibe backend running with `DATABASE_URL` set and data API available (e.g. `http://localhost:3000`).
- Node 18+.

## Configuration

- **TRACKVIBE_API_URL** (optional): Base URL of the TrackVibe backend. Default: `http://localhost:3000`.
- **TRACKVIBE_MCP_TOKEN** (optional): Shared secret for authenticated API access. If set, the MCP server sends `Authorization: Bearer <token>` on every request. Use the same value as the backend’s `TRACKVIBE_MCP_SECRET`.

Create a `.env` in this directory or set the variables in the environment (or in Cursor’s MCP `env` for `TRACKVIBE_API_URL` and `TRACKVIBE_MCP_TOKEN`).

### Authenticated API access (goals, workouts, etc.)

The goals, workouts, and other domain API routes require a logged-in user. To allow the MCP server to act as a specific user:

1. **Backend** (e.g. `backend/.env` or `backend/.env.development`):
   - **TRACKVIBE_MCP_SECRET**: A shared secret (e.g. a long random string). Keep it private.
   - **TRACKVIBE_MCP_USER_ID**: The user ID (UUID) to impersonate. You can get it from `GET /api/auth/me` when logged in, or from your `users` table.

2. **MCP / Cursor** (e.g. in `.cursor/mcp.json` under `env`, or in this directory’s `.env`):
   - **TRACKVIBE_MCP_TOKEN**: Set to the same value as `TRACKVIBE_MCP_SECRET`.

If these are not set, unauthenticated calls to goals/workouts/etc. will return 401.

## Run

```bash
cd backend/mcp-server
npm start
```

Or from the repo root:

```bash
node backend/mcp-server/index.js
```

The server uses stdio transport (stdin/stdout). It is intended to be spawned by an MCP client (e.g. Cursor).

## Cursor configuration

Add the TrackVibe MCP server in Cursor settings (e.g. `.cursor/mcp.json` or Cursor MCP config):

```json
{
  "mcpServers": {
    "trackvibe": {
      "command": "node",
      "args": ["backend/mcp-server/index.js"],
      "cwd": "/path/to/TrackVibe",
      "env": {
        "TRACKVIBE_API_URL": "http://localhost:3000",
        "TRACKVIBE_MCP_TOKEN": "<same value as backend TRACKVIBE_MCP_SECRET, for authenticated API access>"
      }
    }
  }
}
```

Use the absolute path for your TrackVibe project in `cwd`. Ensure the TrackVibe backend is running so the MCP server can call its API. For authenticated tools, set `TRACKVIBE_MCP_TOKEN` and the backend’s `TRACKVIBE_MCP_SECRET` and `TRACKVIBE_MCP_USER_ID` as described above.

## Tools

The server exposes 31 domain tools covering all core features, organized by
domain under `tools/`:

- **Food entries** — `list_food_entries`, `add_food_entry`, `add_food_entries_batch`, `update_food_entry`, `delete_food_entry`, `duplicate_food_day`
- **Workouts** — `list_workouts`, `add_workout`, `update_workout`, `delete_workout`
- **Water** — `get_water_today`, `get_water_history`, `add_water_glass`, `remove_water_glass`
- **Weight** — `list_weight_entries`, `add_weight_entry`, `delete_weight_entry`
- **Goals** — `list_goals`, `add_goal`, `update_goal`, `delete_goal`
- **Daily check-ins** — `list_daily_checkins`, `add_daily_checkin`, `update_daily_checkin`
- **Exercises** — `search_exercises`, `get_exercise`
- **Food search** — `search_foods`, `lookup_food_barcode`
- **Profile** — `get_profile`, `update_profile`
- **Streaks** — `get_streaks`

## Resources

- **trackvibe://goals** — Current goals (JSON).
- **trackvibe://profile** — User profile (JSON).
- **trackvibe://water-today** — Today's water intake (JSON).
- **trackvibe://streaks** — Current streaks (JSON).

## Test mode (let Claude test the app via MCP)

Setting **`MCP_TEST_MODE=true`** exposes 8 extra tools that let an agent drive
and verify the running app directly — exploratory/acceptance testing against a
live backend, complementary to the unit suite. These tools are **never exposed**
unless the flag is set.

- **run_tests** — run the backend suite (`vitest run`), optional pattern; returns pass/fail + output.
- **run_typecheck** — run `tsc --noEmit`; returns type errors.
- **reset_test_data** — delete the test user's food/workouts/weight/goals/check-ins (clean slate).
- **seed_test_data** — create a known fixture set (food, workout, goal, weight) for predictable state.
- **get_app_logs** — read backend logs (`error`/`action`); needs an admin test user.
- **get_metrics** — read per-endpoint request counts/latency, errors, cache; needs an admin test user.
- **get_admin_stats** — read aggregated business stats; needs an admin test user.
- **call_raw** — call any endpoint and get `{ status, ok, body }` **without throwing**, to assert on error paths (e.g. that invalid input returns 400).

### Recommended usage

> **Safety:** only enable test mode against a **local backend** with a
> **dedicated test user**. `reset_test_data` permanently deletes that user's
> data. For the diagnostic tools (logs/metrics/stats), point
> `TRACKVIBE_MCP_USER_ID` at an **admin** test user.

The intended loop: drive the live app via the domain tools → use the diagnostic
tools + `call_raw` to verify behavior and find bugs → fix the code → re-test via
MCP → **codify the finding as a real test** (`run_tests` to confirm). MCP
testing *discovers/reproduces*; the suite *locks it in* and is the CI gate.

Enable in your MCP config `env` (or this directory's `.env`):

```json
{
  "mcpServers": {
    "trackvibe": {
      "command": "node",
      "args": ["backend/mcp-server/index.js"],
      "env": {
        "TRACKVIBE_API_URL": "http://localhost:3000",
        "TRACKVIBE_MCP_TOKEN": "<same as backend TRACKVIBE_MCP_SECRET>",
        "MCP_TEST_MODE": "true"
      }
    }
  }
}
```
