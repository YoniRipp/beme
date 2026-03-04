# BMe MCP Server

MCP server that exposes BMe goals, workouts, and other domain data as tools and resources. All data is read/written only via the BMe backend API (your DB); no external APIs.

## Prerequisites

- BMe backend running with `DATABASE_URL` set and data API available (e.g. `http://localhost:3000`).
- Node 18+.

## Configuration

- **BEME_API_URL** (optional): Base URL of the BMe backend. Default: `http://localhost:3000`.
- **BEME_MCP_TOKEN** (optional): Shared secret for authenticated API access. If set, the MCP server sends `Authorization: Bearer <token>` on every request. Use the same value as the backend’s `BEME_MCP_SECRET`.

Create a `.env` in this directory or set the variables in the environment (or in Cursor’s MCP `env` for `BEME_API_URL` and `BEME_MCP_TOKEN`).

### Authenticated API access (goals, workouts, etc.)

The goals, workouts, and other domain API routes require a logged-in user. To allow the MCP server to act as a specific user:

1. **Backend** (e.g. `backend/.env` or `backend/.env.development`):
   - **BEME_MCP_SECRET**: A shared secret (e.g. a long random string). Keep it private.
   - **BEME_MCP_USER_ID**: The user ID (UUID) to impersonate. You can get it from `GET /api/auth/me` when logged in, or from your `users` table.

2. **MCP / Cursor** (e.g. in `.cursor/mcp.json` under `env`, or in this directory’s `.env`):
   - **BEME_MCP_TOKEN**: Set to the same value as `BEME_MCP_SECRET`.

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

Add the BMe MCP server in Cursor settings (e.g. `.cursor/mcp.json` or Cursor MCP config):

```json
{
  "mcpServers": {
    "beme": {
      "command": "node",
      "args": ["backend/mcp-server/index.js"],
      "cwd": "/path/to/BMe",
      "env": {
        "BEME_API_URL": "http://localhost:3000",
        "BEME_MCP_TOKEN": "<same value as backend BEME_MCP_SECRET, for authenticated API access>"
      }
    }
  }
}
```

Use the absolute path for your BMe project in `cwd`. Ensure the BMe backend is running so the MCP server can call its API. For authenticated tools, set `BEME_MCP_TOKEN` and the backend’s `BEME_MCP_SECRET` and `BEME_MCP_USER_ID` as described above.

## Tools

- **add_goal** — Add a goal (type: calories/workouts, target, period).
- **list_goals** — List all goals.

## Resources

- **beme://goals** — Current goals (JSON).
