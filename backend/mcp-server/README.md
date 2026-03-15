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

- **add_goal** — Add a goal (type: calories/workouts, target, period).
- **list_goals** — List all goals.

## Resources

- **trackvibe://goals** — Current goals (JSON).
