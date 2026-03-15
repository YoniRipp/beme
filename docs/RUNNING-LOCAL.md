# Running TrackVibe Locally

How to run TrackVibe on your machine for development and testing.

## Prerequisites

- **Node.js** 18+
- **PostgreSQL** (local, Docker, or [Supabase](https://supabase.com))
- **Redis** (optional): for async voice, event bus, rate limiting, food cache

---

## Option A: Bare Node (recommended for dev)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env: DATABASE_URL, JWT_SECRET, GEMINI_API_KEY (for voice), REDIS_URL (optional)
npm start
```

- Backend: **http://localhost:3000**
- Without Redis: in-memory rate limit, no food cache, transcript-only voice, in-memory event bus
- With Redis: full features (async voice, event bus, rate limit, cache)

### 2. Frontend

```bash
cd frontend
npm install
# Create .env.development with:
#   VITE_API_URL=http://localhost:3000
#   VITE_GOOGLE_CLIENT_ID=<same as backend>
npm run dev
```

- Frontend: **http://localhost:5173**

### 3. Optional: Event consumer (Mode B)

When `REDIS_URL` is set and you want the event consumer in a **separate process**:

```bash
cd backend
npm run start:consumer
```

---

## Option B: Docker Compose

```bash
# Create backend/.env with DATABASE_URL, JWT_SECRET
docker compose up --build
```

- Frontend: **http://localhost:5173**
- Backend: **http://localhost:3000**
- Redis: `redis://redis:6379` (for backend)

Compose sets `REDIS_URL=redis://redis:6379` and `CORS_ORIGIN=http://localhost:5173`.

---

## Option C: Local Postgres and Redis via Docker

```bash
# Start Postgres
docker run -d --name trackvibe-db -e POSTGRES_USER=trackvibe -e POSTGRES_PASSWORD=trackvibe -e POSTGRES_DB=trackvibe -p 5432:5432 postgres:16-alpine

# Redis
docker run -d --name trackvibe-redis -p 6379:6379 redis:7-alpine
```

Then in `backend/.env`:

```
DATABASE_URL=postgresql://trackvibe:trackvibe@localhost:5432/trackvibe
JWT_SECRET=your-secret
REDIS_URL=redis://localhost:6379
```

```bash
cd backend
npm run migrate:up
npm start
```

```bash
cd frontend
npm run dev
```

---

## Health checks

- **`GET http://localhost:3000/health`** → `{ status: 'ok' }`
- **`GET http://localhost:3000/ready`** → 200 if DB (and Redis when set) is reachable

---

## From repo root

| Command | Description |
|---------|-------------|
| `npm run dev` | Frontend dev server |
| `npm run start:backend` | Start backend |
| `npm run dev:backend` | Backend with watch mode |
