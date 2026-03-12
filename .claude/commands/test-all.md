---
description: Run all tests (backend unit, frontend unit, E2E)
allowed-tools: Bash, Read, Write, Edit
---

Run all tests sequentially:

1. Backend unit tests: !`cd backend && npx vitest run`
2. Frontend unit tests: !`cd frontend && npx vitest run`
3. E2E tests: !`cd frontend && npx playwright test`

Report a summary of all results. If any fail, read the failing test and source code it tests, fix the root cause, and re-run.
