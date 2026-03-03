# Shadcn Component Skill

Guide for creating and using shadcn/ui components in BMe frontend.

## When to Use

Use this skill when:
- Adding new UI components
- Customizing existing shadcn components
- Implementing design patterns
- Building forms and dialogs

## Installation

Add new shadcn components:

```bash
cd frontend
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add form
```

List available components:
```bash
npx shadcn@latest add --help
```

## Component Location

Shadcn components are installed to:
```
frontend/src/components/ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── input.tsx
├── label.tsx
└── ...
```

## Using Components

### Basic Usage

```tsx
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function MyComponent() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Title</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="default">Click me</Button>
      </CardContent>
    </Card>
  );
}
```

### Button Variants

```tsx
<Button variant="default">Default</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="link">Link</Button>

<Button size="default">Default</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button size="icon"><Icon /></Button>
```

### Forms with React Hook Form

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
});

export function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '' },
  });
  
  const onSubmit = (data: z.infer<typeof schema>) => {
    console.log(data);
  };
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Submit</Button>
      </form>
    </Form>
  );
}
```

### Dialogs

```tsx
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export function ConfirmDialog({ onConfirm }: { onConfirm: () => void }) {
  const [open, setOpen] = useState(false);
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive">Delete</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={() => {
            onConfirm();
            setOpen(false);
          }}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### Toast Notifications

BMe uses Sonner for toasts:

```tsx
import { toast } from 'sonner';

// Success
toast.success('Item saved');

// Error
toast.error('Something went wrong');

// With description
toast.success('Saved', {
  description: 'Your changes have been saved.',
});

// Loading state
const id = toast.loading('Saving...');
await save();
toast.success('Saved', { id });
```

## Tailwind Patterns

### Spacing

```tsx
<div className="p-4">        {/* Padding */}
<div className="m-4">        {/* Margin */}
<div className="space-y-4">  {/* Vertical gap between children */}
<div className="gap-4">      {/* Grid/flex gap */}
```

### Flexbox

```tsx
<div className="flex items-center justify-between">
<div className="flex flex-col gap-2">
<div className="flex-1">  {/* Grow to fill */}
```

### Grid

```tsx
<div className="grid grid-cols-2 gap-4">
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
```

### Responsive

```tsx
<div className="hidden md:block">    {/* Hide on mobile */}
<div className="text-sm md:text-base"> {/* Responsive text */}
<div className="grid-cols-1 lg:grid-cols-2">
```

## BMe Component Patterns

### Page Layout

```tsx
export function MyPage() {
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-2xl font-bold mb-6">Page Title</h1>
      <div className="grid gap-6">
        {/* Content */}
      </div>
    </div>
  );
}
```

### Card List

```tsx
export function ItemList({ items }: { items: Item[] }) {
  return (
    <div className="grid gap-4">
      {items.map((item) => (
        <Card key={item.id}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span>{item.name}</span>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
```

### Loading States

```tsx
import { Skeleton } from '@/components/ui/skeleton';

export function LoadingCard() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-[250px] mb-2" />
        <Skeleton className="h-4 w-[200px]" />
      </CardContent>
    </Card>
  );
}
```

## Common Components to Add

For BMe, consider adding:
- `npx shadcn@latest add calendar` - Date pickers
- `npx shadcn@latest add select` - Dropdowns
- `npx shadcn@latest add tabs` - Tab navigation
- `npx shadcn@latest add sheet` - Mobile-friendly sidebars
- `npx shadcn@latest add dropdown-menu` - Context menus
- `npx shadcn@latest add avatar` - User avatars
- `npx shadcn@latest add progress` - Progress bars

## Customization

Edit `frontend/tailwind.config.js` for theme customization.
Edit component files directly in `frontend/src/components/ui/` for behavior changes.
