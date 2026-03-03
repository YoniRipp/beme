---
name: test-generator
description: Generate Vitest tests for BMe code. Use this skill when creating unit tests, integration tests, or adding test coverage for existing code.
---

# Test Generator Skill

This skill helps you create properly structured tests for BMe using Vitest.

## When to Use

- Adding tests for new code
- Increasing test coverage for existing features
- Creating integration tests for API routes
- Testing React components and hooks

## Testing Stack

- **Framework**: Vitest
- **React Testing**: @testing-library/react
- **HTTP Mocking**: msw (Mock Service Worker) or vi.mock
- **Coverage**: @vitest/coverage-v8

## File Naming Convention

Test files are co-located with source files:

```
src/services/foo.ts      → src/services/foo.test.ts
src/components/Bar.tsx   → src/components/Bar.test.tsx
src/hooks/useBaz.ts      → src/hooks/useBaz.test.ts
```

## Backend Tests

### Service Test Template

File: `backend/src/services/{service}.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as service from './{service}.js';
import * as model from '../models/{resource}.js';

vi.mock('../models/{resource}.js');

describe('{Service}Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return all items for user', async () => {
      const mockItems = [
        { id: '1', name: 'Item 1', user_id: 'user-1' },
        { id: '2', name: 'Item 2', user_id: 'user-1' },
      ];
      vi.mocked(model.findByUserId).mockResolvedValue(mockItems);

      const result = await service.list('user-1');

      expect(model.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockItems);
    });
  });

  describe('create', () => {
    it('should create a new item', async () => {
      const mockItem = { id: '1', name: 'New Item', user_id: 'user-1' };
      vi.mocked(model.create).mockResolvedValue(mockItem);

      const result = await service.create('user-1', { name: 'New Item' });

      expect(model.create).toHaveBeenCalledWith('user-1', { name: 'New Item' });
      expect(result).toEqual(mockItem);
    });
  });

  describe('getById', () => {
    it('should return item when found', async () => {
      const mockItem = { id: '1', name: 'Item', user_id: 'user-1' };
      vi.mocked(model.findById).mockResolvedValue(mockItem);

      const result = await service.getById('user-1', '1');

      expect(result).toEqual(mockItem);
    });

    it('should throw when not found', async () => {
      vi.mocked(model.findById).mockResolvedValue(null);

      await expect(service.getById('user-1', '999')).rejects.toThrow('not found');
    });
  });
});
```

### Controller Test Template

File: `backend/src/controllers/{controller}.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRequest, createResponse } from 'node-mocks-http';
import * as controller from './{controller}.js';
import * as service from '../services/{service}.js';

vi.mock('../services/{service}.js');

describe('{Controller}Controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('list', () => {
    it('should return 200 with items', async () => {
      const mockItems = [{ id: '1', name: 'Item' }];
      vi.mocked(service.list).mockResolvedValue(mockItems);

      const req = createRequest({
        user: { id: 'user-1' },
      });
      const res = createResponse();

      await controller.list(req, res);

      expect(res.statusCode).toBe(200);
      expect(res._getJSONData()).toEqual(mockItems);
    });
  });

  describe('create', () => {
    it('should return 201 with created item', async () => {
      const mockItem = { id: '1', name: 'New Item' };
      vi.mocked(service.create).mockResolvedValue(mockItem);

      const req = createRequest({
        user: { id: 'user-1' },
        body: { name: 'New Item' },
      });
      const res = createResponse();

      await controller.create(req, res);

      expect(res.statusCode).toBe(201);
      expect(res._getJSONData()).toEqual(mockItem);
    });
  });
});
```

### Voice Executor Test Template

File: `backend/src/services/voiceExecutor.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeActions } from './voiceExecutor.js';
import * as transactionService from './transaction.js';
import * as scheduleService from './schedule.js';

vi.mock('./transaction.js');
vi.mock('./schedule.js');
vi.mock('../db/index.js', () => ({
  isDbConfigured: () => true,
}));

describe('executeActions', () => {
  const userId = 'test-user-id';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('add_transaction', () => {
    it('should create a transaction', async () => {
      vi.mocked(transactionService.create).mockResolvedValue({ id: '1' });

      const actions = [{
        intent: 'add_transaction',
        type: 'expense',
        amount: 50,
        category: 'Food',
        description: 'Lunch',
      }];

      const results = await executeActions(actions, userId);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
      expect(transactionService.create).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({
          type: 'expense',
          amount: 50,
        })
      );
    });
  });

  describe('add_schedule', () => {
    it('should create schedule items', async () => {
      vi.mocked(scheduleService.createBatch).mockResolvedValue([{ id: '1' }]);

      const actions = [{
        intent: 'add_schedule',
        items: [{ title: 'Meeting', startTime: '09:00', endTime: '10:00' }],
      }];

      const results = await executeActions(actions, userId);

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should fail when items array is empty', async () => {
      const actions = [{
        intent: 'add_schedule',
        items: [],
      }];

      const results = await executeActions(actions, userId);

      expect(results[0].success).toBe(false);
      expect(results[0].message).toContain('No schedule items');
    });
  });
});
```

## Frontend Tests

### Component Test Template

File: `frontend/src/components/{Component}.test.tsx`

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResourceCard } from './{Component}';

describe('ResourceCard', () => {
  const mockResource = {
    id: '1',
    name: 'Test Resource',
    displayDate: '2024-01-15',
    isRecent: true,
  };

  it('should render resource name', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('Test Resource')).toBeInTheDocument();
  });

  it('should show badge when recent', () => {
    render(<ResourceCard resource={mockResource} />);

    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('should not show badge when not recent', () => {
    render(<ResourceCard resource={{ ...mockResource, isRecent: false }} />);

    expect(screen.queryByText('New')).not.toBeInTheDocument();
  });
});
```

### Hook Test Template

File: `frontend/src/hooks/{hook}.test.ts`

```typescript
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useResources } from './useResources';
import * as api from '../features/resource/api';

vi.mock('../features/resource/api');

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

describe('useResources', () => {
  it('should fetch and return resources', async () => {
    const mockResources = [{ id: '1', name: 'Test' }];
    vi.mocked(api.fetchResources).mockResolvedValue(mockResources);

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toHaveLength(1);
  });

  it('should handle errors', async () => {
    vi.mocked(api.fetchResources).mockRejectedValue(new Error('Failed'));

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isError).toBe(true);
    });
  });
});
```

## Testing Patterns

### Mocking Modules

```typescript
// Mock entire module
vi.mock('../services/foo.js');

// Mock with implementation
vi.mock('../services/foo.js', () => ({
  getFoo: vi.fn().mockResolvedValue({ id: '1' }),
}));

// Mock specific function
vi.spyOn(service, 'create').mockResolvedValue({ id: '1' });
```

### Testing Async Code

```typescript
// Async assertion
await expect(service.create()).resolves.toEqual({ id: '1' });

// Async rejection
await expect(service.create()).rejects.toThrow('error');

// Wait for condition
await waitFor(() => {
  expect(screen.getByText('Success')).toBeInTheDocument();
});
```

### Testing Events

```typescript
// Click
fireEvent.click(screen.getByRole('button'));

// Type in input
fireEvent.change(screen.getByRole('textbox'), {
  target: { value: 'new value' },
});

// Submit form
fireEvent.submit(screen.getByRole('form'));
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific file
npm test -- src/services/foo.test.ts

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Coverage Requirements

Aim for:
- Services: 80%+ coverage
- Controllers: 70%+ coverage
- Components: 60%+ coverage
- Hooks: 80%+ coverage
