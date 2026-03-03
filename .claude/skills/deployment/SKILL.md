# Deployment Skill

Guide for deploying BMe to production environments (Railway, Vercel, etc.).

## When to Use

Use this skill when:
- Deploying to production for the first time
- Updating production deployments
- Debugging production issues
- Configuring CI/CD pipelines

## Deployment Architecture

```
┌─────────────┐     ┌─────────────┐
│   Vercel    │     │   Railway   │
│  (Frontend) │────▶│  (Backend)  │
└─────────────┘     └──────┬──────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
        ┌──────────┐ ┌──────────┐ ┌──────────┐
        │PostgreSQL│ │  Redis   │ │  Gemini  │
        └──────────┘ └──────────┘ │   API    │
                                  └──────────┘
```

## Backend Deployment (Railway)

### 1. Create Railway Project

1. Go to https://railway.app
2. Create new project
3. Add PostgreSQL service
4. Add Redis service (optional but recommended)
5. Add new service from GitHub repo

### 2. Configure Environment Variables

In Railway dashboard, set these variables:

```bash
# Database (auto-filled by Railway)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (auto-filled by Railway)
REDIS_URL=${{Redis.REDIS_URL}}

# Auth
JWT_SECRET=<generate-secure-random-string>

# AI
GEMINI_API_KEY=<your-gemini-api-key>

# Stripe (if using)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...

# URLs
FRONTEND_URL=https://your-frontend-domain.vercel.app
NODE_ENV=production
PORT=3000
```

### 3. Configure Build Settings

In Railway service settings:

```
Root Directory: backend
Build Command: npm ci && npm run build
Start Command: npm start
```

### 4. Run Migrations

```bash
# Connect to Railway shell
railway run npm run migrate:up
```

### 5. Health Check Endpoints

BMe exposes these endpoints:

- `GET /health` - Basic health check (always 200)
- `GET /ready` - Readiness check (checks DB, returns 200 or 503)

Configure Railway to use `/ready` for health checks.

## Frontend Deployment (Vercel)

### 1. Create Vercel Project

1. Go to https://vercel.com
2. Import GitHub repository
3. Configure project:

```
Framework Preset: Vite
Root Directory: frontend
Build Command: npm run build
Output Directory: dist
```

### 2. Configure Environment Variables

```bash
VITE_API_URL=https://your-backend.railway.app
VITE_GOOGLE_CLIENT_ID=<for-oauth>
```

### 3. Configure Redirects

Create `frontend/vercel.json`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests pass: `npm test`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] No console.log statements
- [ ] No hardcoded secrets

### Database

- [ ] Migrations are up to date
- [ ] Migration files are committed
- [ ] No pending schema changes

### Environment

- [ ] All required env vars documented
- [ ] Secrets generated securely
- [ ] API keys are production keys (not test)

### Security

- [ ] CORS configured correctly
- [ ] Rate limiting enabled
- [ ] Auth routes protected
- [ ] Webhook endpoints verified

## Deployment Commands

### Railway CLI

```bash
# Install
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link

# Deploy
railway up

# Run migrations
railway run npm run migrate:up

# View logs
railway logs

# Open shell
railway shell
```

### Vercel CLI

```bash
# Install
npm install -g vercel

# Login
vercel login

# Deploy preview
vercel

# Deploy production
vercel --prod

# View logs
vercel logs
```

## Continuous Deployment

### GitHub Actions Example

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd backend && npm ci
      - run: cd backend && npm test
      - run: cd backend && npm run build

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm ci
      - run: cd frontend && npm run build
```

## Rollback Procedures

### Railway

```bash
# View deployment history
railway deployments

# Rollback to previous
railway rollback
```

### Vercel

1. Go to Vercel dashboard
2. Select project → Deployments
3. Click "..." on previous deployment
4. Select "Promote to Production"

### Database Rollback

```bash
# On Railway
railway run npm run migrate:down

# Multiple steps
railway run npm run migrate:down -- --count 3
```

## Monitoring

### Logs

```bash
# Railway
railway logs --follow

# Vercel
vercel logs --follow
```

### Health Checks

```bash
# Check backend health
curl https://your-backend.railway.app/health
curl https://your-backend.railway.app/ready
```

## Troubleshooting

### Build Fails

- Check Node.js version matches
- Ensure all dependencies are in package.json
- Check for missing environment variables at build time

### Database Connection Fails

- Verify DATABASE_URL is correct
- Check IP allowlist if using external DB
- Ensure SSL is configured (Railway uses SSL)

### CORS Errors

- Update FRONTEND_URL in backend env
- Check CORS configuration in `backend/app.ts`

### Redis Connection Fails

- App gracefully falls back to in-memory
- Check REDIS_URL if using Redis features
