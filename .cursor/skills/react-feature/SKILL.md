---
name: react-feature
description: Create React feature modules for BMe following the feature-sliced architecture. Use this skill when adding new frontend features, pages, or domain modules.
---

# React Feature Skill

This skill helps you create properly structured React features for BMe.

## When to Use

- Adding a new page or feature area
- Creating domain-specific components
- Setting up React Query hooks for a new API

## Architecture

```
src/
├── pages/{Feature}.tsx           → Route component
├── features/{feature}/
│   ├── api.ts                    → API calls
│   └── hooks/                    → Feature-specific hooks
└── components/{feature}/         → Feature components
```

## Quick Start

### 1. Create the API Layer

File: `frontend/src/features/{feature}/api.ts`

```typescript
import { apiClient } from '@/lib/api';

export interface Resource {
  id: string;
  name: string;
}

export async function fetchResources(): Promise<Resource[]> {
  const response = await apiClient.get<Resource[]>('/api/resources');
  return response.data;
}

export async function createResource(payload: { name: string }): Promise<Resource> {
  const response = await apiClient.post<Resource>('/api/resources', payload);
  return response.data;
}
```

### 2. Create React Query Hooks

File: `frontend/src/features/{feature}/hooks/useResources.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../api';

export function useResources() {
  return useQuery({
    queryKey: ['resources'],
    queryFn: api.fetchResources,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      toast.success('Resource created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create');
    },
  });
}
```

### 3. Create Components

File: `frontend/src/components/{feature}/ResourceList.tsx`

```tsx
import { useResources } from '@/features/{feature}/hooks/useResources';
import { Skeleton } from '@/components/ui/skeleton';

export function ResourceList() {
  const { data, isLoading, error } = useResources();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (error) return <div className="text-destructive">Failed to load</div>;
  if (!data?.length) return <div className="text-muted-foreground">No items</div>;

  return (
    <div className="space-y-4">
      {data.map((item) => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  );
}
```

### 4. Create the Page

File: `frontend/src/pages/{Feature}.tsx`

```tsx
import { ResourceList } from '@/components/{feature}/ResourceList';

export default function FeaturePage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Resources</h1>
      <ResourceList />
    </div>
  );
}
```

## UI Components

BMe uses shadcn/ui. Import from `@/components/ui/`:
- `Button`, `Input`, `Card`, `Dialog`
- `Table`, `Badge`, `Skeleton`
- `Form`, `Label`, `Select`
