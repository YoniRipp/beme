/** @type {import('vitest').UserConfig} */
export default {
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'lambdas/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', '**/node_modules/**'],
    },
  },
};
