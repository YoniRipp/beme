import { foodApi, dailyCheckInsApi } from '../food';

const mockRequest = jest.fn();
jest.mock('../client', () => ({
  request: (...args: unknown[]) => mockRequest(...args),
}));

describe('foodApi.list', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ data: [], total: 0, limit: 200, offset: 0, hasMore: false });
  });

  it('sends an explicit limit and offset', async () => {
    await foodApi.list({ limit: 200, offset: 0 });
    expect(mockRequest).toHaveBeenCalledWith('/api/food-entries?limit=200&offset=0');
  });

  it('pages until hasMore is false', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: new Array(200).fill({ id: 'x' }), total: 250, limit: 200, offset: 0, hasMore: true })
      .mockResolvedValueOnce({ data: new Array(50).fill({ id: 'y' }), total: 250, limit: 200, offset: 200, hasMore: false });

    const all = await foodApi.listAll();

    expect(all.items).toHaveLength(250);
    expect(all.truncated).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('reports truncation when the pager stops before the end of the history', async () => {
    mockRequest.mockResolvedValue({
      data: new Array(200).fill({ id: 'x' }),
      total: 1_000_000,
      limit: 200,
      offset: 0,
      hasMore: true,
    });

    const all = await foodApi.listAll();

    expect(all.truncated).toBe(true);
    expect(all.items).toHaveLength(5000); // PAGE_LIMIT * MAX_PAGES
  });
});

describe('dailyCheckInsApi.listAll', () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockRequest.mockResolvedValue({ data: [], total: 0, limit: 200, offset: 0, hasMore: false });
  });

  it('pages until hasMore is false', async () => {
    mockRequest
      .mockResolvedValueOnce({ data: new Array(200).fill({ id: 'x' }), total: 250, limit: 200, offset: 0, hasMore: true })
      .mockResolvedValueOnce({ data: new Array(50).fill({ id: 'y' }), total: 250, limit: 200, offset: 200, hasMore: false });

    const all = await dailyCheckInsApi.listAll();

    expect(all.items).toHaveLength(250);
    expect(all.truncated).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});
