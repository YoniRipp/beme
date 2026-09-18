import { workoutsApi } from '../workouts';

const mockRequest = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

describe('workoutsApi.listAll', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ data: [], total: 0, limit: 200, offset: 0, hasMore: false });
  });

  it('pages until hasMore is false', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: new Array(200).fill({ id: 'x' }), total: 250, limit: 200, offset: 0, hasMore: true })
      .mockResolvedValueOnce({ data: new Array(50).fill({ id: 'y' }), total: 250, limit: 200, offset: 200, hasMore: false });

    const all = await workoutsApi.listAll();

    expect(all.items).toHaveLength(250);
    expect(all.truncated).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('returns a single page unchanged when hasMore is false', async () => {
    mockRequest.mockResolvedValueOnce({ data: [{ id: 'a' }], total: 1, limit: 200, offset: 0, hasMore: false });

    const all = await workoutsApi.listAll();

    expect(all.items).toEqual([{ id: 'a' }]);
    expect(all.truncated).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  /**
   * The bug this pair exists for: the pager stops at MAX_PAGES x PAGE_LIMIT and reports it,
   * and `listAll` used to `return result.data`, so a clipped history reached the screens
   * indistinguishable from a complete one.
   */
  it('reports truncation when the pager stops before the end of the history', async () => {
    // `total` far beyond the pager's ceiling: it reads its maximum and still has more to go.
    mockRequest.mockResolvedValue({
      data: new Array(200).fill({ id: 'x' }),
      total: 1_000_000,
      limit: 200,
      offset: 0,
      hasMore: true,
    });

    const all = await workoutsApi.listAll();

    expect(all.truncated).toBe(true);
    expect(all.items).toHaveLength(5000); // PAGE_LIMIT * MAX_PAGES
  });
});
