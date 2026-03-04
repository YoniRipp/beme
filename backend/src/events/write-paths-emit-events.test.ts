/**
 * Plan 3: Per-context integration — create (or update) via service emits correct event.
 * Each context has one test; event bus test helpers (subscribe + in-memory transport) are used.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../config/index.js', () => ({ config: { isRedisConfigured: false } }));
vi.mock('../models/workout.js', () => ({ create: vi.fn(), update: vi.fn(), deleteById: vi.fn(), findByUserId: vi.fn() }));
vi.mock('../models/foodEntry.js', () => ({ create: vi.fn(), update: vi.fn(), deleteById: vi.fn(), findByUserId: vi.fn() }));
vi.mock('../models/dailyCheckIn.js', () => ({ create: vi.fn(), update: vi.fn(), deleteById: vi.fn(), findByUserId: vi.fn() }));
vi.mock('../models/goal.js', () => ({ create: vi.fn(), update: vi.fn(), deleteById: vi.fn(), findByUserId: vi.fn() }));

import { subscribe } from './bus.js';
import * as workoutService from '../services/workout.js';
import * as workoutModel from '../models/workout.js';
import * as foodEntryService from '../services/foodEntry.js';
import * as foodEntryModel from '../models/foodEntry.js';
import * as dailyCheckInService from '../services/dailyCheckIn.js';
import * as dailyCheckInModel from '../models/dailyCheckIn.js';
import * as goalService from '../services/goal.js';
import * as goalModel from '../models/goal.js';

describe('write paths emit events (per context)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('body: create emits body.WorkoutCreated', async () => {
    const workout = { id: 'w1', title: 'Run', date: '2025-02-24', type: 'cardio', durationMinutes: 30 };
    workoutModel.create.mockResolvedValue(workout);
    const received = [];
    subscribe('body.WorkoutCreated', (e) => received.push(e));

    await workoutService.create('user-1', { title: 'Run', type: 'cardio', durationMinutes: 30 });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('body.WorkoutCreated');
    expect(received[0].payload.title).toBe('Run');
  });

  it('energy: food entry create emits energy.FoodEntryCreated', async () => {
    const entry = { id: 'f1', name: 'Apple', date: '2025-02-24', calories: 50 };
    foodEntryModel.create.mockResolvedValue(entry);
    const received = [];
    subscribe('energy.FoodEntryCreated', (e) => received.push(e));

    await foodEntryService.create('user-1', { name: 'Apple', calories: 50 });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('energy.FoodEntryCreated');
    expect(received[0].payload.name).toBe('Apple');
  });

  it('energy: check-in create emits energy.CheckInCreated', async () => {
    const checkIn = { id: 'c1', date: '2025-02-24', sleepHours: 7 };
    dailyCheckInModel.create.mockResolvedValue(checkIn);
    const received = [];
    subscribe('energy.CheckInCreated', (e) => received.push(e));

    await dailyCheckInService.create('user-1', { date: '2025-02-24', sleepHours: 7 });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('energy.CheckInCreated');
    expect(received[0].payload.sleepHours).toBe(7);
  });

  it('goals: create emits goals.GoalCreated', async () => {
    const goal = { id: 'g1', type: 'calories', target: 2000, period: 'daily' };
    goalModel.create.mockResolvedValue(goal);
    const received = [];
    subscribe('goals.GoalCreated', (e) => received.push(e));

    await goalService.create('user-1', { type: 'calories', target: 2000, period: 'daily' });

    expect(received).toHaveLength(1);
    expect(received[0].type).toBe('goals.GoalCreated');
    expect(received[0].payload.type).toBe('calories');
  });
});
