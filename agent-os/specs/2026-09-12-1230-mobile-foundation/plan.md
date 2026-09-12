# Mobile Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the shared workspace, mobile test harness, and data-correctness fixes that every later mobile sub-project depends on.

**Architecture:** An npm workspace at `packages/shared` holds the platform-agnostic layer — types, Zod schemas, an API transport that takes an injected token provider, domain helpers, and design tokens. `frontend`, `backend` and `mobile` all consume it. No UI code and no backend change.

**Tech Stack:** TypeScript, npm workspaces, Metro (React Native), Vite (web), Zod, TanStack Query, jest-expo + React Native Testing Library.

**Spec:** `agent-os/specs/2026-09-12-1230-mobile-foundation/` — read `shape.md` before starting.

## Global Constraints

- **CLAUDE.md rule #1: never break existing functionality.** `frontend/` is live with real users.
- **CLAUDE.md rule #4: do not change API shapes.** The MCP server ships separately and consumes them.
- `frontend/`'s 36 existing test suites must pass unchanged after every task.
- No backend change in this sub-project. The API surface is already parity-ready.
- Node 18+; Expo SDK 54; React Native 0.81.5; React 19.1.0.
- Every task ends green and committed. Any task may be reverted on its own.
- Do **not** port these five dead web files: `CalorieTrendChart.tsx`, `CaloriesEditModal.tsx`,
  `EnergyChart.tsx`, `WellnessCard.tsx`, `DailyCheckInModal.tsx`.

## File Structure

| File | Responsibility |
|---|---|
| `package.json` (root) | Declares the workspaces |
| `packages/shared/package.json` | Package manifest with subpath exports |
| `packages/shared/tsconfig.json` | Build config |
| `packages/shared/src/types/*.ts` | One definition of each domain type |
| `packages/shared/src/schemas/*.ts` | Zod schemas shared by both clients |
| `packages/shared/src/api/transport.ts` | `createTransport()` — injected token provider |
| `packages/shared/src/domain/*.ts` | Date/unit/nutrition helpers, mappers |
| `packages/shared/src/tokens/*.ts` | Colour, type and elevation scales |
| `mobile/metro.config.js` | Teaches Metro to resolve the workspace |
| `mobile/jest.config.js` | jest-expo preset |

## Ordering note

Task 3 (shared types) comes **before** Task 4 (the workout data-loss fix) deliberately.
Mobile's `Exercise` type is missing `weightPerSet` and `completedPerSet`, which is *why* the
form drops them. Adopting the shared type is the structural fix; Task 4 only wires it through.

---

### Task 1: Workspace plumbing

No files move in this task. The only deliverable is that the workspace resolves and all three
packages still build. If Metro cannot resolve the workspace cleanly after Step 6, stop and fall
back to path aliases per `shape.md` — do not fight it.

**Files:**
- Modify: `package.json`
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/src/index.ts`
- Create: `mobile/metro.config.js`

**Interfaces:**
- Consumes: nothing.
- Produces: the importable package name `@trackvibe/shared`.

- [ ] **Step 1: Add the workspaces field to the root manifest**

In `package.json`, add after `"private": true,`:

```json
  "workspaces": [
    "frontend",
    "backend",
    "mobile",
    "packages/*"
  ],
```

- [ ] **Step 2: Create the shared package manifest**

Create `packages/shared/package.json`:

```json
{
  "name": "@trackvibe/shared",
  "version": "1.0.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts",
    "./schemas": "./src/schemas/index.ts",
    "./api": "./src/api/index.ts",
    "./domain": "./src/domain/index.ts",
    "./tokens": "./src/tokens/index.ts"
  },
  "dependencies": {
    "zod": "^4.3.6"
  }
}
```

Source is consumed directly as TypeScript — no build step. Vite, Metro and tsx all compile it.

- [ ] **Step 3: Create the shared tsconfig**

Create `packages/shared/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "declaration": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src/**/*"]
}
```

`lib` deliberately omits `DOM` — that is what stops browser-only code being added here by accident.

- [ ] **Step 4: Create a placeholder entry point**

Create `packages/shared/src/index.ts`:

```ts
// Subpath exports are the supported entry points; see package.json "exports".
export const SHARED_PACKAGE_VERSION = '1.0.0';
```

- [ ] **Step 5: Create the Metro config**

Create `mobile/metro.config.js`:

```js
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Metro must watch the monorepo root so changes in packages/shared trigger a rebuild.
config.watchFolders = [monorepoRoot];

// Resolve from the app first, then the hoisted root node_modules.
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Without this Metro walks up and can load two copies of React.
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
```

- [ ] **Step 6: Install and verify every package still builds**

```bash
npm install
cd frontend && npx tsc --noEmit
cd ../backend && npx tsc --noEmit
cd ../mobile && npx tsc --noEmit
```

Expected: all three exit 0. Hoisting moves most `node_modules` to the root — that is expected.

- [ ] **Step 7: Verify the web test suite is untouched**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npm run test -- --run
```

Expected: all 36 suites pass. **If any fail, stop** — Global Constraint 1 is violated.

- [ ] **Step 8: Verify Metro still bundles the app**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npx expo start --host localhost --clear
```

Then load it: `xcrun simctl openurl booted "exp://127.0.0.1:8081"`.
Expected: "iOS Bundled … index.ts" with no resolution errors, and the login screen renders.
This is the step that most often fails in an RN monorepo; it is why it has its own gate.

- [ ] **Step 9: Commit**

```bash
git add package.json package-lock.json packages/shared mobile/metro.config.js
git commit -m "Add packages/shared workspace and Metro monorepo resolution"
```

---

### Task 2: Mobile test harness

`mobile/` has no test runner. Every later task writes tests, so this comes second.

**Files:**
- Modify: `mobile/package.json`
- Create: `mobile/jest.config.js`, `mobile/jest.setup.js`, `mobile/src/domain/__tests__/harness.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `npm test` inside `mobile/`.

- [ ] **Step 1: Install the test dependencies**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile
npx expo install jest-expo jest @testing-library/react-native @types/jest react-test-renderer
```

- [ ] **Step 2: Add the test script**

In `mobile/package.json`, add to `"scripts"`:

```json
    "test": "jest",
    "test:watch": "jest --watch"
