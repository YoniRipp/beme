import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockQuery = vi.fn();

vi.mock('../db/pool.js', () => ({
  getPool: () => ({ query: mockQuery }),
}));

import { getTrainerAnalytics } from './trainerAnalytics.js';

describe('trainer analytics model', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-03T12:00:00.000Z'));
  });

  it('classifies clients and aggregates engagement/progress for the selected range', async () => {
    mockQuery
      .mockResolvedValueOnce({
        rows: [
          {
            id: 'rel-new',
            client_id: '00000000-0000-0000-0000-000000000001',
            client_name: 'New Client',
            client_email: 'new@example.com',
            created_at: new Date('2026-04-25T00:00:00.000Z'),
          },
          {
            id: 'rel-good',
            client_id: '00000000-0000-0000-0000-000000000002',
            client_name: 'Good Client',
            client_email: 'good@example.com',
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
          {
            id: 'rel-risk',
            client_id: '00000000-0000-0000-0000-000000000003',
            client_name: 'Quiet Client',
            client_email: 'quiet@example.com',
            created_at: new Date('2026-01-01T00:00:00.000Z'),
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-04-07' },
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-04-15' },
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-04-23' },
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-05-01' },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-04-15', calories: 2000 },
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-04-16', calories: 2200 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-03-20', calories: 1800 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-04-08', weight: 82 },
          { user_id: '00000000-0000-0000-0000-000000000002', date: '2026-05-01', weight: 80.5 },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: '00000000-0000-0000-0000-000000000002',
            date: '2026-04-20',
            exercises: [{ name: 'Bench', sets: 3, reps: 10, weight: 50 }],
          },
        ],
      })
      .mockResolvedValueOnce({
        rows: [
          {
            user_id: '00000000-0000-0000-0000-000000000002',
            date: '2026-03-20',
            exercises: [{ name: 'Bench', sets: 3, reps: 10, weight: 40 }],
          },
        ],
      });

    const analytics = await getTrainerAnalytics('trainer-1', '30d');

    expect(analytics.summary).toEqual({
      totalTrainees: 3,
      newTrainees: 1,
      engagedPercent: 33,
      atRiskCount: 1,
    });
    expect(analytics.roster.map((client) => [client.clientName, client.status])).toEqual([
      ['New Client', 'new'],
      ['Good Client', 'good'],
      ['Quiet Client', 'at_risk'],
    ]);
    expect(analytics.progress.weightDeltaAvg).toBe(-1.5);
    expect(analytics.progress.calorieAverage).toBe(2100);
    expect(analytics.progress.calorieTrendPercent).toBe(17);
    expect(analytics.progress.volumeTotal).toBe(1500);
    expect(analytics.progress.volumeTrendPercent).toBe(25);
    expect(analytics.progress.volumeKind).toBe('weighted');
    expect(analytics.engagementSeries.some((point) => point.activeTrainees > 0)).toBe(true);
  });
});
