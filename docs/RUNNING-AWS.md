# Running TrackVibe on AWS

How to deploy TrackVibe on Amazon Web Services for production and high scale.

## Overview

For production and scaling, use a full AWS setup:

- **Frontend:** CloudFront + S3 (or Amplify Hosting)
- **API:** API Gateway → ALB → ECS (Fargate) or Lambda
- **Database:** RDS (Postgres) or Aurora
- **Redis:** ElastiCache
- **Queue:** SQS (optional, for event bus when `EVENT_TRANSPORT=sqs`)
- **Auth:** Keep JWT or move to Cognito

See [docs/architecture-target-aws.md](architecture-target-aws.md) for the target diagram.

---

## Option A: ECS Fargate

### 1. Build artifacts

- **Backend:** Push image to ECR from `backend/Dockerfile`
- **Frontend:** Build with `npm run build`; deploy `dist/` to S3

### 2. Infrastructure (summary)

- VPC with public and private subnets
- RDS Postgres (private subnet)
- ElastiCache Redis (private subnet)
- SQS queue (optional, for event bus)
- ECS cluster, task definitions for API and workers
- ALB for API
- CloudFront in front of S3 (static) and ALB (API)

### 3. Backend ECS task env

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Secrets Manager or RDS connection |
| `JWT_SECRET` | Secrets Manager |
| `REDIS_URL` | ElastiCache endpoint |
| `CORS_ORIGIN` | CloudFront or custom domain |
| `FRONTEND_ORIGIN` | S3/CloudFront origin |
| `EVENT_TRANSPORT` | `sqs` (or `redis` with ElastiCache) |
| `EVENT_QUEUE_URL` | SQS queue URL (when using SQS) |
| `AWS_REGION` | e.g. `us-east-1` |

### 4. Event consumer

Run as separate ECS service with `node workers/event-consumer.js`, triggered by SQS or polling.

### 5. Frontend

Build with `VITE_API_URL` = API Gateway or CloudFront/ALB URL. Deploy `dist/` to S3 and serve via CloudFront.

---

## Option B: Amplify

1. Connect frontend repo to Amplify.
2. Build settings: `frontend/` as root, build command `npm run build`, output `dist`.
3. Env vars: `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, etc.
4. Backend: deploy API and workers to ECS or Lambda as above.

---

## Option C: Lightsail (simplified)

- Lightsail Containers for backend and frontend
- Managed Postgres
- Add Redis (Upstash or ElastiCache)
- Lower cost and simpler than ECS/RDS/CloudFront

---

## AWS checklist

- [ ] RDS (or Aurora) Postgres in private subnet
- [ ] Secrets Manager for `DATABASE_URL`, `JWT_SECRET`
- [ ] ElastiCache Redis or Upstash
- [ ] SQS queue (if using SQS event transport)
- [ ] ECR image for backend
- [ ] ECS task definitions (API + event consumer)
- [ ] ALB + target groups
- [ ] CloudFront for static and API (optional)
- [ ] WAF (optional)
- [ ] CloudWatch logs and alarms
