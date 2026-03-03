# Frontend Rules

Rules for files matching `frontend/**/*.tsx`

## Component Structure

```typescript
// 1. Imports
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';

// 2. Types
interface Props {
  id: string;
}

// 3. Component
export function MyComponent({ id }: Props) {
  // 3a. Hooks
  const [state, setState] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['item', id],
    queryFn: () => fetchItem(id),
  });

  // 3b. Handlers
  const handleClick = () => {
    setState(true);
  };

  // 3c. Early returns
  if (isLoading) return <Skeleton />;

  // 3d. Render
  return (
    <div className="p-4">
      <Button onClick={handleClick}>Click</Button>
    </div>
  );
}
```

## State Management

- **Server state**: React Query (`@tanstack/react-query`)
- **UI state**: `useState` or `useReducer`
- **Global state**: React Context (sparingly)
- **Form state**: React Hook Form

## Patterns

### Data Fetching
```typescript
const { data, isLoading, error } = useQuery({
  queryKey: ['items', filters],
  queryFn: () => api.getItems(filters),
});
```

### Mutations
```typescript
const { mutate, isPending } = useMutation({
  mutationFn: api.createItem,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    toast.success('Item created');
  },
});
```

### Forms
```typescript
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { name: '' },
});
```

## Styling

- Use Tailwind CSS classes
- Use shadcn/ui components
- Responsive: mobile-first (`md:`, `lg:` prefixes)
- Dark mode: `dark:` prefix when needed

## Required Practices

- Functional components only
- Custom hooks for reusable logic
- Handle loading and error states
- Use semantic HTML elements
- Accessible: proper labels, ARIA when needed

## Forbidden

- Class components
- Inline styles (use Tailwind)
- Direct DOM manipulation
- `any` type annotations
- `console.log` in production
