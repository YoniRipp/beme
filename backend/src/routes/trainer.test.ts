import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../middleware/auth.js', () => ({
  requireAuth: (req, _res, next) => {
    req.user = { id: 'trainer-1', email: 'trainer@example.com', role: 'trainer' };
    next();
  },
  requireTrainer: (_req, _res, next) => next(),
  resolveTrainerClientUserId: (req, _res, next) => {
    req.effectiveUserId = req.params.clientId;
    next();
  },
  getEffectiveUserId: (req) => req.effectiveUserId ?? req.user.id,
}));

vi.mock('../schemas/routeSchemas.js', () => {
  const { z } = require('zod');
  const passthrough = z.object({}).passthrough();
  return {
    paginationSchema: z.object({
      limit: z.coerce.number().optional().default(50),
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

vi.mock('../services/trainer.js', () => ({
  listClients: vi.fn().mockResolvedValue([]),
  inviteByEmail: vi.fn(),
  generateInviteCode: vi.fn(),
  acceptInvitation: vi.fn(),
  removeClient: vi.fn(),
  listInvitations: vi.fn().mockResolvedValue([]),
  getMyTrainer: vi.fn(),
  getPendingInvitations: vi.fn().mockResolvedValue([]),
}));

vi.mock('../services/workout.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../services/foodEntry.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../services/dailyCheckIn.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../services/goal.js', () => ({
  list: vi.fn().mockResolvedValue({ data: [], total: 0 }),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('../models/water.js', () => ({
  findByUserId: vi.fn().mockResolvedValue([]),
}));

const mockGetTrainerAnalytics = vi.fn();
vi.mock('../models/trainerAnalytics.js', () => ({
  getTrainerAnalytics: (...args) => mockGetTrainerAnalytics(...args),
}));

import trainerRouter from './trainer.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(trainerRouter);
  return app;
}

describe('trainer routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns trainer analytics for the requested range', async () => {
    mockGetTrainerAnalytics.mockResolvedValueOnce({
      range: '3m',
      summary: { totalTrainees: 1, newTrainees: 0, engagedPercent: 100, atRiskCount: 0 },
      engagementSeries: [],
      growthSeries: [],
      subscriptionAgeBuckets: [],
      progress: {
        weightDeltaAvg: null,
        calorieAverage: null,
        calorieTrendPercent: null,
        volumeTotal: 0,
        volumeTrendPercent: null,
        volumeKind: 'set_reps',
        series: [],
      },
      roster: [],
    });

    const res = await request(createApp()).get('/api/trainer/analytics?range=3m').expect(200);

    expect(mockGetTrainerAnalytics).toHaveBeenCalledWith('trainer-1', '3m');
    expect(res.body.summary.totalTrainees).toBe(1);
  });

  it('falls back to 30d for unknown ranges', async () => {
    mockGetTrainerAnalytics.mockResolvedValueOnce({
      range: '30d',
      summary: { totalTrainees: 0, newTrainees: 0, engagedPercent: 0, atRiskCount: 0 },
      engagementSeries: [],
      growthSeries: [],
      subscriptionAgeBuckets: [],
      progress: {
        weightDeltaAvg: null,
        calorieAverage: null,
        calorieTrendPercent: null,
        volumeTotal: 0,
        volumeTrendPercent: null,
        volumeKind: 'set_reps',
        series: [],
      },
      roster: [],
    });

    await request(createApp()).get('/api/trainer/analytics?range=forever').expect(200);

    expect(mockGetTrainerAnalytics).toHaveBeenCalledWith('trainer-1', '30d');
  });
});
