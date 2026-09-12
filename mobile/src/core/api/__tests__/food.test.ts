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

    expect(all).toHaveLength(250);
    expect(mockRequest).toHaveBeenCalledTimes(2);
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

    expect(all).toHaveLength(250);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});
