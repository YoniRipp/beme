import React from 'react';
import { Text } from 'react-native';
import { render, waitFor } from '@testing-library/react-native';

/**
 * Signing out drops every cached query.
 *
 * `queryClient` is module-level and shared by the whole app, and its `staleTime` is a
 * minute. Without an explicit clear, the next account to sign in on the same device is
 * served the previous account's workouts, food entries, weights and goals straight from
 * cache — for up to a minute, with no refetch to correct it.
 *
 * The web has always done this (`frontend/src/context/AuthContext.tsx`,
 * `clearClientSession`). This client had not, which is the kind of asymmetry between the two
 * clients this whole workstream exists to close. It matters most on account deletion: the
 * rows are gone server-side by then, so this cache is the only copy of them left anywhere.
 */

const mockSetToken = jest.fn();
jest.mock('../../core/api/client', () => ({
  getToken: jest.fn(async () => null),
  setToken: (...args: unknown[]) => mockSetToken(...args),
  setOnUnauthorized: jest.fn(),
}));
jest.mock('../../core/api/auth', () => ({
  authApi: { me: jest.fn(), login: jest.fn(), register: jest.fn() },
}));

import { queryClient } from '../../lib/queryClient';
import { AuthContext, AuthProvider } from '../AuthContext';

function LogoutOnMount() {
  const auth = React.useContext(AuthContext);
  React.useEffect(() => {
    auth?.logout();
  }, [auth]);
  return <Text>ready</Text>;
}

describe('AuthContext logout', () => {
  beforeEach(() => {
    mockSetToken.mockClear();
    queryClient.clear();
  });

  it('drops the previous account’s cached queries', async () => {
    queryClient.setQueryData(['workouts'], [{ id: 'w1', title: 'Push day' }]);
    queryClient.setQueryData(['weight'], [{ id: 'k1', weight: 81 }]);
    expect(queryClient.getQueryData(['workouts'])).toBeDefined();

    render(
      <AuthProvider>
        <LogoutOnMount />
      </AuthProvider>,
    );

    await waitFor(() => expect(mockSetToken).toHaveBeenCalledWith(null));
    expect(queryClient.getQueryData(['workouts'])).toBeUndefined();
    expect(queryClient.getQueryData(['weight'])).toBeUndefined();
  });
});
