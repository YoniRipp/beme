# Test Rules

Rules for files matching `**/*.test.ts`

## File Location

Co-locate tests with source files:
- `services/voice.ts` → `services/voice.test.ts`
- `hooks/useSpeechRecognition.ts` → `hooks/useSpeechRecognition.test.ts`

## Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('ModuleName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('functionName', () => {
    it('should do expected behavior', async () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = await functionName(input);
      
      // Assert
      expect(result).toEqual(expected);
    });

    it('should handle edge case', async () => {
      // ...
    });

    it('should throw on invalid input', async () => {
      await expect(functionName(invalid))
        .rejects.toThrow('Expected error message');
    });
  });
});
```

## Mocking

### Mock Modules
```typescript
vi.mock('@/services/database', () => ({
  query: vi.fn(),
}));

import { query } from '@/services/database';
const mockQuery = vi.mocked(query);

mockQuery.mockResolvedValue({ rows: [{ id: '1' }] });
```

### Mock External Services
```typescript
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: vi.fn().mockResolvedValue({
        response: { text: () => 'mocked response' },
      }),
    }),
  })),
}));
```

### Mock Fetch
```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'mocked' }),
});
```

## React Component Testing

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe('Component', () => {
  it('should render correctly', () => {
    renderWithProviders(<Component />);
    expect(screen.getByText('Expected text')).toBeInTheDocument();
  });

  it('should handle user interaction', async () => {
    renderWithProviders(<Component />);
    
    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));
    
    await waitFor(() => {
      expect(screen.getByText('Success')).toBeInTheDocument();
    });
  });
});
```

## Test Patterns

### Async Tests
```typescript
it('should handle async operation', async () => {
  const result = await asyncFunction();
  expect(result).toBeDefined();
});
```

### Error Testing
```typescript
it('should throw expected error', async () => {
  await expect(functionThatThrows())
    .rejects.toThrow('Expected message');
});
```

### Snapshot Testing (use sparingly)
```typescript
it('should match snapshot', () => {
  const { container } = render(<Component />);
  expect(container).toMatchSnapshot();
});
```

## Required Practices

- Use descriptive test names
- Follow Arrange-Act-Assert pattern
- Mock external dependencies
- Test edge cases and error paths
- Clean up after tests (use `beforeEach`/`afterEach`)

## Forbidden

- Testing implementation details
- Shared mutable state between tests
- Network calls to real APIs
- Flaky time-dependent tests
- Skipped tests without explanation

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- --run voice

# Watch mode
npm test -- --watch

# Coverage
npm test -- --coverage
```
