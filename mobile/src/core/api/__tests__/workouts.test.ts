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

    expect(all).toHaveLength(250);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it('returns a single page unchanged when hasMore is false', async () => {
    mockRequest.mockResolvedValueOnce({ data: [{ id: 'a' }], total: 1, limit: 200, offset: 0, hasMore: false });

    const all = await workoutsApi.listAll();

    expect(all).toEqual([{ id: 'a' }]);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });
});
