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

## Quick Start

### 1. Create the Model

File: `backend/src/models/{resource}.ts`

```typescript
import { getPool } from '../db/index.js';

export async function findByUserId(userId: string) {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM resources WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function create(userId: string, data: { name: string }) {
  const pool = getPool();
  const { rows } = await pool.query(
    `INSERT INTO resources (user_id, name) VALUES ($1, $2) RETURNING *`,
    [userId, data.name]
  );
  return rows[0];
}
```

### 2. Create the Service

File: `backend/src/services/{resource}.ts`

```typescript
import * as model from '../models/{resource}.js';

export async function list(userId: string) {
  return model.findByUserId(userId);
}

export async function create(userId: string, data: { name: string }) {
  return model.create(userId, data);
}
```

### 3. Create the Controller

File: `backend/src/controllers/{resource}.ts`

```typescript
import { asyncHandler } from '../utils/asyncHandler.js';
import { sendJson } from '../utils/response.js';
import * as service from '../services/{resource}.js';

export const list = asyncHandler(async (req, res) => {
  const items = await service.list(req.user!.id);
  sendJson(res, items);
});

export const create = asyncHandler(async (req, res) => {
  const item = await service.create(req.user!.id, req.body);
  sendJson(res, item, 201);
});
```

### 4. Create the Route

File: `backend/src/routes/{resource}.ts`

```typescript
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import * as controller from '../controllers/{resource}.js';

const router = Router();

const createSchema = z.object({
  name: z.string().min(1).max(255),
});

router.use(authenticate);
router.get('/', controller.list);
router.post('/', validateBody(createSchema), controller.create);

export default router;
```

### 5. Register in app.ts

```typescript
import resourceRoutes from './src/routes/{resource}.js';
app.use('/api/resources', resourceRoutes);
```

## Middleware Reference

- `authenticate` - Requires valid JWT
- `requirePro` - Requires Pro subscription
- `validateBody(schema)` - Validates request body
- `validateParams(schema)` - Validates URL params
