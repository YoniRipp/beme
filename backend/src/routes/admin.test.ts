import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req, res, next) => {
    req.user = { id: 'admin-1', email: 'admin@test.com', role: 'admin' };
    next();
  },
  requireAdmin: (req, res, next) => next(),
}));

const mockListActivity = vi.fn();
vi.mock('../models/userActivityLog.js', () => ({
  listActivity: (...args) => mockListActivity(...args),
}));

const mockPoolQuery = vi.fn();
vi.mock('../db/index.js', () => ({
  getPool: () => ({ query: mockPoolQuery }),
}));

vi.mock('../services/appLog.js', () => ({
  listLogs: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/adminStats.js', () => ({
  getAll: vi.fn().mockResolvedValue({}),
}));

vi.mock('../services/workout.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/foodEntry.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../services/dailyCheckIn.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
}));

vi.mock('../services/goal.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn().mockResolvedValue({}),
  update: vi.fn().mockResolvedValue({}),
  remove: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../schemas/routeSchemas.js', () => {
  const { z } = require('zod');
  const passthrough = z.object({}).passthrough();
  return {
    paginationSchema: z.object({
      limit: z.coerce.number().optional().default(20),
      offset: z.coerce.number().optional().default(0),
    }),
    createWorkoutSchema: passthrough,
    updateWorkoutSchema: passthrough,
    createFoodEntrySchema: passthrough,
    updateFoodEntrySchema: passthrough,
    createCheckInSchema: passthrough,
    updateCheckInSchema: passthrough,
    createGoalSchema: passthrough,
    updateGoalSchema: passthrough,
  };
});

import adminRouter from './admin.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(adminRouter);
  return app;
}

describe('admin routes', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = createApp();
  });

  describe('GET /api/admin/activity', () => {
    it('returns 400 when from is missing', async () => {
      const res = await request(app)
        .get('/api/admin/activity')
        .query({ to: '2025-02-24T00:00:00.000Z' })
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(res.body.error).toBe('from and to (ISO UTC) are required');
      expect(mockListActivity).not.toHaveBeenCalled();
    });

    it('returns 400 when to is missing', async () => {
      const res = await request(app)
        .get('/api/admin/activity')
        .query({ from: '2025-02-23T00:00:00.000Z' })
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(res.body.error).toBe('from and to (ISO UTC) are required');
      expect(mockListActivity).not.toHaveBeenCalled();
    });

    it('returns 400 when listActivity throws validation error', async () => {
      mockListActivity.mockRejectedValueOnce(new Error('Time range cannot exceed 90 days'));

      const res = await request(app)
        .get('/api/admin/activity')
        .query({
          from: '2025-01-01T00:00:00.000Z',
          to: '2025-04-10T00:00:00.000Z',
        })
        .set('Authorization', 'Bearer test-token')
        .expect(400);

      expect(res.body.error).toBe('Time range cannot exceed 90 days');
    });

    it('returns 200 with events and nextCursor when valid from/to', async () => {
      const mockEvents = [
        {
          id: 'ev-1',
          eventType: 'auth.Login',
          eventId: 'evid-1',
          summary: 'User logged in',
          payload: null,
          createdAt: '2025-02-24T12:00:00.000Z',
          userId: 'u1',
          userEmail: 'u1@test.com',
          userName: 'User One',
        },
      ];
      mockListActivity.mockResolvedValueOnce({ events: mockEvents, nextCursor: 'cursor-abc' });

      const res = await request(app)
        .get('/api/admin/activity')
        .query({
          from: '2025-02-23T00:00:00.000Z',
          to: '2025-02-24T23:59:59.999Z',
        })
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body.events).toEqual(mockEvents);
      expect(res.body.nextCursor).toBe('cursor-abc');
      expect(mockListActivity).toHaveBeenCalledWith({
        limit: undefined,
        before: undefined,
        from: '2025-02-23T00:00:00.000Z',
        to: '2025-02-24T23:59:59.999Z',
        userId: undefined,
        eventType: undefined,
      });
    });

    it('passes limit, before, userId, eventType to listActivity', async () => {
      mockListActivity.mockResolvedValueOnce({ events: [], nextCursor: undefined });

      await request(app)
        .get('/api/admin/activity')
        .query({
          from: '2025-02-23T00:00:00.000Z',
          to: '2025-02-24T23:59:59.999Z',
          limit: '25',
          before: 'abc123',
          userId: 'user-456',
          eventType: 'money.',
        })
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(mockListActivity).toHaveBeenCalledWith({
        limit: 25,
        before: 'abc123',
        from: '2025-02-23T00:00:00.000Z',
        to: '2025-02-24T23:59:59.999Z',
        userId: 'user-456',
        eventType: 'money.',
      });
    });
  });

  describe('GET /api/admin/users/search', () => {
    it('returns empty array when q is missing', async () => {
      const res = await request(app)
        .get('/api/admin/users/search')
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body).toEqual([]);
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it('returns empty array when q is empty string', async () => {
      const res = await request(app)
        .get('/api/admin/users/search')
        .query({ q: '' })
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body).toEqual([]);
      expect(mockPoolQuery).not.toHaveBeenCalled();
    });

    it('returns user array when q is provided', async () => {
      const rows = [
        {
          id: 'u1',
          email: 'user@example.com',
          name: 'Test User',
          role: 'user',
          created_at: '2025-01-01T00:00:00.000Z',
        },
      ];
      mockPoolQuery.mockResolvedValueOnce({ rows });

      const res = await request(app)
        .get('/api/admin/users/search')
        .query({ q: 'test' })
        .set('Authorization', 'Bearer test-token')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0]).toMatchObject({
        id: 'u1',
        email: 'user@example.com',
        name: 'Test User',
        role: 'user',
        createdAt: '2025-01-01T00:00:00.000Z',
      });
      expect(mockPoolQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, email, name, role, created_at FROM users'),
        ['%test%', 20]
      );
    });
  });
});
