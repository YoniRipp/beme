# Running TrackVibe

How to run TrackVibe locally, on Railway, and on AWS.

| Environment | Guide |
|-------------|-------|
| **Local** | [docs/RUNNING-LOCAL.md](RUNNING-LOCAL.md) |
| **Railway** | [docs/RUNNING-RAILWAY.md](RUNNING-RAILWAY.md) |
| **AWS** | [docs/RUNNING-AWS.md](RUNNING-AWS.md) |

## Quick reference

| Environment | Backend | DB | Redis | Event consumer |
|-------------|---------|----|-------|----------------|
| **Local** | `npm start` | Local Postgres / Supabase | Optional | `npm run start:consumer` |
| **Railway** | Railway service | Railway Postgres | Railway Redis | Separate service |
| **AWS** | ECS Fargate | RDS/Aurora | ElastiCache | ECS service or Lambda |
