---
name: google-gemini-api
description: Google Gemini API patterns for BMe. Use when working with voice transcription, text understanding, or embeddings using the Gemini SDK.
---

# Google Gemini API Skill

Production-ready patterns for Google Gemini API integration in BMe, covering the current SDK, embedding models, and error handling.

## When to Use

- Implementing voice transcription with Gemini
- Working with text understanding and function calling
- Generating embeddings for semantic search
- Handling Gemini API errors

## Critical: SDK Migration

**DEPRECATED**: `@google/generative-ai` (sunset November 30, 2025)
**CURRENT**: `@google/genai` (use this for all new code)

```bash
npm uninstall @google/generative-ai
npm install @google/genai
```

## Quick Start

### Initialize Client

```typescript
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

### Text Generation

```typescript
const model = genai.models.get('gemini-2.0-flash');

const response = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: 'Hello, world!' }] }],
});

console.log(response.text);
```

### Function Calling (Voice Understanding)

```typescript
import { Type } from '@google/genai';

const tools = [{
  functionDeclarations: [{
    name: 'add_food',
    description: 'Log a food entry',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Food name' },
        calories: { type: Type.NUMBER, description: 'Calories' },
        grams: { type: Type.NUMBER, description: 'Portion in grams' },
      },
      required: ['name'],
    },
  }],
}];

const response = await model.generateContent({
  contents: [{ role: 'user', parts: [{ text: 'I ate 200g of rice' }] }],
  tools,
  toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
});

const functionCalls = response.functionCalls();
```

## Embeddings

### Current Model

Use `gemini-embedding-001` (replaces deprecated `text-embedding-004` and `text-embedding-005`).

```typescript
const EMBEDDING_MODEL = 'gemini-embedding-001';
const EMBEDDING_DIM = 768; // Default dimension

export async function embed(text: string): Promise<number[]> {
  const model = genai.models.get(EMBEDDING_MODEL);
  const result = await model.embedContent(text);
  
  if (!result.embedding?.values) {
    throw new Error('Invalid response from Gemini Embedding API');
  }
  
  return result.embedding.values;
}
```

### Batch Embeddings

```typescript
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const model = genai.models.get(EMBEDDING_MODEL);
  const results = await Promise.all(
    texts.map(text => model.embedContent(text))
  );
  return results.map(r => r.embedding.values);
}
```

### pgvector Storage

```sql
-- Ensure vector column matches embedding dimension
ALTER TABLE food_embeddings 
ALTER COLUMN embedding TYPE vector(768);

-- Create index for similarity search
CREATE INDEX ON food_embeddings 
USING ivfflat (embedding vector_cosine_ops) 
WITH (lists = 100);
```

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 404 Not Found | Model deprecated/removed | Update to current model name |
| 429 Rate Limit | Too many requests | Implement exponential backoff |
| 400 Bad Request | Invalid request format | Check SDK version and params |
| 500 Internal | Gemini service issue | Retry with backoff |

### Retry Pattern

```typescript
async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry 4xx errors (except 429)
      if (error.status >= 400 && error.status < 500 && error.status !== 429) {
        throw error;
      }
      
      const delay = baseDelay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
}

// Usage
const result = await withRetry(() => model.generateContent(request));
```

### Graceful Degradation

```typescript
export async function understandSafe(text: string): Promise<Action[]> {
  try {
    return await understand(text);
  } catch (error) {
    logger.error({ error, text }, 'Gemini understanding failed');
    
    // Return empty actions instead of crashing
    return [];
  }
}
```

## Audio Processing

### Transcription with Gemini

```typescript
export async function transcribeAudio(audioBuffer: Buffer): Promise<string> {
  const model = genai.models.get('gemini-2.0-flash');
  
  const response = await model.generateContent({
    contents: [{
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType: 'audio/webm',
            data: audioBuffer.toString('base64'),
          },
        },
        { text: 'Transcribe this audio. Return only the transcription.' },
      ],
    }],
  });
  
  return response.text.trim();
}
```

## Best Practices

### Do

- Use `gemini-embedding-001` for embeddings
- Implement retry logic for transient errors
- Log errors with context for debugging
- Validate API responses before using

### Don't

- Use deprecated `@google/generative-ai` package
- Use deprecated embedding models (`text-embedding-004/005`)
- Retry on 4xx errors (except 429)
- Store API keys in code

## BMe-Specific Patterns

### Voice Service Integration

```typescript
// backend/src/services/voice.ts
import { GoogleGenAI, Type } from '@google/genai';
import { VOICE_TOOLS } from '../../voice/tools.js';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function understand(text: string): Promise<Action[]> {
  const model = genai.models.get('gemini-2.0-flash');
  
  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text }] }],
    systemInstruction: VOICE_PROMPT,
    tools: [{ functionDeclarations: VOICE_TOOLS }],
  });
  
  return response.functionCalls() || [];
}
```

### Embedding Service

```typescript
// backend/src/services/embeddings.ts
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const EMBEDDING_MODEL = 'gemini-embedding-001';

let embeddingModel: ReturnType<typeof genai.models.get> | null = null;

function getEmbeddingClient() {
  if (!embeddingModel) {
    embeddingModel = genai.models.get(EMBEDDING_MODEL);
  }
  return embeddingModel;
}

export async function embed(text: string): Promise<number[]> {
  const model = getEmbeddingClient();
  const result = await model.embedContent(text);
  
  if (!result.embedding?.values) {
    throw new Error('Invalid embedding response');
  }
  
  return result.embedding.values;
}
```

## Environment Variables

```bash
# Required
GEMINI_API_KEY=your-api-key

# Optional (defaults shown)
GEMINI_MODEL=gemini-2.0-flash
EMBEDDING_MODEL=gemini-embedding-001
```

## Debugging

### Check Model Availability

```typescript
const models = await genai.models.list();
console.log(models.map(m => m.name));
```

### Log API Calls

```typescript
const response = await model.generateContent(request);
logger.debug({
  model: 'gemini-2.0-flash',
  promptTokens: response.usageMetadata?.promptTokenCount,
  responseTokens: response.usageMetadata?.candidatesTokenCount,
}, 'Gemini API call');
```
