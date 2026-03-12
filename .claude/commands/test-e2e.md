---
description: Run Playwright E2E tests
argument-hint: test-filter (optional)
allowed-tools: Bash, Read, Write, Edit
---

Run E2E tests: !`cd frontend && npx playwright test $ARGUMENTS`

If any fail, read the failing test and the source code it tests.
Fix the root cause (not the test assertions).
Re-run the specific failing test to confirm.