```

- [ ] **Step 3: Create the Jest config**

Create `mobile/jest.config.js`:

```js
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@trackvibe/shared))',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts'],
};
```

`@trackvibe/shared` is in the allow-list because it ships untranspiled TypeScript.

- [ ] **Step 4: Create the Jest setup file**

Create `mobile/jest.setup.js`:

```js
/* eslint-env jest */

// expo-secure-store has no JS implementation under the test runner.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => { store.set(k, v); }),
    deleteItemAsync: jest.fn(async (k) => { store.delete(k); }),
  };
});
```

- [ ] **Step 5: Write a test that proves the harness and the workspace import both work**

Create `mobile/src/domain/__tests__/harness.test.ts`:

```ts
import { SHARED_PACKAGE_VERSION } from '@trackvibe/shared';

describe('test harness', () => {
  it('runs', () => {
    expect(true).toBe(true);
  });

  it('can import from the shared workspace package', () => {
    expect(SHARED_PACKAGE_VERSION).toBe('1.0.0');
  });
});
```

- [ ] **Step 6: Run the tests**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm test
```

Expected: 2 passing. The second test failing means Metro resolves the workspace but Jest does
not — fix `transformIgnorePatterns` or add a `moduleNameMapper` entry for `@trackvibe/shared`.

- [ ] **Step 7: Commit**

```bash
git add mobile/package.json mobile/package-lock.json mobile/jest.config.js mobile/jest.setup.js mobile/src/domain/__tests__/harness.test.ts
git commit -m "Add jest-expo test harness to the mobile app"
```

---

### Task 3: Shared domain types

The two clients define the same types with a dangerous divergence: mobile's `Exercise` is
missing `weightPerSet` and `completedPerSet`. Adopting one definition is the structural fix for
the Task 4 data-loss bug.

**Files:**
- Create: `packages/shared/src/types/workout.ts`, `energy.ts`, `goals.ts`, `user.ts`, `api.ts`, `index.ts`
- Create: `packages/shared/src/types/__tests__/workout.test.ts`
- Modify: `frontend/src/types/*.ts`, `mobile/src/types/*.ts` (re-export only)

**Interfaces:**
- Consumes: Task 1's `@trackvibe/shared`.
- Produces: `Workout`, `Exercise`, `WorkoutType`, `WORKOUT_TYPES`, `PaginatedResponse<T>` from `@trackvibe/shared/types`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/types/__tests__/workout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { WORKOUT_TYPES, type Exercise } from '../workout';

