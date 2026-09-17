import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as workoutController from './workout.js';
import * as workoutService from '../services/workout.js';
import { getEffectiveUserId } from '../middleware/auth.js';

vi.mock('../config/index.js', () => ({
  config: { jwtSecret: 'test', mcpSecret: null, mcpUserId: null },
}));
vi.mock('../services/workout.js');
vi.mock('../middleware/auth.js');
// The real route schemas are used here — they are pure Zod with no side effects,
// and stubbing them would hide the query parsing this controller depends on.

describe('workout controller', () => {
  let req;
  let res;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { user: { id: 'user-1' }, params: {}, body: {} };
    res = {
      json: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn(),
    };
    getEffectiveUserId.mockReturnValue('user-1');
  });

  describe('list', () => {
    it('returns workouts for user', async () => {
      const workouts = [
        {
          id: '1',
          date: '2025-01-15',
          title: 'Chest Day',
          type: 'strength',
          durationMinutes: 45,
          exercises: [{ name: 'Bench', sets: 3, reps: 10 }],
        },
      ];
      workoutService.list.mockResolvedValue({ data: workouts, total: 1 });

      req.query = {};
      await workoutController.list(req, res);

      // No date params supplied: the window is empty on both ends, which is the
      // unfiltered list this endpoint has always returned.
      expect(workoutService.list).toHaveBeenCalledWith(
        'user-1',
        { limit: 50, offset: 0 },
        { startDate: undefined, endDate: undefined },
      );
      expect(res.json).toHaveBeenCalledWith({
        data: workouts,
        total: 1,
        limit: 50,
        offset: 0,
        hasMore: false,
      });
    });
  });

  describe('add', () => {
    it('creates workout with exercises including repsPerSet', async () => {
      const body = {
        title: 'Leg Day',
        type: 'strength',
        durationMinutes: 60,
        exercises: [
          {
            name: 'Squat',
            sets: 3,
            reps: 10,
            repsPerSet: [10, 8, 6],
            weight: 100,
          },
        ],
      };
      req.body = body;
      const created = { id: '2', ...body };
      workoutService.create.mockResolvedValue(created);

      await workoutController.add(req, res);

      expect(workoutService.create).toHaveBeenCalledWith('user-1', body);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(created);
    });
  });

  describe('update', () => {
    it('updates workout with exercises', async () => {
      req.params.id = 'workout-1';
      req.body = {
        title: 'Updated Workout',
        durationMinutes: 50,
        exercises: [
          {
            name: 'Deadlift',
            sets: 4,
            reps: 5,
            repsPerSet: [5, 5, 5, 5],
            weight: 150,
          },
        ],
      };
      const updated = { id: 'workout-1', ...req.body };
      workoutService.update.mockResolvedValue(updated);

      await workoutController.update(req, res);

      expect(workoutService.update).toHaveBeenCalledWith('user-1', 'workout-1', req.body);
      expect(res.json).toHaveBeenCalledWith(updated);
    });
  });
});
