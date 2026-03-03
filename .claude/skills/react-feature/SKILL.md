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
- Building feature modules with proper separation

## Architecture

```
src/
├── pages/{Feature}.tsx           → Route component
├── features/{feature}/
│   ├── api.ts                    → API calls
│   ├── mappers.ts                → Data transformation
│   └── hooks/                    → Feature-specific hooks
├── components/{feature}/         → Feature components
└── context/{Feature}Context.tsx  → Global state (if needed)
```

## Step-by-Step Guide

### 1. Create the API Layer

File: `frontend/src/features/{feature}/api.ts`

```typescript
import { apiClient } from '@/lib/api';

export interface Resource {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateResourcePayload {
  name: string;
}

export interface UpdateResourcePayload {
  name?: string;
}

export async function fetchResources(): Promise<Resource[]> {
  const response = await apiClient.get<Resource[]>('/api/resources');
  return response.data;
}

export async function fetchResource(id: string): Promise<Resource> {
  const response = await apiClient.get<Resource>(`/api/resources/${id}`);
  return response.data;
}

export async function createResource(payload: CreateResourcePayload): Promise<Resource> {
  const response = await apiClient.post<Resource>('/api/resources', payload);
  return response.data;
}

export async function updateResource(id: string, payload: UpdateResourcePayload): Promise<Resource> {
  const response = await apiClient.put<Resource>(`/api/resources/${id}`, payload);
  return response.data;
}

export async function deleteResource(id: string): Promise<void> {
  await apiClient.delete(`/api/resources/${id}`);
}
```

### 2. Create Mappers (Optional)

File: `frontend/src/features/{feature}/mappers.ts`

```typescript
import type { Resource } from './api';

export interface ResourceViewModel {
  id: string;
  name: string;
  displayDate: string;
  isRecent: boolean;
}

export function mapResourceToViewModel(resource: Resource): ResourceViewModel {
  const createdAt = new Date(resource.createdAt);
  const now = new Date();
  const daysDiff = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

  return {
    id: resource.id,
    name: resource.name,
    displayDate: createdAt.toLocaleDateString(),
    isRecent: daysDiff < 7,
  };
}

export function mapResourcesToViewModels(resources: Resource[]): ResourceViewModel[] {
  return resources.map(mapResourceToViewModel);
}
```

### 3. Create React Query Hooks

File: `frontend/src/features/{feature}/hooks/useResources.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import * as api from '../api';
import { mapResourcesToViewModels } from '../mappers';

const QUERY_KEY = ['resources'];

export function useResources() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: api.fetchResources,
    select: mapResourcesToViewModels,
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: [...QUERY_KEY, id],
    queryFn: () => api.fetchResource(id),
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.createResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Resource created');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create resource');
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: api.UpdateResourcePayload }) =>
      api.updateResource(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Resource updated');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update resource');
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.deleteResource,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast.success('Resource deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete resource');
    },
  });
}
```

### 4. Create Components

File: `frontend/src/components/{feature}/ResourceList.tsx`

```tsx
import { useResources } from '@/features/{feature}/hooks/useResources';
import { ResourceCard } from './ResourceCard';
import { Skeleton } from '@/components/ui/skeleton';

export function ResourceList() {
  const { data: resources, isLoading, error } = useResources();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        Failed to load resources
      </div>
    );
  }

  if (!resources?.length) {
    return (
      <div className="text-center text-muted-foreground">
        No resources yet
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {resources.map((resource) => (
        <ResourceCard key={resource.id} resource={resource} />
      ))}
    </div>
  );
}
```

File: `frontend/src/components/{feature}/ResourceCard.tsx`

```tsx
import type { ResourceViewModel } from '@/features/{feature}/mappers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface ResourceCardProps {
  resource: ResourceViewModel;
}

export function ResourceCard({ resource }: ResourceCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          {resource.name}
          {resource.isRecent && <Badge variant="secondary">New</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Created {resource.displayDate}
        </p>
      </CardContent>
    </Card>
  );
}
```

### 5. Create the Page

File: `frontend/src/pages/{Feature}.tsx`

```tsx
import { ResourceList } from '@/components/{feature}/ResourceList';
import { CreateResourceDialog } from '@/components/{feature}/CreateResourceDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';

export default function FeaturePage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resources</h1>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Resource
        </Button>
      </div>

      <ResourceList />

      <CreateResourceDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
      />
    </div>
  );
}
```

### 6. Add Route

File: `frontend/src/App.tsx` (add to routes)

```tsx
import FeaturePage from './pages/Feature';

// In routes array:
{ path: '/feature', element: <FeaturePage /> }
```

## Component Patterns

### Form with Validation

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
});

type FormData = z.infer<typeof schema>;

function ResourceForm({ onSubmit }: { onSubmit: (data: FormData) => void }) {
  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  });

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
      {form.formState.errors.name && (
        <p className="text-destructive">{form.formState.errors.name.message}</p>
      )}
      <Button type="submit">Submit</Button>
    </form>
  );
}
```

### Dialog Pattern

```tsx
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CreateResourceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateResourceDialog({ open, onOpenChange }: CreateResourceDialogProps) {
  const createMutation = useCreateResource();

  const handleSubmit = async (data: FormData) => {
    await createMutation.mutateAsync(data);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Resource</DialogTitle>
        </DialogHeader>
        <ResourceForm onSubmit={handleSubmit} />
      </DialogContent>
    </Dialog>
  );
}
```

## UI Components Available

BMe uses shadcn/ui. Available components:
- `Button`, `Input`, `Textarea`, `Select`
- `Card`, `Dialog`, `Sheet`, `Popover`
- `Table`, `Badge`, `Avatar`
- `Tabs`, `Accordion`, `Collapsible`
- `Form`, `Label`, `Checkbox`, `Switch`
- `Toast` (via sonner)
- `Skeleton`, `Spinner`

Import from `@/components/ui/{component}`.
