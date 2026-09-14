import { cycleApi, profileApi, streakApi, waterApi, weightApi } from '../health';

const mockRequest = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

/**
 * Wiring coverage for the health slice, in the shape `food.test.ts` and `workouts.test.ts`
 * already use: what path each client hits, and which parameters actually reach the query
 * string. The parameters are the point — this client exists partly to stop copying the web's
 * unbounded weight read, and a bound that silently fails to serialise is the same as no
 * bound at all.
 */
beforeEach(() => {
  mockRequest.mockReset();
  mockRequest.mockResolvedValue(undefined);
});

describe('weightApi', () => {
  it('sends the row bound so the read cannot grow with the user’s history', async () => {
    await weightApi.list({ limit: 30, offset: 0 });
    expect(mockRequest).toHaveBeenCalledWith('/api/weight-entries?limit=30&offset=0');
  });

  it('supports a date window as well as a row bound', async () => {
    await weightApi.list({ startDate: '2026-01-01', endDate: '2026-03-01' });
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/weight-entries?startDate=2026-01-01&endDate=2026-03-01'
    );
  });

  /**
   * `parseOptionalPagination` returns undefined only when NEITHER limit nor offset is
   * present (`backend/src/utils/pagination.ts:12`). An `offset=undefined` serialised as the
   * literal string "undefined" would parse to 0 and silently apply a default LIMIT of 50 —
   * a bound nobody asked for. Absent parameters must stay absent.
   */
  it('omits absent parameters instead of serialising "undefined"', async () => {
    await weightApi.list({});
    expect(mockRequest).toHaveBeenCalledWith('/api/weight-entries');
  });

  it('posts, patches and deletes against the same collection', async () => {
    await weightApi.add({ date: '2026-09-14', weight: 82.4 });
    expect(mockRequest).toHaveBeenCalledWith('/api/weight-entries', {
      method: 'POST',
      body: { date: '2026-09-14', weight: 82.4 },
    });

    await weightApi.update('w1', { weight: 82 });
    expect(mockRequest).toHaveBeenCalledWith('/api/weight-entries/w1', {
      method: 'PATCH',
      body: { weight: 82 },
    });

    await weightApi.delete('w1');
    expect(mockRequest).toHaveBeenCalledWith('/api/weight-entries/w1', { method: 'DELETE' });
  });
});

describe('waterApi', () => {
  /**
   * The server's own default is `new Date().toISOString().split('T')[0]`
   * (`backend/src/controllers/water.ts:13`) — a UTC day, which is yesterday for the first
   * hours of the morning anywhere ahead of UTC. The client must send its LOCAL day.
   */
  it('passes the caller’s date rather than letting the server pick a UTC one', async () => {
    await waterApi.getToday('2026-09-14');
    expect(mockRequest).toHaveBeenCalledWith('/api/water-entries?date=2026-09-14');
  });

  it('hits the collection bare when no date is given', async () => {
    await waterApi.getToday();
    expect(mockRequest).toHaveBeenCalledWith('/api/water-entries');
  });

  it('uses the dedicated glass endpoints rather than reading-then-writing a count', async () => {
    await waterApi.addGlass('2026-09-14');
    expect(mockRequest).toHaveBeenCalledWith('/api/water-entries/add-glass', {
      method: 'POST',
      body: { date: '2026-09-14' },
    });

    await waterApi.removeGlass('2026-09-14');
    expect(mockRequest).toHaveBeenCalledWith('/api/water-entries/remove-glass', {
      method: 'POST',
      body: { date: '2026-09-14' },
    });
  });

  it('sets the whole count in one PUT', async () => {
    await waterApi.upsert({ date: '2026-09-14', glasses: 5 });
    expect(mockRequest).toHaveBeenCalledWith('/api/water-entries', {
      method: 'PUT',
      body: { date: '2026-09-14', glasses: 5 },
    });
  });
});

describe('cycleApi', () => {
  it('windows the list, which is the only bound this endpoint offers', async () => {
    await cycleApi.list('2026-03-18', '2026-09-14');
    expect(mockRequest).toHaveBeenCalledWith(
      '/api/cycle-entries?startDate=2026-03-18&endDate=2026-09-14'
    );
  });

  it('posts a period start', async () => {
    await cycleApi.add({ date: '2026-09-14', periodStart: true, flow: 'medium' });
    expect(mockRequest).toHaveBeenCalledWith('/api/cycle-entries', {
      method: 'POST',
      body: { date: '2026-09-14', periodStart: true, flow: 'medium' },
    });
  });
});

describe('streakApi', () => {
  it('reads every streak in one request — five rows, so no window is needed', async () => {
    await streakApi.list();
    expect(mockRequest).toHaveBeenCalledWith('/api/streaks');
  });
});

describe('profileApi', () => {
  it('still reads and upserts the single profile row', async () => {
    await profileApi.get();
    expect(mockRequest).toHaveBeenCalledWith('/api/profile');

    await profileApi.upsert({ targetWeight: 78 });
    expect(mockRequest).toHaveBeenCalledWith('/api/profile', {
      method: 'PUT',
      body: { targetWeight: 78 },
    });
  });
});
