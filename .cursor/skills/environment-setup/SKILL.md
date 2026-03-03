# Environment Setup Skill

Guide for configuring BMe environment variables for development and production.

## When to Use

Use this skill when:
- Setting up a new development environment
- Configuring production deployment
- Troubleshooting missing environment variables
- Adding new API integrations

## Environment Files

BMe uses two environment files:
- `backend/.env.development` - Local development
- `backend/.env.production` - Production deployment

## Required Variables

### Database (Required)

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/beme
```

**How to obtain:**
- Local: Install PostgreSQL, create database with `createdb beme`
- Production: Use Railway, Supabase, or Neon PostgreSQL

### Authentication (Required)

```bash
JWT_SECRET=your-secure-random-string-at-least-32-chars
```

**How to generate:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### AI/Voice (Required for voice features)

```bash
GEMINI_API_KEY=your-gemini-api-key
```

**How to obtain:**
1. Go to https://aistudio.google.com/apikey
2. Create a new API key
3. Enable Generative Language API

## Optional Variables

### Redis (Optional - falls back to in-memory)

```bash
REDIS_URL=redis://localhost:6379
```

**Notes:**
- Required for production rate limiting and job queues
- Comment out for local development if Redis isn't running
- App gracefully falls back to in-memory storage

### Stripe (Optional - for subscriptions)

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_ID=price_...
```

**How to obtain:**
1. Create Stripe account at https://stripe.com
2. Get test keys from Dashboard > Developers > API Keys
3. Create webhook at Dashboard > Developers > Webhooks
4. Create product/price in Dashboard > Products

### OAuth Providers (Optional)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

# Facebook OAuth
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Twitter OAuth
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
```

### Application URLs

```bash
# Backend
PORT=3000
NODE_ENV=development

# Frontend URL (for CORS and redirects)
FRONTEND_URL=http://localhost:5173
```

## Development vs Production

| Variable | Development | Production |
|----------|-------------|------------|
| `NODE_ENV` | `development` | `production` |
| `DATABASE_URL` | Local PostgreSQL | Cloud PostgreSQL |
| `REDIS_URL` | Optional/commented | Required |
| `STRIPE_SECRET_KEY` | `sk_test_...` | `sk_live_...` |
| `FRONTEND_URL` | `http://localhost:5173` | `https://your-domain.com` |

## Troubleshooting

### "GEMINI_API_KEY not configured"
- Ensure `GEMINI_API_KEY` is set in your `.env` file
- Restart the backend server after adding

### "Redis ECONNREFUSED"
- Comment out `REDIS_URL` for local development
- Or start Redis: `docker run -p 6379:6379 redis`

### "JWT_SECRET not configured"
- Add `JWT_SECRET` to your `.env` file
- Use a secure random string (32+ characters)

### Database connection failed
- Check PostgreSQL is running
- Verify `DATABASE_URL` format
- Ensure database exists: `createdb beme`

## Template Files

### .env.development (copy to start)

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/beme

# Auth
JWT_SECRET=dev-secret-change-in-production-32-chars-min

# AI (required for voice)
GEMINI_API_KEY=your-key-here

# Redis (optional - comment out if not using)
# REDIS_URL=redis://localhost:6379

# Frontend
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

### .env.production (Railway example)

```bash
# These are typically set via Railway dashboard
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}
JWT_SECRET=${{shared.JWT_SECRET}}
GEMINI_API_KEY=${{shared.GEMINI_API_KEY}}
STRIPE_SECRET_KEY=${{shared.STRIPE_SECRET_KEY}}
STRIPE_WEBHOOK_SECRET=${{shared.STRIPE_WEBHOOK_SECRET}}
FRONTEND_URL=https://beme.app
NODE_ENV=production
```
