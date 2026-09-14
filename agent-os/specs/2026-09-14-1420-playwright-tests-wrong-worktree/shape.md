# Playwright silently tests whichever worktree owns port 5173

Status: **not started**. Found 2026-09-14 when an E2E run reported a fix as broken that
was, in fact, present in the branch under test.
Severity: **high** — it does not fail loudly. It reports confident, wrong results.

## What happens

`frontend/playwright.config.ts` starts the dev server with:

```ts
{
  command: 'npm run dev',
  url: 'http://localhost:5173',
  reuseExistingServer: !process.env.CI,
}
```

`reuseExistingServer` means: if something is already listening on 5173, use it and do not
start anything. It does not — cannot — check *what* is listening.

This repo runs agents and humans in git worktrees under `.claude/worktrees/`. Every
worktree's Playwright config points at the same port. So the first `npm run dev` anywhere
on the machine wins, and every Playwright run afterwards, from any worktree, tests **that**
checkout's code while reporting against the branch you think you are on.

## How it surfaced

While implementing the missing `/reset-password` page (PR #309), the four new E2E cases
failed while all 27 existing ones passed. The failure context showed the **login page**
rendering at `/reset-password` — precisely the bug being fixed. `lsof` showed the vite on
5173 had `cwd=/Users/yoniripp/Documents/BeMe/frontend`: the main checkout, which does not
have the new route. Playwright was faithfully testing code that predated the fix.

Run against a private port instead, the same suite was 31/31.

The failure mode in the other direction is worse and has probably already happened: if the
server on 5173 belongs to a worktree that *has* a fix, a branch that lacks it passes.

## Why this is not obvious

Every signal points away from the real cause. The tests are correct, the branch is correct,
the config is correct in isolation, and the error looks exactly like a genuine product bug —
so the natural reaction is to go debug the feature. Two of this session's agents lost time
to it independently before the cause was identified.

It also silently defeats the one property `e2e/navigation.spec.ts` exists to guarantee:
that a route is reachable without authentication.

## Options

1. **Give each worktree its own port.** Derive it from the checkout path (a hash of `cwd`)
   and thread it through `baseURL` and `webServer.url`. Keeps `reuseExistingServer` for the
   fast local loop. Most work; best day-to-day.
2. **`reuseExistingServer: false`.** Correct always, costs a server start per run. Simplest
   and hard to get wrong.
3. **Verify identity, keep reuse.** Before the suite, fetch something from the running
   server that identifies its checkout and fail loudly on a mismatch. Cheapest to add and
   converts a silent wrong answer into a clear error, but leaves the developer to fix it.

Recommendation: 3 as an immediate guard, then 1. Option 2 alone is defensible if the
per-run cost is acceptable — measure it before deciding.

Note this interacts with `SKIP_BACKEND=1`: the backend `webServer` entry has the same
`reuseExistingServer` and the same exposure on port 3000.

## Acceptance criteria

- [ ] A Playwright run in worktree A cannot test worktree B's code
- [ ] If it somehow can, the run fails with a message naming the cause
- [ ] `npx playwright test` still works with no manual setup in a fresh clone
- [ ] The same protection covers the backend `webServer` entry on 3000
- [ ] `frontend/CLAUDE.md` says which port a run uses and how to override it
