---
name: openapi-spec-generation
description: OpenAPI specification generation for BMe Express API. Use when documenting API endpoints, generating client SDKs, or setting up Swagger UI.
---

# OpenAPI Spec Generation Skill

Generate and maintain OpenAPI 3.1 specifications for BMe's Express REST API.

## When to Use

- Documenting new API endpoints
- Generating OpenAPI specs from existing routes
- Setting up Swagger UI for API exploration
- Generating TypeScript client SDKs
- Creating API documentation portals

## Quick Start

### Install Dependencies

```bash
cd backend
npm install swagger-jsdoc swagger-ui-express
npm install -D @types/swagger-jsdoc @types/swagger-ui-express
```

### Configure Swagger

```typescript
// backend/src/config/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.1.0',
    info: {
      title: 'BMe API',
      version: '1.0.0',
      description: 'BMe health tracking API',
      contact: {
        name: 'BMe Support',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'API server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: ['./src/routes/*.ts', './src/schemas/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);
```

### Mount Swagger UI

```typescript
// backend/app.ts
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './src/config/swagger.js';

// Serve OpenAPI spec
app.get('/api/openapi.json', (req, res) => {
  res.json(swaggerSpec);
});

// Serve Swagger UI
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

## Documenting Endpoints

### Basic Route Documentation

```typescript
// backend/src/routes/food.ts
import { Router } from 'express';

const router = Router();

/**
 * @openapi
 * /food:
 *   get:
 *     summary: List food entries
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Filter by date (YYYY-MM-DD)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Maximum number of entries
 *     responses:
 *       200:
 *         description: List of food entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/FoodEntry'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get('/', authenticate, controller.list);
```

### POST Endpoint with Request Body

```typescript
/**
 * @openapi
 * /food:
 *   post:
 *     summary: Create food entry
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateFoodInput'
 *     responses:
 *       201:
 *         description: Food entry created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodEntry'
 *       400:
 *         $ref: '#/components/responses/ValidationError'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.post('/', authenticate, validateBody(createSchema), controller.create);
```

### Path Parameters

```typescript
/**
 * @openapi
 * /food/{id}:
 *   get:
 *     summary: Get food entry by ID
 *     tags: [Food]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Food entry ID
 *     responses:
 *       200:
 *         description: Food entry
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/FoodEntry'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get('/:id', authenticate, controller.getById);
```

## Defining Schemas

### Schema Definitions

```typescript
// backend/src/schemas/food.ts

/**
 * @openapi
 * components:
 *   schemas:
 *     FoodEntry:
 *       type: object
 *       required:
 *         - id
 *         - name
 *         - userId
 *         - createdAt
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           example: "Grilled Chicken"
 *         calories:
 *           type: number
 *           nullable: true
 *           example: 250
 *         protein:
 *           type: number
 *           nullable: true
 *           example: 30
 *         carbs:
 *           type: number
 *           nullable: true
 *           example: 0
 *         fat:
 *           type: number
 *           nullable: true
 *           example: 10
 *         grams:
 *           type: number
 *           nullable: true
 *           example: 150
 *         mealType:
 *           type: string
 *           enum: [breakfast, lunch, dinner, snack]
 *           example: "lunch"
 *         userId:
 *           type: string
 *           format: uuid
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 * 
 *     CreateFoodInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *           example: "Grilled Chicken"
 *         calories:
 *           type: number
 *           minimum: 0
 *         protein:
 *           type: number
 *           minimum: 0
 *         carbs:
 *           type: number
 *           minimum: 0
 *         fat:
 *           type: number
 *           minimum: 0
 *         grams:
 *           type: number
 *           minimum: 0
 *         mealType:
 *           type: string
 *           enum: [breakfast, lunch, dinner, snack]
 */
```

### Common Response Schemas

```typescript
// backend/src/schemas/common.ts

