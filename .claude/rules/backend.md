# Backend Rules

Rules for files matching `backend/**/*.ts`

## Architecture

Follow this structure:
- `routes/` - HTTP layer (validation, auth middleware)
- `controllers/` - Request handling (parse, delegate, respond)
- `services/` - Business logic (pure functions where possible)
- `models/` - Data access (SQL queries)
- `events/` - Async processing (pub/sub)

## Patterns

### Route Handler
```typescript
export const handler = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const result = await service.method(userId, req.body);
  sendJson(res, result);
});
```

### Service Function
```typescript
export async function createItem(userId: string, data: CreateItemInput): Promise<Item> {
  validateInput(data);
  const item = await model.insert(userId, data);
  await eventBus.publish('item.created', { userId, item });
  return item;
}
```

### Database Query
```typescript
export async function findById(id: string): Promise<Item | null> {
  const result = await pool.query(
    'SELECT * FROM items WHERE id = $1',
    [id]
  );
  return result.rows[0] ?? null;
}
```

## Required Practices

- Use `asyncHandler` wrapper for all route handlers
- Validate inputs with Zod schemas
- Use parameterized SQL queries only
- Log with `logger`, never `console.log`
- Handle errors in controller, not service
- Return plain objects from services

## Forbidden

- Raw SQL string concatenation
- `any` type annotations
- `console.log` statements
- Synchronous file I/O
- Empty catch blocks
