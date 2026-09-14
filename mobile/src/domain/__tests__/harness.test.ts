import { SHARED_PACKAGE_VERSION } from '@trackvibe/shared';

describe('test harness', () => {
  it('runs', () => {
    expect(true).toBe(true);
  });

  it('can import from the shared workspace package', () => {
    expect(SHARED_PACKAGE_VERSION).toBe('1.0.0');
  });
});