/**
 * @openapi
 * components:
 *   responses:
 *     Unauthorized:
 *       description: Authentication required
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     
 *     Forbidden:
 *       description: Access denied
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Error'
 *     
 *     ValidationError:
 *       description: Validation failed
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ValidationError'
 *   
 *   schemas:
 *     Error:
 *       type: object
 *       required:
 *         - error
 *       properties:
 *         error:
 *           type: object
 *           required:
 *             - message
 *           properties:
 *             message:
 *               type: string
 *               example: "Resource not found"
 *             code:
 *               type: string
 *               example: "NOT_FOUND"
 *     
 *     ValidationError:
 *       type: object
 *       required:
 *         - error
 *       properties:
 *         error:
 *           type: object
 *           required:
 *             - message
 *             - code
 *           properties:
 *             message:
 *               type: string
 *               example: "Validation failed"
 *             code:
 *               type: string
 *               example: "VALIDATION_ERROR"
 *             details:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   path:
 *                     type: array
 *                     items:
 *                       type: string
 *                   message:
 *                     type: string
 */
```

## BMe API Tags

Organize endpoints with tags:

```typescript
/**
 * @openapi
 * tags:
 *   - name: Auth
 *     description: Authentication endpoints
 *   - name: Food
 *     description: Food tracking
 *   - name: Workout
 *     description: Workout tracking
 *   - name: Schedule
 *     description: Daily schedule
 *   - name: Voice
 *     description: Voice commands
 *   - name: Insights
 *     description: AI insights
 *   - name: Groups
 *     description: Group management
 *   - name: Transactions
 *     description: Financial tracking
 */
```

## Voice Endpoint Documentation

```typescript
/**
 * @openapi
 * /voice/transcribe:
 *   post:
 *     summary: Transcribe audio to text
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - audio
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *                 description: Audio file (webm, mp3, wav)
 *     responses:
 *       200:
 *         description: Transcription result
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 transcript:
 *                   type: string
 *                   example: "I ate rice and chicken for lunch"
 *
 * /voice/understand:
 *   post:
 *     summary: Parse voice command into actions
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - transcript
 *             properties:
 *               transcript:
 *                 type: string
 *                 example: "I ate rice and chicken for lunch"
 *     responses:
 *       200:
 *         description: Parsed actions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 actions:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VoiceAction'
 */
```

## Generating Client SDK

### TypeScript Client

```bash
# Using openapi-typescript
npx openapi-typescript http://localhost:3000/api/openapi.json -o frontend/src/types/api.d.ts

# Using openapi-generator
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3000/api/openapi.json \
  -g typescript-fetch \
  -o frontend/src/api
```

### Zod Schemas from OpenAPI

```bash
# Generate Zod schemas
npx openapi-zod-client http://localhost:3000/api/openapi.json -o frontend/src/schemas/api.ts
```

## Export Spec File

```typescript
// backend/scripts/generate-openapi.ts
import { writeFileSync } from 'fs';
import { swaggerSpec } from '../src/config/swagger.js';

writeFileSync(
  './openapi.json',
  JSON.stringify(swaggerSpec, null, 2)
);

console.log('OpenAPI spec generated: openapi.json');
```

```bash
npx tsx scripts/generate-openapi.ts
```

## Best Practices

### Do

- Document all public endpoints
- Include examples for request/response
- Use $ref for reusable schemas
- Keep schemas in sync with Zod validators
- Version the API spec
- Test documentation with Swagger UI

### Don't

- Document internal/admin-only endpoints publicly
- Include sensitive data in examples
- Duplicate schema definitions
- Forget to update docs when API changes

## Validation Alignment

Keep OpenAPI schemas aligned with Zod:

```typescript
// Zod schema (source of truth)
export const createFoodSchema = z.object({
  name: z.string().min(1).max(255),
  calories: z.number().min(0).optional(),
  grams: z.number().min(0).optional(),
});

// OpenAPI should match
/**
 * @openapi
 * components:
 *   schemas:
 *     CreateFoodInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           minLength: 1
 *           maxLength: 255
 *         calories:
 *           type: number
 *           minimum: 0
 *         grams:
 *           type: number
 *           minimum: 0
 */
```

## Testing Documentation

```bash
# Validate OpenAPI spec
npx @apidevtools/swagger-cli validate openapi.json

# Lint for best practices
npx spectral lint openapi.json
```
