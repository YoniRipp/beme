---
name: api-route
description: Scaffold new Express API routes for BMe following established patterns. Use this skill when adding new endpoints, CRUD operations, or API features.
---

# API Route Skill

This skill helps you create properly structured Express routes for BMe.

## When to Use

- Adding new API endpoints
- Creating CRUD operations for a new resource
- Extending existing API functionality

## Architecture

```
routes/{resource}.ts    → HTTP layer (validation, middleware)
controllers/{resource}.ts → Request handling (orchestration)
services/{resource}.ts    → Business logic
models/{resource}.ts      → Data access (SQL queries)
```

## Step-by-Step Guide

### 1. Create the Model (Data Access)

File: `backend/src/models/{resource}.ts`

```typescript
import { getPool } from '../db/index.js';

export interface ResourceRow {
  id: string;
  user_id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export async function findByUserId(userId: string): Promise<ResourceRow[]> {
  const pool = getPool();
  const { rows } = await pool.query<ResourceRow>(
    `SELECT * FROM resources WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function findById(userId: string, id: string): Promise<ResourceRow | null> {
  const pool = getPool();
  const { rows } = await pool.query<ResourceRow>(
    `SELECT * FROM resources WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return rows[0] ?? null;
}

export async function create(userId: string, data: { name: string }): Promise<ResourceRow> {
  const pool = getPool();
  const { rows } = await pool.query<ResourceRow>(
    `INSERT INTO resources (user_id, name) VALUES ($1, $2) RETURNING *`,
    [userId, data.name]
  );
  return rows[0];
}

export async function update(
  userId: string,
  id: string,
  data: Partial<{ name: string }>
): Promise<ResourceRow | null> {
  const pool = getPool();
  const sets: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  if (data.name !== undefined) {
    sets.push(`name = $${idx++}`);
    values.push(data.name);
  }

  if (sets.length === 0) return findById(userId, id);

  sets.push(`updated_at = now()`);
  values.push(id, userId);

  const { rows } = await pool.query<ResourceRow>(
    `UPDATE resources SET ${sets.join(', ')} 
     WHERE id = $${idx++} AND user_id = $${idx} 
     RETURNING *`,
    values
  );
  return rows[0] ?? null;
}

export async function remove(userId: string, id: string): Promise<boolean> {
  const pool = getPool();
  const { rowCount } = await pool.query(
    `DELETE FROM resources WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );
  return (rowCount ?? 0) > 0;
}
```

### 2. Create the Service (Business Logic)

File: `backend/src/services/{resource}.ts`

```typescript
import * as resourceModel from '../models/{resource}.js';

export async function list(userId: string) {
  return resourceModel.findByUserId(userId);
}

export async function getById(userId: string, id: string) {
  const item = await resourceModel.findById(userId, id);
  if (!item) throw new Error('Resource not found');
  return item;
}

export async function create(userId: string, data: { name: string }) {
  return resourceModel.create(userId, data);
}

export async function update(userId: string, id: string, data: Partial<{ name: string }>) {
  const item = await resourceModel.update(userId, id, data);
  if (!item) throw new Error('Resource not found');
  return item;
}

export async function remove(userId: string, id: string) {
  const deleted = await resourceModel.remove(userId, id);
  if (!deleted) throw new Error('Resource not found');
}
```

### 3. Create the Controller (Request Handling)

File: `backend/src/controllers/{resource}.ts`

```typescript
import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendJson, sendError } from '../utils/response.js';
import * as resourceService from '../services/{resource}.js';

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const items = await resourceService.list(userId);
  sendJson(res, items);
});

export const getById = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const item = await resourceService.getById(userId, id);
    sendJson(res, item);
  } catch {
    sendError(res, 404, 'Resource not found');
  }
});

export const create = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const item = await resourceService.create(userId, req.body);
  sendJson(res, item, 201);
});

export const update = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    const item = await resourceService.update(userId, id, req.body);
    sendJson(res, item);
  } catch {
    sendError(res, 404, 'Resource not found');
  }
});

export const remove = asyncHandler(async (req: AuthRequest, res: Response) => {
  const userId = req.user!.id;
  const { id } = req.params;
  try {
    await resourceService.remove(userId, id);
    res.status(204).send();
  } catch {
    sendError(res, 404, 'Resource not found');
  }
});
```

### 4. Create the Route (HTTP Layer)

File: `backend/src/routes/{resource}.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody, validateParams } from '../middleware/validation.js';
import * as controller from '../controllers/{resource}.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(255),
});

const updateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
});

const idParamSchema = z.object({
  id: z.string().uuid(),
});

router.use(authenticate);

router.get('/', controller.list);
router.get('/:id', validateParams(idParamSchema), controller.getById);
router.post('/', validateBody(createSchema), controller.create);
router.put('/:id', validateParams(idParamSchema), validateBody(updateSchema), controller.update);
router.delete('/:id', validateParams(idParamSchema), controller.remove);

export default router;
```

### 5. Register the Route

File: `backend/app.ts` (add to existing routes)

```typescript
import resourceRoutes from './src/routes/{resource}.js';

// In createApp():
app.use('/api/resources', resourceRoutes);
```

## Validation Schemas

Common Zod patterns:

```typescript
// String with constraints
z.string().min(1).max(255)

// Email
z.string().email()

// UUID
z.string().uuid()

// Date string
z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

// Time string
z.string().regex(/^\d{2}:\d{2}$/)

// Enum
z.enum(['income', 'expense'])

// Number with range
z.number().min(0).max(1000000)

// Optional with default
z.boolean().optional().default(false)

// Array
z.array(z.string()).min(1)

// Object
z.object({
  name: z.string(),
  value: z.number(),
})
```

## Middleware Reference

- `authenticate` - Requires valid JWT, sets `req.user`
- `requirePro` - Requires Pro subscription
- `validateBody(schema)` - Validates request body against Zod schema
- `validateParams(schema)` - Validates URL params
- `validateQuery(schema)` - Validates query string

## Testing the Route

Create `backend/src/routes/{resource}.test.ts`:

```typescript
import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../../app.js';

describe('Resource API', () => {
  it('should create a resource', async () => {
    const app = await createApp();
    const res = await request(app)
      .post('/api/resources')
      .set('Authorization', 'Bearer test-token')
      .send({ name: 'Test Resource' });
    
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Resource');
  });
});
```
