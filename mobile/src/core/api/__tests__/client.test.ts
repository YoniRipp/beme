import * as SecureStore from 'expo-secure-store';
import { request, setToken, setOnUnauthorized, getApiBaseUrl } from '../client';

// The transport itself is covered in @trackvibe/shared; these cover THIS app's wiring of it —
// the SecureStore token, the mobile platform header and the 401 -> logout path.

const STORAGE_KEY = 'trackvibe_token';

function response(status: number, body: unknown, statusText = '') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  };
}

let fetchMock: jest.Mock;

function lastInit(): { headers: Record<string, string>; method?: string; body?: string } {
  return fetchMock.mock.calls[fetchMock.mock.calls.length - 1][1];
}

beforeEach(async () => {
  fetchMock = jest.fn().mockResolvedValue(response(200, { ok: true }));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  await setToken(null);
  setOnUnauthorized(null);
});

describe('request', () => {
  it('sends the SecureStore token and the mobile platform header', async () => {
    await setToken('stored-token');

    await request('/api/auth/me');

    expect(fetchMock).toHaveBeenCalledWith(`${getApiBaseUrl()}/api/auth/me`, expect.anything());
    expect(lastInit().headers.Authorization).toBe('Bearer stored-token');
    expect(lastInit().headers['X-Client-Platform']).toBe('mobile');
    expect(lastInit().headers['Content-Type']).toBe('application/json');
  });

  it('sends no Authorization header when nothing is stored', async () => {
    await request('/api/auth/me');

    expect(lastInit().headers.Authorization).toBeUndefined();
  });

  it('serialises a body for a mutation and resolves undefined for a 204', async () => {
    await request('/api/goals', { method: 'POST', body: { title: 'Run' } });
    expect(lastInit().method).toBe('POST');
    expect(lastInit().body).toBe('{"title":"Run"}');

    fetchMock.mockResolvedValueOnce(response(204, null));
    await expect(request('/api/goals/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('clears the stored token and notifies the auth context on a 401', async () => {
    await setToken('stale-token');
    const onUnauthorized = jest.fn();
    setOnUnauthorized(onUnauthorized);
    fetchMock.mockResolvedValueOnce(response(401, { error: { code: 'UNAUTHORIZED', message: 'Token expired' } }));

    await expect(request('/api/auth/me')).rejects.toThrow('Token expired');

    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(STORAGE_KEY);
    expect(await SecureStore.getItemAsync(STORAGE_KEY)).toBeNull();
  });

  it("surfaces the server's error message rather than the raw envelope", async () => {
    fetchMock.mockResolvedValueOnce(response(404, { error: { code: 'NOT_FOUND', message: 'Goal not found' } }, 'Not Found'));

    await expect(request('/api/goals/nope')).rejects.toThrow('Goal not found');
  });
});
