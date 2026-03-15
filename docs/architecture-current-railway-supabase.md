# Current architecture: Railway + Supabase

TrackVibe today runs on **Railway** (frontend, backend, Redis) and **Supabase** (PostgreSQL).

```mermaid
flowchart TB
  subgraph user [User]
    Browser[Browser]
  end

  subgraph railway [Railway]
    subgraph fe [Frontend Service]
      SPA[React SPA / server.cjs]
    end
    subgraph be [Backend Service]
      API[Express API]
      Worker[Voice Worker]
    end
    Redis[(Redis)]
  end

  subgraph supabase [Supabase]
    Postgres[(PostgreSQL)]
  end

  subgraph external [External]
    Gemini[Gemini API]
  end

  Browser -->|HTTPS| SPA
  SPA -->|VITE_API_URL| API
  API <-->|DATABASE_URL| Postgres
  API <-->|REDIS_URL ref| Redis
  API -->|enqueue| Redis
  Redis --> Worker
  Worker --> Gemini
  Worker --> Postgres
  Worker --> Redis
```

## Flow summary

- **User** → Frontend (Railway) → Backend (Railway).
- **Backend** uses Supabase for Postgres and Railway Redis for rate limit, cache, BullMQ, job results.
- **Voice worker** runs in the same backend process; reads jobs from Redis, calls Gemini, writes to Redis/Postgres.
