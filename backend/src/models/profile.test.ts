import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const mockQuery = vi.fn();

vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

import { upsert } from './profile.js';

/** Column names listed in the `INSERT INTO user_profiles (...)` clause. */
function insertedColumns(sql: string): string[] {
  const list = /INSERT INTO user_profiles \(([^)]*)\)/.exec(sql)?.[1];
  if (!list) throw new Error(`no INSERT column list in:\n${sql}`);
  return list.split(',').map((c) => c.trim());
}

/** Column names assigned in the `ON CONFLICT ... DO UPDATE SET` clause. */
function updatedColumns(sql: string): string[] {
  const body = /DO UPDATE SET([\s\S]*?)RETURNING/.exec(sql)?.[1];
  if (!body) throw new Error(`no DO UPDATE SET clause in:\n${sql}`);
  return [...body.matchAll(/(\w+)\s*=/g)].map((m) => m[1]);
}

const ROW = { id: 'p1', water_goal_glasses: 8, cycle_tracking_enabled: false, setup_completed: true };

describe('profile model', () => {
  beforeEach(() => {
    mockQuery.mockReset().mockResolvedValue({ rows: [ROW] });
  });

  describe('upsert', () => {
    // A brand-new user has no user_profiles row, so onboarding takes the INSERT branch with
    // whatever partial body the client sent. Binding every unset column as an explicit NULL
    // bypasses the column DEFAULT, and on a migration-built database water_goal_glasses,
    // cycle_tracking_enabled and setup_completed are NOT NULL -- so the insert dies with
    // 23502 and onboarding 500s. Unset columns must be left out of the statement entirely.
    it('omits unprovided columns from the INSERT so their column DEFAULT applies', async () => {
      await upsert({ userId: 'u1', setupCompleted: true });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(insertedColumns(sql)).toEqual(['user_id', 'setup_completed']);
      expect(params).toEqual(['u1', true]);
    });

    it('never binds an explicit NULL when a field is omitted', async () => {
      await upsert({ userId: 'u1', sex: 'female', heightCm: 170 });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(params).not.toContain(null);
      expect(insertedColumns(sql)).toEqual(['user_id', 'sex', 'height_cm']);
    });

    // The API treats an explicit null the same as an omitted field: "leave this alone".
    it('treats an explicit null as unprovided', async () => {
      await upsert({ userId: 'u1', setupCompleted: true, sex: null as unknown as undefined });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(insertedColumns(sql)).toEqual(['user_id', 'setup_completed']);
      expect(params).toEqual(['u1', true]);
    });

    // Only userId: the row still has to be created, and DO UPDATE SET must not be empty.
    it('inserts a defaults-only row when no optional field is provided', async () => {
      await upsert({ userId: 'u1' });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(insertedColumns(sql)).toEqual(['user_id']);
      expect(params).toEqual(['u1']);
      expect(updatedColumns(sql)).toEqual(['updated_at']);
    });

    it('writes provided values and leaves the rest of an existing row untouched', async () => {
      await upsert({ userId: 'u1', waterGoalGlasses: 10, cycleTrackingEnabled: true });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(insertedColumns(sql)).toEqual(['user_id', 'water_goal_glasses', 'cycle_tracking_enabled']);
      expect(updatedColumns(sql)).toEqual(['water_goal_glasses', 'cycle_tracking_enabled', 'updated_at']);
      expect(params).toEqual(['u1', 10, true]);
    });

    it('keeps falsy values, which are real updates rather than omissions', async () => {
      await upsert({ userId: 'u1', setupCompleted: false, waterGoalGlasses: 0 });

      const [sql, params] = mockQuery.mock.calls[0];
      expect(insertedColumns(sql)).toEqual(['user_id', 'water_goal_glasses', 'setup_completed']);
      expect(params).toEqual(['u1', 0, false]);
    });

    // Every field routes through a hand-written field -> column map. A typo there compiles,
    // typechecks and only fails when a user happens to save that field, as a 42703 from
    // Postgres. Sending all of them at once puts every mapping on a tested path, and
    // RETURNING is the independent list of what the table actually has.
    it('maps every input field to a column the table has', async () => {
      await upsert({
        userId: 'u1',
        dateOfBirth: '1994-08-17',
        sex: 'female',
        heightCm: 170,
        currentWeight: 65,
        targetWeight: 60,
        activityLevel: 'moderate',
        waterGoalGlasses: 8,
        cycleTrackingEnabled: true,
        averageCycleLength: 28,
        setupCompleted: true,
        macroCarbs: 200,
        macroFat: 60,
        macroProtein: 150,
      });

      const [sql, params] = mockQuery.mock.calls[0];
      const selectable = /const RETURNING = '([^']*)'/
        .exec(readFileSync(new URL('./profile.ts', import.meta.url), 'utf8'))?.[1]
        .split(',')
        .map((c) => c.trim());

      const inserted = insertedColumns(sql);
      expect(inserted).toEqual([
        'user_id',
        'date_of_birth',
        'sex',
        'height_cm',
        'current_weight',
        'target_weight',
        'activity_level',
        'water_goal_glasses',
        'cycle_tracking_enabled',
        'average_cycle_length',
        'setup_completed',
        'macro_carbs',
        'macro_fat',
        'macro_protein',
      ]);
      // user_id is written but never selected back, so it is the one legitimate exception.
      expect(selectable).toEqual(expect.arrayContaining(inserted.filter((c) => c !== 'user_id')));
      expect(params).toHaveLength(inserted.length);
    });
  });
});
