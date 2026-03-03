# Pre-Deployment Check Command

Run pre-deployment checks to ensure the codebase is ready for production.

## Usage

Invoke this command before deploying to verify everything is in order.

## Checklist

Execute these checks in order:

### 1. Code Quality

```bash
# Backend
cd backend && npm run lint
cd backend && npm run build

# Frontend
cd frontend && npm run lint
cd frontend && npm run build
```

### 2. Tests

```bash
# Backend tests
cd backend && npm test

# Frontend tests
cd frontend && npm test
```

### 3. Environment Variables

Verify these required variables are documented:
- `DATABASE_URL`
- `JWT_SECRET`
- `GEMINI_API_KEY`
- `FRONTEND_URL`

### 4. Database Migrations

```bash
# Check for pending migrations
cd backend && npm run migrate:up -- --dry-run
```

### 5. Security Checks

- No hardcoded secrets in code
- No console.log statements
- No `any` types in TypeScript
- No disabled linter rules without justification

## Report Format

After running checks, report:

```
Pre-Deployment Check Results
============================
✓ Linting passed
✓ Build succeeded
✓ Tests passed (X tests)
✓ No pending migrations
✓ Security checks passed

Ready for deployment: YES/NO
```

## If Checks Fail

1. Fix linting errors: `npm run lint -- --fix`
2. Fix build errors before proceeding
3. Fix or skip failing tests with justification
4. Apply pending migrations
5. Address security concerns

## Notes

- All checks should pass before deploying
- Document any exceptions or known issues
- Consider running against production environment variables
