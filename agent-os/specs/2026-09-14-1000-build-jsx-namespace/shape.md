# Frontend build is broken: `JSX.Element` under hoisted @types/react 19

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **blocker**. Nothing else on this list can be verified until this is fixed.

## The mismatch

`npm run build` fails on a clean checkout of `main`, so there is no production web
bundle — and therefore no PWA build and nothing for `npx cap sync` to copy into the
native shells.

```
$ cd frontend && npx tsc --noEmit
src/components/settings/DateOfBirthInput.tsx(62,30): error TS2503: Cannot find namespace 'JSX'.
```

Reproduced against pristine `main` with `git status` clean — `src/` was untouched.

## Why it happens

`frontend/package.json` declares `"@types/react": "^18.3.1"`, but the actually-installed,
hoisted copy at the monorepo root is **19.1.17**:

```
$ node -p "require('/Users/…/BeMe/node_modules/@types/react/package.json').version"
19.1.17
```

React 19's types removed the **global** `JSX` namespace; it now lives at `React.JSX` and
is re-exported from `'react'`. There is exactly one site in the codebase that still
reaches for the global:

```
frontend/src/components/settings/DateOfBirthInput.tsx:62
  const inputs: Record<Part, JSX.Element> = {
```

## Fix

Two lines, verified locally to bring `npx tsc --noEmit` back to a clean exit:

```diff
 import { Fragment, useEffect, useState } from 'react';
+import type { JSX } from 'react';
```

The named import resolves under both the 18 and 19 typings, so it is safe whichever way
the version skew is eventually settled.

Then decide the underlying question separately: either pin the root install back to
`@types/react@18` to match what `frontend/package.json` claims, or move the frontend to
`^19` deliberately. Right now the manifest and the installed tree disagree, which is how
this slipped in.

## Acceptance criteria

- [ ] `cd frontend && npx tsc --noEmit` exits 0 on a clean checkout
- [ ] `cd frontend && npm run build` produces `dist/`
- [ ] The declared and installed `@types/react` majors agree
- [ ] CI runs the frontend typecheck so this cannot regress silently
