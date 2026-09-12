/* eslint-env jest */

// expo-secure-store has no JS implementation under the test runner.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItemAsync: jest.fn(async (k, v) => { store.set(k, v); }),
    deleteItemAsync: jest.fn(async (k) => { store.delete(k); }),
  };
});

// @react-native-async-storage/async-storage has no JS implementation under the test runner.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    getItem: jest.fn(async (k) => (store.has(k) ? store.get(k) : null)),
    setItem: jest.fn(async (k, v) => { store.set(k, v); }),
    removeItem: jest.fn(async (k) => { store.delete(k); }),
    clear: jest.fn(async () => { store.clear(); }),
  };
});
