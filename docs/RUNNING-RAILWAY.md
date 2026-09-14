# Running TrackVibe on Railway

How to deploy TrackVibe on [Railway](https://railway.app) with managed Postgres and Redis.

## Overview

Railway is a good fit for quick deploys with add-ons for Postgres and Redis.

---

## Setup

1. Create a new project in Railway.
2. Add services: **PostgreSQL**, **Redis**, **Backend**, **Frontend**.
3. Connect your Git repo (or deploy from monorepo).

### Monorepo settings — read this before anything else

This repo is an **npm workspace**: one `package-lock.json`, at the root, and
`packages/shared` imported by the frontend. Both Dockerfiles therefore build from the
**repo root**, and Railway's **Root Directory is the build context** — a service rooted at
`/backend` cannot see the root lockfile, and the build dies at the first `COPY`.

So each app service needs, in **Settings → Source**:

| Setting | Backend | Frontend |
|---|---|---|
| **Root Directory** | `/` (leave empty) | `/` (leave empty) |
| **Config-as-code path** | `/backend/railway.json` | `/frontend/railway.json` |

Railway's config file does *not* respect Root Directory, so the config path is an absolute
repo path and is set per service.

Everything else — builder, Dockerfile path, which paths trigger a redeploy, the start and
pre-deploy commands — lives in those two `railway.json` files and is version-controlled.
Root Directory used to double as the redeploy filter; `watchPatterns` in each file replaces
that, so the backend still ignores frontend-only commits and vice versa.

---

## Backend service

- **Root directory:** `/` — see [Monorepo settings](#monorepo-settings--read-this-before-anything-else)
- **Build:** Dockerfile, from `backend/railway.json` (`backend/Dockerfile`, repo-root context)
- **Start:** `npm start`, with `npm run migrate:up` as the pre-deploy command — both from
  `backend/railway.json`. They resolve against `backend/package.json`, which is the manifest
  in the image's working directory.

### Environment variables

**Required:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Add PostgreSQL service → use connection variable |
| `JWT_SECRET` | Generate a strong secret (e.g. `openssl rand -base64 32`) |
| `CORS_ORIGIN` | Frontend URL (e.g. `https://trackvibe-frontend.up.railway.app`). Accepts a comma-separated list to allow more than one origin — `https://app.example.com,capacitor://localhost` |

**Optional:**

| Variable | Value |
|----------|-------|
| `REDIS_URL` | Add Redis service → `${{Redis.REDIS_URL}}` |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/) |
| `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, etc. | For social login |
| `FRONTEND_ORIGIN` | Defaults to `CORS_ORIGIN`, or to its **first** entry when that is a list. Set it explicitly whenever `CORS_ORIGIN` lists several origins — it is the one the app builds OAuth callbacks, password-reset links and checkout redirects from |

---

## Frontend service

- **Root directory:** `/` — see [Monorepo settings](#monorepo-settings--read-this-before-anything-else)
- **Build:** Dockerfile, from `frontend/railway.json` (`frontend/Dockerfile`, repo-root context)
- **Start:** the image's own `node server.cjs`; leave the start command empty.

### Environment variables (build-time)

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | Backend public URL (e.g. `https://trackvibe-backend.up.railway.app`) |
| `VITE_GOOGLE_CLIENT_ID` | Same as backend `GOOGLE_CLIENT_ID` |

These must be set at build time (Vite embeds them).

---

## Event consumer (optional)

To run the event consumer as a separate process:

- **Build:** Same as backend
- **Start:** `node workers/event-consumer.js`
- **Root directory:** `backend`
- **Env:** Same `DATABASE_URL`, `REDIS_URL`, `EVENT_TRANSPORT` as backend

---

## Post-deploy

1. Run migrations (CLI or one-off job):
   ```bash
   cd backend && npm run migrate:up
   ```
2. Health check: `GET <backend-url>/health` and `GET <backend-url>/ready`

---

## Reference

See [docs/architecture-current-railway-supabase.md](architecture-current-railway-supabase.md) for the current Railway + Supabase diagram.
