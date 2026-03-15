# Running TrackVibe on Railway

How to deploy TrackVibe on [Railway](https://railway.app) with managed Postgres and Redis.

## Overview

Railway is a good fit for quick deploys with add-ons for Postgres and Redis.

---

## Setup

1. Create a new project in Railway.
2. Add services: **PostgreSQL**, **Redis**, **Backend**, **Frontend**.
3. Connect your Git repo (or deploy from monorepo).

---

## Backend service

- **Build:** `backend/` (or set root to `backend`)
- **Start:** `node index.js` (or `npm start`)
- **Root directory:** `backend`

### Environment variables

**Required:**

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | Add PostgreSQL service → use connection variable |
| `JWT_SECRET` | Generate a strong secret (e.g. `openssl rand -base64 32`) |
| `CORS_ORIGIN` | Frontend URL (e.g. `https://trackvibe-frontend.up.railway.app`) |

**Optional:**

| Variable | Value |
|----------|-------|
| `REDIS_URL` | Add Redis service → `${{Redis.REDIS_URL}}` |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/) |
| `GOOGLE_CLIENT_ID`, `FACEBOOK_APP_ID`, etc. | For social login |
| `FRONTEND_ORIGIN` | Same as `CORS_ORIGIN` |

---

## Frontend service

- **Build:** `cd frontend && npm install && npm run build`
- **Start:** `node server.cjs` or `npx serve -s dist -l 3000`
- **Root directory:** `frontend`

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
