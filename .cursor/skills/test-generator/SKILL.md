---
name: test-generator
description: Generate Vitest tests for BMe code. Use this skill when creating unit tests, integration tests, or adding test coverage.
---

# Test Generator Skill

This skill helps you create properly structured tests for BMe using Vitest.

## When to Use

- Adding tests for new code
- Increasing test coverage
- Testing React components and hooks

## File Naming

Co-locate tests with source files:
- `src/services/foo.ts` → `src/services/foo.test.ts`
- `src/components/Bar.tsx` → `src/components/Bar.test.tsx`

## Backend Service Test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from './{service}.js';
import * as model from '../models/{resource}.js';

vi.mock('../models/{resource}.js');

describe('{Service}', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return items for user', async () => {
    const mockItems = [{ id: '1', name: 'Item' }];
    vi.mocked(model.findByUserId).mockResolvedValue(mockItems);

    const result = await service.list('user-1');

    expect(model.findByUserId).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(mockItems);
  });
});
```

## Frontend Component Test

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Component } from './Component';

describe('Component', () => {
  it('should render correctly', () => {
    render(<Component name="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## Frontend Hook Test

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResources } from './useResources';
import * as api from '../api';

vi.mock('../api');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useResources', () => {
  it('should fetch resources', async () => {
    vi.mocked(api.fetchResources).mockResolvedValue([{ id: '1' }]);

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });
});
```

## Running Tests

```bash
npm test                    # Run all
npm test -- foo.test.ts     # Run specific file
npm run test:coverage       # With coverage
```