describe('shared workout types', () => {
  it('exposes the four workout types', () => {
    expect(WORKOUT_TYPES).toEqual(['strength', 'cardio', 'flexibility', 'sports']);
  });

  it('models all three per-set arrays', () => {
    const e: Exercise = {
      name: 'Bench press',
      sets: 3,
      reps: 8,
      repsPerSet: [8, 8, 6],
      weightPerSet: [60, 60, 65],
      completedPerSet: [true, true, false],
    };
    expect(e.weightPerSet).toHaveLength(3);
    expect(e.completedPerSet).toEqual([true, true, false]);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/types/__tests__/workout.test.ts
```

Expected: FAIL — `Cannot find module '../workout'`.

- [ ] **Step 3: Create the shared workout type**

Create `packages/shared/src/types/workout.ts` — this is `frontend/src/types/workout.ts` verbatim,
because the web's definition is the complete one:

```ts
export type WorkoutType = 'strength' | 'cardio' | 'flexibility' | 'sports';

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  /** When present, one rep count per set; length must equal sets. */
  repsPerSet?: number[];
  /** When present, one weight value per set; length must equal sets. */
  weightPerSet?: Array<number | undefined>;
  /** When present, one done/not-done flag per set; length must equal sets. */
  completedPerSet?: boolean[];
  weight?: number;
  notes?: string;
}

export interface Workout {
  id: string;
  date: Date;
  title: string;
  type: WorkoutType;
  durationMinutes: number;
  exercises: Exercise[];
  notes?: string;
  completed: boolean;
}

export const WORKOUT_TYPES: WorkoutType[] = ['strength', 'cardio', 'flexibility', 'sports'];
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/types/__tests__/workout.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 5: Move the remaining four type files**

Copy each of `energy.ts`, `goals.ts`, `user.ts`, `api.ts` from `frontend/src/types/` into
`packages/shared/src/types/`. The web version is the reference **except where mobile has the
superset** — diff both copies before moving each file.

One known case: `MealType` (`'breakfast' | 'lunch' | 'dinner' | 'snack'`) is a named type in
`mobile/src/types/api.ts:17`, while the web inlines that union in `FoodEntry.mealType`. Keep
mobile's named type and have the shared `FoodEntry.mealType?: MealType` reference it — Task 10
imports `MealType` from `@trackvibe/shared/types`.

Record any other field one copy had and the other lacked in the commit message.

- [ ] **Step 6: Create the types barrel**

Create `packages/shared/src/types/index.ts`:

```ts
export * from './workout';
export * from './energy';
export * from './goals';
export * from './user';
export * from './api';
```

- [ ] **Step 7: Re-point both clients at the shared types**

Replace the body of each file in `frontend/src/types/` and `mobile/src/types/` with a
re-export, so no call site has to change:

```ts
export * from '@trackvibe/shared/types';
```

Keeping the local module as a re-export is deliberate — it keeps this task's diff small and
reviewable. A later cleanup can rewrite the ~200 import sites.

- [ ] **Step 8: Verify both clients typecheck and the web suite still passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx tsc --noEmit && npm run test -- --run
cd ../mobile && npx tsc --noEmit && npm test
```

Expected: all green. Mobile may now surface type errors where code assumed the narrower
`Exercise` — that is the bug becoming visible, and Task 4 fixes it. If the errors are only in
`WorkoutFormScreen.tsx` and `core/api/workouts.ts`, that is the expected blast radius.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src/types frontend/src/types mobile/src/types
git commit -m "Move domain types into the shared package"
```

---

### Task 4: Stop the mobile workout form destroying per-set data

**Verified defect, in both directions:**
- Reading: `apiWorkoutToWorkout` in `mobile/src/features/body/mappers.ts` lists fields
  explicitly and never maps `weightPerSet` or `completedPerSet`. Its local `ApiExercise` type
  omits them too.
- Writing: `handleSave` in `WorkoutFormScreen.tsx` builds its payload inline with no mapper,
  so whatever the read dropped is written back as absent.

Net effect: opening and saving on mobile a workout logged per-set on web **wipes** the per-set
reps, weights and completion flags.

**Files:**
- Modify: `mobile/src/features/body/mappers.ts`, `mobile/src/core/api/workouts.ts`, `mobile/src/screens/WorkoutFormScreen.tsx`
- Create: `mobile/src/features/body/__tests__/mappers.test.ts`

**Interfaces:**
- Consumes: `Exercise`, `Workout` from `@trackvibe/shared/types` (Task 3).
- Produces: `workoutToApiWorkout(w: Workout): ApiWorkoutPayload` — a new export alongside the existing `apiWorkoutToWorkout`.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/features/body/__tests__/mappers.test.ts`:

```ts
import { apiWorkoutToWorkout, workoutToApiWorkout } from '../mappers';

const apiWorkout = {
  id: 'w1',
  date: '2026-09-12',
  title: 'Push day',
  type: 'strength',
  durationMinutes: 45,
  completed: true,
  exercises: [{
    name: 'Bench press',
    sets: 3,
    reps: 8,
    repsPerSet: [8, 8, 6],
    weightPerSet: [60, 60, 65],
    completedPerSet: [true, true, false],
  }],
};

describe('workout mappers', () => {
  it('reads all three per-set arrays from the API', () => {
    const ex = apiWorkoutToWorkout(apiWorkout).exercises[0];
    expect(ex.repsPerSet).toEqual([8, 8, 6]);
    expect(ex.weightPerSet).toEqual([60, 60, 65]);
    expect(ex.completedPerSet).toEqual([true, true, false]);
  });

  it('writes all three per-set arrays back to the API', () => {
    const ex = workoutToApiWorkout(apiWorkoutToWorkout(apiWorkout)).exercises[0];
    expect(ex.repsPerSet).toEqual([8, 8, 6]);
    expect(ex.weightPerSet).toEqual([60, 60, 65]);
    expect(ex.completedPerSet).toEqual([true, true, false]);
  });

  it('survives a full round trip unchanged', () => {
    const out = workoutToApiWorkout(apiWorkoutToWorkout(apiWorkout));
    expect(out.exercises).toEqual(apiWorkout.exercises);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm test -- mappers
```

Expected: FAIL — `workoutToApiWorkout` is not exported, and `weightPerSet` is `undefined`.

- [ ] **Step 3: Widen the ApiExercise type and carry every field through the read mapper**

In `mobile/src/features/body/mappers.ts`, widen the local type and stop enumerating fields:

```ts
type ApiExercise = {
  name: string;
  sets: number;
  reps: number;
  repsPerSet?: number[];
  weightPerSet?: Array<number | undefined>;
  completedPerSet?: boolean[];
  weight?: number;
  notes?: string;
};
```

Then in `apiWorkoutToWorkout`, replace the hand-listed exercise mapping with a spread so no
field can be silently dropped again:

```ts
    exercises: (a.exercises ?? []).map((e) => ({ ...e })),
```

The existing `repsPerSet.length === e.sets` guard is dropped deliberately: silently discarding
a mismatched array is what loses data. Validation belongs in the form, not the mapper.

- [ ] **Step 4: Add the write mapper**

Append to `mobile/src/features/body/mappers.ts`:

```ts
import { toLocalDateString } from '../../lib/dateRanges';

export type ApiWorkoutPayload = {
  title: string;
  type: string;
  date: string;
  durationMinutes: number;
  exercises: ApiExercise[];
  notes?: string;
  completed: boolean;
};

export function workoutToApiWorkout(w: Workout): ApiWorkoutPayload {
  return {
    title: w.title,
    type: w.type,
    date: toLocalDateString(w.date),
    durationMinutes: w.durationMinutes,
    exercises: w.exercises.map((e) => ({ ...e })),
    notes: w.notes,
    completed: w.completed,
  };
}
```

- [ ] **Step 5: Widen the API client type**

In `mobile/src/core/api/workouts.ts`, add `weightPerSet?: Array<number | undefined>` and
`completedPerSet?: boolean[]` to the exercise shape inside `ApiWorkout`, so the fields survive
serialisation.

- [ ] **Step 6: Make the form preserve what it is not editing**

In `handleSave` in `mobile/src/screens/WorkoutFormScreen.tsx`, the payload is built inline from
the form fields only. Merge each edited exercise over the original so untouched per-set arrays
survive:

```ts
        exercises: validExercises.map((e, i) => ({
          ...(existing?.exercises[i] ?? {}),
          name: e.name.trim(),
          sets: e.sets,
          reps: e.reps,
          weight: e.weight,
          notes: e.notes,
        })),
```

The mobile form does not yet *edit* per-set values — that belongs to the workouts sub-project.
This task only stops it destroying them.

- [ ] **Step 7: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm test -- mappers
```

Expected: PASS, 3 tests.

- [ ] **Step 8: Verify against the real backend**

Log a workout with per-set data on the web client, open and save it on the simulator, then:

```bash
docker exec trackvibe-db psql -U trackvibe -d trackvibe -c "SELECT exercises FROM workouts ORDER BY created_at DESC LIMIT 1;"
```

Expected: `repsPerSet`, `weightPerSet` and `completedPerSet` all still present.

- [ ] **Step 9: Commit**

```bash
git add mobile/src/features/body/mappers.ts mobile/src/core/api/workouts.ts mobile/src/screens/WorkoutFormScreen.tsx mobile/src/features/body/__tests__/mappers.test.ts
git commit -m "Stop the mobile workout mappers discarding per-set data"
```

---

### Task 5: Stop food totals truncating at 50 entries

**Verified defect:** `mobile/src/core/api/food.ts:21` requests `/api/food-entries` with no
`limit` or `offset`, so the backend's default of 50 caps what the client ever sees. Weekly,
monthly and yearly totals are silently wrong beyond that cutoff.

**Files:**
- Modify: `mobile/src/core/api/food.ts`, `mobile/src/hooks/useEnergy.ts`
- Create: `mobile/src/core/api/__tests__/food.test.ts`

**Interfaces:**
- Consumes: `PaginatedResponse<T>` from `@trackvibe/shared/types`.
- Produces: `foodApi.list(params?: { limit?: number; offset?: number })` and `foodApi.listAll()`.

- [ ] **Step 1: Write the failing test**

Create `mobile/src/core/api/__tests__/food.test.ts`:

```ts
import { foodApi } from '../food';

const request = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => request(...args),
}));

describe('foodApi.list', () => {
  beforeEach(() => {
    request.mockReset();
    request.mockResolvedValue({ data: [], total: 0, limit: 200, offset: 0, hasMore: false });
  });

  it('sends an explicit limit and offset', async () => {
    await foodApi.list({ limit: 200, offset: 0 });
    expect(request).toHaveBeenCalledWith('/api/food-entries?limit=200&offset=0');
  });

  it('pages until hasMore is false', async () => {
    request
      .mockResolvedValueOnce({ data: new Array(200).fill({ id: 'x' }), total: 250, limit: 200, offset: 0, hasMore: true })
      .mockResolvedValueOnce({ data: new Array(50).fill({ id: 'y' }), total: 250, limit: 200, offset: 200, hasMore: false });

    const all = await foodApi.listAll();

    expect(all).toHaveLength(250);
    expect(request).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm test -- food
```

Expected: FAIL — `list` takes no arguments and `listAll` does not exist.

- [ ] **Step 3: Implement paging**

In `mobile/src/core/api/food.ts`, replace the `list` entry:

```ts
const PAGE_SIZE = 200;

export const foodApi = {
  list: (params: { limit?: number; offset?: number } = {}) => {
    const limit = params.limit ?? PAGE_SIZE;
    const offset = params.offset ?? 0;
    return request<PaginatedResponse<ApiFoodEntry>>(
      `/api/food-entries?limit=${limit}&offset=${offset}`,
    );
  },

  /** Fetch every entry, following pagination. Used by the totals and trend views. */
  listAll: async (): Promise<ApiFoodEntry[]> => {
    const out: ApiFoodEntry[] = [];
    let offset = 0;
    for (;;) {
      const page = await foodApi.list({ limit: PAGE_SIZE, offset });
      out.push(...page.data);
      if (!page.hasMore) return out;
      offset += PAGE_SIZE;
    }
  },
  // ...existing create / update / delete entries unchanged
};
```

- [ ] **Step 4: Point the hook at `listAll`**

In `mobile/src/hooks/useEnergy.ts`, the query that feeds totals and the Insights trend must call
`foodApi.listAll()`. Leave any list view that genuinely wants one page on `foodApi.list()`.

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm test -- food
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/core/api/food.ts mobile/src/hooks/useEnergy.ts mobile/src/core/api/__tests__/food.test.ts
git commit -m "Page the mobile food entry list so totals stop truncating at 50"
```

---

### Task 6: Fix wrong macros for drinks and per-unit foods

**Verified defect:** `mobile/src/screens/FoodEntryFormScreen.tsx:108` hard-codes
`portionUnit: 'g'` and scales by `/100`, ignoring `referenceGrams`, `isLiquid`,
`servingSizesMl`, `defaultUnit` and `unitWeightGrams` — all returned by `/api/food/search`
and all honoured by `frontend/src/components/energy/FoodEntryModal.tsx`.

A 250ml glass of milk and a 50g egg are both scaled as if per-100g solids.

**Files:**
- Create: `packages/shared/src/domain/portion.ts`, `packages/shared/src/domain/__tests__/portion.test.ts`
- Modify: `mobile/src/screens/FoodEntryFormScreen.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `scalePortion(food, amount, unit)` returning `{ calories, protein, carbs, fats, portionUnit }`, and `defaultPortionFor(food)` returning `{ amount, unit }`, both from `@trackvibe/shared/domain`.

- [ ] **Step 1: Read the correct implementation first**

Read `frontend/src/components/energy/FoodEntryModal.tsx` and note exactly how it derives the
scale factor from `referenceGrams`, chooses ml vs g from `isLiquid`, and applies
`unitWeightGrams` for per-unit foods. The shared helper must reproduce that behaviour — the web
client is the reference, and its users' data already depends on it.

- [ ] **Step 2: Write the failing test**

Create `packages/shared/src/domain/__tests__/portion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scalePortion, defaultPortionFor } from '../portion';

const milk = { name: 'Milk', calories: 64, protein: 3.3, carbs: 4.8, fat: 3.6,
  referenceGrams: 100, isLiquid: true, servingSizesMl: [250], defaultUnit: null, unitWeightGrams: null };

const egg = { name: 'Egg', calories: 155, protein: 13, carbs: 1.1, fat: 11,
  referenceGrams: 100, isLiquid: false, servingSizesMl: null, defaultUnit: 'unit', unitWeightGrams: 50 };

const chicken = { name: 'Chicken breast', calories: 165, protein: 31, carbs: 0, fat: 3.6,
  referenceGrams: 100, isLiquid: false, servingSizesMl: null, defaultUnit: null, unitWeightGrams: null };

describe('scalePortion', () => {
  it('scales a solid per 100g', () => {
    expect(scalePortion(chicken, 200, 'g').calories).toBe(330);
  });

  it('scales a liquid by millilitres and labels the unit ml', () => {
    const r = scalePortion(milk, 250, 'ml');
    expect(r.calories).toBe(160);
    expect(r.portionUnit).toBe('ml');
  });

  it('scales a per-unit food by its unit weight', () => {
    // 2 eggs = 100g = one reference portion
    expect(scalePortion(egg, 2, 'unit').calories).toBe(155);
  });
});

describe('defaultPortionFor', () => {
  it('defaults a liquid to its first serving size in ml', () => {
    expect(defaultPortionFor(milk)).toEqual({ amount: 250, unit: 'ml' });
  });

  it('defaults a per-unit food to one unit', () => {
    expect(defaultPortionFor(egg)).toEqual({ amount: 1, unit: 'unit' });
  });

  it('defaults a plain solid to 100g', () => {
    expect(defaultPortionFor(chicken)).toEqual({ amount: 100, unit: 'g' });
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/domain/__tests__/portion.test.ts
```

Expected: FAIL — `Cannot find module '../portion'`.

- [ ] **Step 4: Implement the helper**

Create `packages/shared/src/domain/portion.ts`:

```ts
export interface PortionSource {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  referenceGrams: number | null;
  isLiquid: boolean;
  servingSizesMl: number[] | null;
  defaultUnit: string | null;
  unitWeightGrams: number | null;
}

export type PortionUnit = 'g' | 'ml' | 'unit';

export interface ScaledPortion {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  portionUnit: PortionUnit;
}

const round = (n: number) => Math.round(n * 10) / 10;

/** Grams-equivalent of `amount` in `unit`, used as the numerator of the scale factor. */
function toGrams(food: PortionSource, amount: number, unit: PortionUnit): number {
  if (unit === 'unit') return amount * (food.unitWeightGrams ?? 0);
  // Millilitres are treated as grams 1:1, matching the web client.
  return amount;
}

export function scalePortion(food: PortionSource, amount: number, unit: PortionUnit): ScaledPortion {
  const reference = food.referenceGrams && food.referenceGrams > 0 ? food.referenceGrams : 100;
  const scale = toGrams(food, amount, unit) / reference;
  return {
    calories: Math.round(food.calories * scale),
    protein: round(food.protein * scale),
    carbs: round(food.carbs * scale),
    fats: round(food.fat * scale),
    portionUnit: unit,
  };
}

export function defaultPortionFor(food: PortionSource): { amount: number; unit: PortionUnit } {
  if (food.defaultUnit === 'unit' && food.unitWeightGrams) return { amount: 1, unit: 'unit' };
  if (food.isLiquid) return { amount: food.servingSizesMl?.[0] ?? 250, unit: 'ml' };
  return { amount: food.referenceGrams ?? 100, unit: 'g' };
}
```

- [ ] **Step 5: Create the domain barrel**

`package.json` maps the `./domain` subpath to `./src/domain/index.ts`, so that file must exist
before anything can import from `@trackvibe/shared/domain`. Create
`packages/shared/src/domain/index.ts`:

```ts
export * from './portion';
```

Task 10 extends this barrel with the date and meal helpers.

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/domain/__tests__/portion.test.ts
```

Expected: PASS, 6 tests.

- [ ] **Step 7: Use the helper in the mobile form**

In `mobile/src/screens/FoodEntryFormScreen.tsx`, delete the two `/ 100` scale computations and
the hard-coded `portionUnit: 'g' as const`. On selecting a search result call
`defaultPortionFor(food)` to seed the amount and unit; on amount or unit change call
`scalePortion(food, amount, unit)` and use its four macro values and `portionUnit`.

- [ ] **Step 8: Verify in the simulator**

Search "milk", accept the default portion, and confirm the form shows 250 ml and ~160 kcal
rather than 64 kcal with a "g" label.

- [ ] **Step 9: Commit**

```bash
git add packages/shared/src/domain/portion.ts packages/shared/src/domain/index.ts packages/shared/src/domain/__tests__/portion.test.ts mobile/src/screens/FoodEntryFormScreen.tsx
git commit -m "Respect reference grams, liquids and per-unit foods when scaling portions"
```

---

### Task 7: Make "Clear All Data" honest

**Verified defect:** `mobile/src/screens/SettingsScreen.tsx:61` passes
`onConfirm={() => setShowClearDialog(false)}`. The dialog promises to permanently delete
workouts, food entries, sleep logs and goals, then deletes nothing.

**Decision required before implementing:** the backend has no single "delete all my data"
endpoint. Confirm with the owner which to do — wire the control to the existing per-domain
delete endpoints, or remove the control until the account sub-project adds it. **Do not invent
a backend endpoint; Global Constraint 4 forbids a backend change here.**

Removing it is the recommended default: a destructive confirmation that lies is worse than no
control, and the account sub-project owns this surface properly.

**Files:**
- Modify: `mobile/src/screens/SettingsScreen.tsx`
- Create: `mobile/src/screens/__tests__/SettingsScreen.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Confirm the decision with the owner**

Ask which of the two options to take. Do not proceed until answered.

- [ ] **Step 2 (if removing): Write the failing test**

Create `mobile/src/screens/__tests__/SettingsScreen.test.tsx`:

```tsx
import { render, screen } from '@testing-library/react-native';
import SettingsScreen from '../SettingsScreen';

describe('SettingsScreen', () => {
  it('does not offer a clear-all-data control that does nothing', () => {
    render(<SettingsScreen />);
    expect(screen.queryByText('Clear All Data')).toBeNull();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm test -- SettingsScreen
```

Expected: FAIL — the control is present.

- [ ] **Step 4: Remove the control and its dialog**

Delete the `Clear All Data` `Button`, the `ConfirmDialog` it opens, and the now-unused
`showClearDialog` state from `mobile/src/screens/SettingsScreen.tsx`.

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm test -- SettingsScreen
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add mobile/src/screens/SettingsScreen.tsx mobile/src/screens/__tests__/SettingsScreen.test.tsx
git commit -m "Remove the Clear All Data control that deleted nothing"
```

---

### Task 8: Shared Zod schemas

This is where the shared package earns its keep. One schema consumed by both clients is what
would have caught the `user_profiles` NOT NULL drift that broke onboarding.

**Files:**
- Create: `packages/shared/src/schemas/foodEntry.ts`, `workout.ts`, `goal.ts`, `profile.ts`, `index.ts`
- Create: `packages/shared/src/schemas/__tests__/foodEntry.test.ts`
- Modify: `frontend/src/schemas/*.ts` (re-export only)

**Interfaces:**
- Consumes: types from Task 3.
- Produces: `foodEntrySchema`, `workoutSchema`, `goalSchema`, `profileSchema` from `@trackvibe/shared/schemas`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/schemas/__tests__/foodEntry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { foodEntrySchema } from '../foodEntry';

describe('foodEntrySchema', () => {
  it('accepts a valid entry', () => {
    const r = foodEntrySchema.safeParse({
      name: 'Chicken breast, cooked', calories: 165, protein: 31, carbs: 0, fats: 3.6,
      portionAmount: 100, portionUnit: 'g', mealType: 'breakfast', date: '2026-09-12',
    });
    expect(r.success).toBe(true);
  });

  it('rejects negative calories', () => {
    const r = foodEntrySchema.safeParse({
      name: 'X', calories: -1, protein: 0, carbs: 0, fats: 0,
      portionAmount: 100, portionUnit: 'g', mealType: 'breakfast', date: '2026-09-12',
    });
    expect(r.success).toBe(false);
  });

  it('rejects an unknown meal type', () => {
    const r = foodEntrySchema.safeParse({
      name: 'X', calories: 1, protein: 0, carbs: 0, fats: 0,
      portionAmount: 100, portionUnit: 'g', mealType: 'brunch', date: '2026-09-12',
    });
    expect(r.success).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/schemas/__tests__/foodEntry.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Port the schema from the web client**

Copy `frontend/src/schemas/foodEntry.ts` into `packages/shared/src/schemas/foodEntry.ts`
unchanged. It is already correct and already has web tests covering it — do not redesign it
while moving it.

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/schemas/__tests__/foodEntry.test.ts
```

Expected: PASS, 3 tests.

- [ ] **Step 5: Move the remaining schemas and create the barrel**

Move `workout.ts`, `goal.ts` and `profile.ts` the same way. Create
`packages/shared/src/schemas/index.ts`:

```ts
export * from './foodEntry';
export * from './workout';
export * from './goal';
export * from './profile';
```

- [ ] **Step 6: Re-point the web client**

Replace each file under `frontend/src/schemas/` with `export * from '@trackvibe/shared/schemas';`.

- [ ] **Step 7: Verify the web suite still passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx tsc --noEmit && npm run test -- --run
```

Expected: all 36 suites green, including the existing schema tests.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/schemas frontend/src/schemas
git commit -m "Move Zod schemas into the shared package"
```

---

### Task 9: Shared API transport with an injected token provider

The two clients authenticate differently and must keep doing so: web holds a bearer in memory
alongside an HTTP-only cookie; mobile holds one in `expo-secure-store`. Mobile's `getToken()`
is **async**, the web's is **sync**, so the provider type must accept both.

Mobile's model is the better one and must not be "corrected" toward the web's — a SecureStore
token survives a cold start, the web's in-memory token does not.

**Files:**
- Create: `packages/shared/src/api/transport.ts`, `packages/shared/src/api/index.ts`
- Create: `packages/shared/src/api/__tests__/transport.test.ts`
- Modify: `mobile/src/core/api/client.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `createTransport(config: TransportConfig): Transport` and the types `TokenProvider`, `TransportConfig`, `RequestOptions`, `Transport` from `@trackvibe/shared/api`.

- [ ] **Step 1: Write the failing test**

Create `packages/shared/src/api/__tests__/transport.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTransport } from '../transport';

describe('createTransport', () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it('prefixes the base url and attaches a bearer token from a sync provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => 'tok' });

    await request('/api/thing');

    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://api.test/api/thing');
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
  });

  it('awaits an async token provider', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const request = createTransport({ baseUrl: 'http://api.test', getToken: async () => 'async-tok' });

    await request('/api/thing');

    const [, init] = fetchSpy.mock.calls[0];
    expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer async-tok');
  });

  it('sends no Authorization header when there is no token', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => null });

    await request('/api/thing');

    const [, init] = fetchSpy.mock.calls[0];
    expect((init!.headers as Record<string, string>).Authorization).toBeUndefined();
  });

  it('calls onUnauthorized for a 401', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{}', { status: 401 }));
    const onUnauthorized = vi.fn();
    const request = createTransport({ baseUrl: 'http://api.test', getToken: () => 't', onUnauthorized });

    await expect(request('/api/thing')).rejects.toThrow();
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/api/__tests__/transport.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the transport**

Create `packages/shared/src/api/transport.ts`:

```ts
export type TokenProvider = () => string | null | Promise<string | null>;

export interface TransportConfig {
  baseUrl: string;
  getToken: TokenProvider;
  /** Called on a 401 so the client can clear auth state and redirect. */
  onUnauthorized?: () => void;
  /** Sent as X-Client-Platform, e.g. 'mobile'. */
  platform?: string;
  defaultTimeoutMs?: number;
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
  /** Web passes 'include' so the session cookie travels; mobile omits it. */
  credentials?: RequestCredentials;
}

export type Transport = <T>(path: string, options?: RequestOptions) => Promise<T>;

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

const DEFAULT_TIMEOUT_MS = 30000;

export function createTransport(config: TransportConfig): Transport {
  return async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {}, credentials } = options;
    const timeoutMs = options.timeoutMs ?? config.defaultTimeoutMs ?? DEFAULT_TIMEOUT_MS;

    const token = await config.getToken();
    const finalHeaders: Record<string, string> = { ...headers };
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
    if (config.platform) finalHeaders['X-Client-Platform'] = config.platform;
    if (body !== undefined) finalHeaders['Content-Type'] = 'application/json';

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${config.baseUrl}${path}`, {
        method,
        headers: finalHeaders,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
        ...(credentials ? { credentials } : {}),
      });

      if (res.status === 401) {
        config.onUnauthorized?.();
        throw new ApiError('Unauthorized', 401);
      }
      if (!res.ok) {
        throw new ApiError(`Request failed: ${res.status}`, res.status);
      }
      if (res.status === 204) return undefined as T;

      const contentType = res.headers.get('Content-Type') ?? '';
      if (!contentType.includes('application/json')) return undefined as T;
      return (await res.json()) as T;
    } finally {
      clearTimeout(timer);
    }
  };
}
```

- [ ] **Step 4: Create the api barrel**

Create `packages/shared/src/api/index.ts`:

```ts
export * from './transport';
```

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/api/__tests__/transport.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 6: Adopt it in the mobile client only**

Rewrite the body of `mobile/src/core/api/client.ts` to delegate, keeping every existing export
so no call site changes:

```ts
import { createTransport } from '@trackvibe/shared/api';
import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

const STORAGE_KEY = 'trackvibe_token';

function getApiBase(): string {
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  return extra?.apiUrl ?? process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
}

export function getApiBaseUrl(): string { return getApiBase(); }

export async function getToken(): Promise<string | null> {
  try { return await SecureStore.getItemAsync(STORAGE_KEY); } catch { return null; }
}

export async function setToken(token: string | null): Promise<void> {
  try {
    if (token == null) await SecureStore.deleteItemAsync(STORAGE_KEY);
    else await SecureStore.setItemAsync(STORAGE_KEY, token);
  } catch { /* ignore */ }
}

let onUnauthorizedCallback: (() => void) | null = null;
export function setOnUnauthorized(cb: (() => void) | null): void { onUnauthorizedCallback = cb; }
export function handleUnauthorized(): void { setToken(null); onUnauthorizedCallback?.(); }

export const request = createTransport({
  baseUrl: getApiBase(),
  getToken,
  onUnauthorized: handleUnauthorized,
  platform: 'mobile',
});
```

**The web client is deliberately left on its own client in this task.** Migrating it is a
separate, riskier change and Global Constraint 1 applies; it belongs in its own task once the
transport has proven itself on mobile.

- [ ] **Step 7: Verify mobile still works end to end**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npx tsc --noEmit && npm test
```

Then launch the simulator and confirm sign-in still succeeds and the dashboard loads.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/api mobile/src/core/api/client.ts
git commit -m "Add a shared API transport with an injected token provider"
```

---

### Task 10: Shared domain helpers

Two concrete duplications, both verified:

- `toLocalDateString` is defined or re-derived across `WorkoutFormScreen.tsx`,
  `hooks/useWorkouts.ts`, `hooks/useEnergy.ts` and `lib/dateRanges.ts` on mobile, and again on
  the web. Date handling is exactly where this codebase has already been bitten — the food
  entry off-by-one is an open bug — so it gets one definition.
- Meal inference exists **twice, differently**: `inferMealType()` in
  `FoodEntryFormScreen.tsx:22` takes no arguments and infers from the current clock, while
  `inferMeal(entry)` in `EnergyScreen.tsx:27` infers from an entry. The same entry can be
  bucketed differently in two screens.

**Files:**
- Create: `packages/shared/src/domain/dates.ts`, `meals.ts`, `index.ts`
- Create: `packages/shared/src/domain/__tests__/dates.test.ts`, `meals.test.ts`
- Modify: `mobile/src/lib/dateRanges.ts`, `mobile/src/screens/FoodEntryFormScreen.tsx`, `mobile/src/screens/EnergyScreen.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `toLocalDateString(d: Date): string`, `parseLocalDateString(s: string): Date`, `inferMealTypeFromHour(hour: number): MealType` from `@trackvibe/shared/domain`.

- [ ] **Step 1: Write the failing date test**

Create `packages/shared/src/domain/__tests__/dates.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { toLocalDateString, parseLocalDateString } from '../dates';

describe('toLocalDateString', () => {
  it('formats from local calendar parts, not UTC', () => {
    // 00:30 local on the 12th is still the 11th in UTC for any zone ahead of it.
    expect(toLocalDateString(new Date(2026, 8, 12, 0, 30))).toBe('2026-09-12');
  });

  it('zero-pads month and day', () => {
    expect(toLocalDateString(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('parseLocalDateString', () => {
  it('round trips with toLocalDateString', () => {
    expect(toLocalDateString(parseLocalDateString('2026-09-12'))).toBe('2026-09-12');
  });

  it('parses to local midnight, not UTC midnight', () => {
    const d = parseLocalDateString('2026-09-12');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8);
    expect(d.getDate()).toBe(12);
    expect(d.getHours()).toBe(0);
  });
});
```

The first and last assertions are the ones that matter — they are the class of bug already open
against `backend/src/models/foodEntry.ts:15`. Never use `toISOString().slice(0, 10)` here.

- [ ] **Step 2: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/domain/__tests__/dates.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement the date helpers**

Create `packages/shared/src/domain/dates.ts`:

```ts
const pad = (n: number) => String(n).padStart(2, '0');

/** Format a Date as YYYY-MM-DD using LOCAL calendar parts. */
export function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Parse YYYY-MM-DD to local midnight. `new Date('2026-09-12')` would give UTC midnight. */
export function parseLocalDateString(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
```

- [ ] **Step 4: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/domain/__tests__/dates.test.ts
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Write the failing meal test**

Create `packages/shared/src/domain/__tests__/meals.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { inferMealTypeFromHour } from '../meals';

describe('inferMealTypeFromHour', () => {
  it('buckets the day into four meals', () => {
    expect(inferMealTypeFromHour(8)).toBe('breakfast');
    expect(inferMealTypeFromHour(13)).toBe('lunch');
    expect(inferMealTypeFromHour(19)).toBe('dinner');
    expect(inferMealTypeFromHour(23)).toBe('snack');
  });

  it('is total over every valid hour', () => {
    for (let h = 0; h < 24; h++) {
      expect(['breakfast', 'lunch', 'dinner', 'snack']).toContain(inferMealTypeFromHour(h));
    }
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/domain/__tests__/meals.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 7: Implement one meal inference**

Read both existing implementations first — `FoodEntryFormScreen.tsx:22` and
`EnergyScreen.tsx:27` — and reconcile the boundaries with
`frontend/src/features/energy/`, which is the reference. Then create
`packages/shared/src/domain/meals.ts`:

```ts
import type { MealType } from '../types/index';

/** Single source of truth for time-of-day meal bucketing. Boundaries match the web client. */
export function inferMealTypeFromHour(hour: number): MealType {
  if (hour >= 5 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 22) return 'dinner';
  return 'snack';
}
```

If the web client's boundaries differ from these, **use the web client's** and update the test
to match — its users' historical data was bucketed by those boundaries.

- [ ] **Step 8: Extend the domain barrel**

`packages/shared/src/domain/index.ts` already exists from Task 6. Add the two new modules:

```ts
export * from './dates';
export * from './meals';
export * from './portion';
```

- [ ] **Step 9: Replace both mobile call sites**

- `mobile/src/lib/dateRanges.ts`: re-export the shared helpers instead of defining its own —
  `export { toLocalDateString, parseLocalDateString } from '@trackvibe/shared/domain';`
- `FoodEntryFormScreen.tsx`: delete local `inferMealType()`, call
  `inferMealTypeFromHour(new Date().getHours())`.
- `EnergyScreen.tsx`: delete local `inferMeal()`, call
  `inferMealTypeFromHour(parseLocalDateString(entry.date).getHours())` — or, if the entry
  carries a `startTime`, parse the hour from that. Read the existing implementation to see
  which field it used and preserve that behaviour.

- [ ] **Step 10: Verify**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npx tsc --noEmit && npm test
cd ../frontend && npm run test -- --run
```

Expected: all green. Then in the simulator, confirm food entries still land in the same meal
sections as before the change.

- [ ] **Step 11: Commit**

```bash
git add packages/shared/src/domain mobile/src/lib/dateRanges.ts mobile/src/screens/FoodEntryFormScreen.tsx mobile/src/screens/EnergyScreen.tsx
git commit -m "Move date and meal-inference helpers into the shared package"
```

---

### Task 11: Shared design tokens

`frontend/` is Tailwind/shadcn on a paper-warm palette with Fraunces + Inter and a named
elevation scale. `mobile/` is `react-native-paper` Material Design 3 with a hand-rolled hex
palette, system fonts, and no typography or shadow scale. They look like different products.

**Files:**
- Create: `packages/shared/src/tokens/colors.ts`, `typography.ts`, `spacing.ts`, `index.ts`
- Create: `packages/shared/src/tokens/__tests__/colors.test.ts`
- Modify: `mobile/src/theme.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `colors`, `typography`, `spacing`, `radii`, `elevation` from `@trackvibe/shared/tokens`.

- [ ] **Step 1: Read the current sources of truth**

Read `frontend/tailwind.config.js` (or the CSS custom properties it references) and
`mobile/src/theme.ts`. The web palette is the reference — it has been through an accessibility
pass (`agent-os/specs/2026-08-14-1300-palette-a11y-and-logging-speed`). Do not invent colours.

- [ ] **Step 2: Write the failing test**

Create `packages/shared/src/tokens/__tests__/colors.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { colors, radii } from '../index';

describe('design tokens', () => {
  it('exposes the semantic colour roles both clients need', () => {
    for (const role of ['background', 'surface', 'text', 'textMuted', 'primary', 'danger', 'border']) {
      expect(colors).toHaveProperty(role);
      expect(colors[role as keyof typeof colors]).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('orders the radius scale ascending', () => {
    const values = [radii.sm, radii.md, radii.lg, radii.xl];
    expect(values).toEqual([...values].sort((a, b) => a - b));
  });
});
```

The radius assertion exists because an earlier commit, `1f7ba25 "Put the radius scale in
order"`, fixed exactly this drifting out of order.

- [ ] **Step 3: Run it to verify it fails**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/tokens/__tests__/colors.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 4: Create the token modules**

Create `packages/shared/src/tokens/colors.ts` with the semantic roles above, transcribing the
hex values from the web palette. Create `typography.ts` (family, size and weight scales) and
`spacing.ts` (spacing, `radii`, `elevation`) the same way. Create `index.ts`:

```ts
export * from './colors';
export * from './typography';
export * from './spacing';
```

Values are plain numbers and hex strings — no platform-specific units, since Tailwind wants
rem/px strings and React Native wants unitless numbers. Each client adapts at its own edge.

- [ ] **Step 5: Run the test to verify it passes**

```bash
cd /Users/yoniripp/Documents/BeMe/frontend && npx vitest run ../packages/shared/src/tokens/__tests__/colors.test.ts
```

Expected: PASS, 2 tests.

- [ ] **Step 6: Point the mobile theme at the shared tokens**

Rewrite `mobile/src/theme.ts` to build its `react-native-paper` theme object from
`@trackvibe/shared/tokens` rather than its own hex literals. Keep the exported shape identical
so no screen changes.

**The web's Tailwind config is not migrated in this task** — that is a wider change to the live
client and belongs in its own task.

- [ ] **Step 7: Verify the app still renders**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npx tsc --noEmit && npm test
```

Launch the simulator and confirm the app renders with the web's palette rather than the old
Material Design 3 colours. Screenshot Home, Body and Energy.

- [ ] **Step 8: Commit**

```bash
git add packages/shared/src/tokens mobile/src/theme.ts
git commit -m "Move design tokens into the shared package and adopt them on mobile"
```

---

### Task 12: Drop the unused expo-linear-gradient dependency — ❌ WITHDRAWN, PREMISE FALSE

> **Do not attempt this task. The dependency is NOT unused; removing it crashes the app.**
>
> The premise below is wrong and is kept only so the reasoning is visible. It is true that
> nothing in `mobile/src` imports `expo-linear-gradient` — that was verified twice. But
> `react-native-gifted-charts` declares it as a **peer dependency** and imports it from
> `dist/Components/common/LinearGradient.js`. A peer dependency of a native module is
> invisible to a grep of application source.
>
> This was attempted on 2026-09-12. Every gate passed — 396 tests across three packages,
> three typechecks, the frontend production build, and a successful Metro bundle of 1745
> modules — and the app then failed at launch with:
>
> ```
> [runtime not ready]: Error: Gradient package was not found.
> Make sure "react-native-linear-gradient" or "expo-linear-gradient" is installed
> ```
>
> `legacy-peer-deps=true` in the root `.npmrc` is why npm gave no warning when a package
> satisfying a live peer requirement was removed — a cost that file documents explicitly.
>
> Reverted with `npx expo install expo-linear-gradient`. If this dependency is ever to be
> dropped, `react-native-gifted-charts` must be replaced or shown not to need a gradient
> backend first, and the check must be an app launch, not a grep.

~~`expo-linear-gradient` was pinned at `^55.0.8` — a version that does not exist for this SDK
line — and `npx expo install --fix` corrected it to `~15.0.8`. Nothing in `mobile/src` imports
it. Remove it rather than carrying a dependency nobody uses.~~

**Files:**
- Modify: `mobile/package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing.

- [ ] **Step 1: Confirm nothing imports it**

```bash
grep -rn "expo-linear-gradient\|LinearGradient" mobile/src mobile/App.tsx
```

Expected: no output. **If there is output, skip this task** and leave the dependency in place.

- [ ] **Step 2: Remove it**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npm uninstall expo-linear-gradient
```

- [ ] **Step 3: Verify the app still builds and runs**

```bash
cd /Users/yoniripp/Documents/BeMe/mobile && npx tsc --noEmit && npm test && npx expo start --host localhost --clear
```

Load it in the simulator and confirm the login screen renders.

- [ ] **Step 4: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "Drop the unused expo-linear-gradient dependency"
```

---

## Done criteria

Foundation is complete when all of the following hold:

1. `packages/shared` exists and is imported by `frontend` and `mobile`.
2. `frontend`'s 36 test suites pass unchanged.
3. `mobile` has a passing test suite covering all four bug fixes.
4. Domain types and Zod schemas have exactly one definition in the repo.
5. The Expo app launches, signs in and navigates on the simulator.

Sub-projects 2–8 (food, workouts, goals, health trackers, insights, voice, account) each get
their own spec and plan. Do not start them from this plan.

## Deferred from this sub-project

These were considered and consciously left out:

- **Migrating the web client onto the shared transport** (Task 9 does mobile only). Riskier, and
  the live client is covered by Global Constraint 1.
- **Migrating Tailwind onto the shared tokens** (Task 10 does mobile only). Same reason.
- **Rewriting the ~200 import sites** that still go through the local re-export shims from
  Tasks 3 and 8. Mechanical, and it would bury the reviewable diff.
- **Real-time voice streaming.** Needs a native module and a development build; belongs to the
  voice sub-project.
