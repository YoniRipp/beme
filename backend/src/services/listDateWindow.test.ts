/**
 * The service glue between the HTTP window and the model's positional bounds.
 *
 * The two layers deliberately disagree in shape: the models take
 * `(userId, startDate, endDate, pagination, client)` — the order weight, water
 * and cycle already use — while the services take the window as a trailing
 * object so the callers that predate it (admin routes, chat agent) keep working
 * unchanged. That translation is exactly where a silent transposition of the two
 * bounds would live, and a swapped pair returns an empty list rather than an
 * error, so it is asserted here explicitly.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../models/foodEntry.js', () => ({ findByUserId: vi.fn() }));
vi.mock('../models/workout.js', () => ({ findByUserId: vi.fn() }));
vi.mock('../models/dailyCheckIn.js', () => ({ findByUserId: vi.fn() }));
vi.mock('../events/publish.js', () => ({ publishEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./embeddings.js', () => ({
  buildEmbeddingText: vi.fn(() => 'embedding'),
  deleteEmbedding: vi.fn(),
  upsertEmbedding: vi.fn(),
  upsertEmbeddingsBatch: vi.fn(),
}));
vi.mock('../db/pool.js', () => ({ getPool: vi.fn(() => ({ connect: vi.fn() })) }));

import * as foodEntryModel from '../models/foodEntry.js';
import * as workoutModel from '../models/workout.js';
import * as dailyCheckInModel from '../models/dailyCheckIn.js';
import * as foodEntryService from './foodEntry.js';
import * as workoutService from './workout.js';
import * as dailyCheckInService from './dailyCheckIn.js';

const SERVICES = [
  { name: 'foodEntryService', service: foodEntryService, model: foodEntryModel },
  { name: 'workoutService', service: workoutService, model: workoutModel },
  { name: 'dailyCheckInService', service: dailyCheckInService, model: dailyCheckInModel },
];

describe.each(SERVICES)('$name.list', ({ service, model }) => {
  beforeEach(() => {
    vi.clearAllMocks();
    model.findByUserId.mockResolvedValue({ data: [], total: 0 });
  });

  it('hands the bounds to the model in (startDate, endDate, pagination) order', async () => {
    await service.list('user-1', { limit: 25, offset: 50 }, { startDate: '2026-09-01', endDate: '2026-09-30' });

    expect(model.findByUserId).toHaveBeenCalledWith('user-1', '2026-09-01', '2026-09-30', { limit: 25, offset: 50 });
  });

  it('leaves the other bound undefined when only one is given', async () => {
    await service.list('user-1', { limit: 50, offset: 0 }, { endDate: '2026-09-30' });

    expect(model.findByUserId).toHaveBeenCalledWith('user-1', undefined, '2026-09-30', { limit: 50, offset: 0 });
  });

  it('keeps the pre-existing two-argument call unfiltered', async () => {
    // What admin routes and the chat agent still call. No window, same query.
    await service.list('user-1', { limit: 50, offset: 0 });

    expect(model.findByUserId).toHaveBeenCalledWith('user-1', undefined, undefined, { limit: 50, offset: 0 });
  });
});
