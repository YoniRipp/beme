---
name: sql-optimization
description: PostgreSQL and pgvector query optimization for BMe. Use when analyzing slow queries, adding indexes, or optimizing database performance.
---

# SQL Optimization Skill

Production patterns for PostgreSQL query optimization in BMe, including pgvector for semantic search.

## When to Use

- Analyzing slow database queries
- Adding or optimizing indexes
- Optimizing N+1 query patterns
- Working with pgvector similarity search
- Improving connection pool usage

## Query Analysis

### EXPLAIN ANALYZE

Always analyze slow queries with `EXPLAIN ANALYZE`:

```sql
EXPLAIN ANALYZE
SELECT * FROM food_entries
WHERE user_id = '123'
AND created_at > NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Key Metrics to Check

| Metric | Ideal | Problem |
|--------|-------|---------|
| Seq Scan | Small tables only | Large table full scan |
| Index Scan | Most queries | Missing on filtered columns |
| Nested Loop | Few rows | Large row counts |
| Sort | Has index support | External sort (slow) |

### Enable Query Statistics

```sql
-- Enable pg_stat_statements
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Find slow queries
SELECT query, calls, mean_time, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

## Indexing Strategies

### B-Tree Indexes (Default)

For equality and range queries:

```sql
-- Single column (most common)
CREATE INDEX idx_food_user ON food_entries(user_id);

-- Composite index (column order matters!)
CREATE INDEX idx_food_user_date ON food_entries(user_id, created_at DESC);

-- Partial index (for filtered queries)
CREATE INDEX idx_active_users ON users(id) WHERE is_active = true;
```

### When to Use Composite Indexes

```sql
-- Query pattern
WHERE user_id = ? AND created_at > ?

-- Index should match: leftmost columns first
CREATE INDEX idx_user_created ON table(user_id, created_at);

-- NOT effective for:
WHERE created_at > ?  -- Missing leading column
```

### Covering Indexes

Include all columns needed to avoid table lookup:

```sql
-- Query needs user_id, name, calories
CREATE INDEX idx_food_covering ON food_entries(user_id, created_at)
INCLUDE (name, calories);
```

## pgvector Optimization

### Vector Index Types

| Index | Best For | Trade-off |
|-------|----------|-----------|
| IVFFlat | Balanced | Good recall, moderate speed |
| HNSW | Speed-critical | Faster, higher memory |

### IVFFlat Index

```sql
-- Create index (lists = sqrt(rows) to 2*sqrt(rows))
CREATE INDEX ON food_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Set probes at query time (more = better recall, slower)
SET ivfflat.probes = 10;

SELECT * FROM food_embeddings
ORDER BY embedding <=> $1
LIMIT 5;
```

### HNSW Index

```sql
-- Higher m = better recall, more memory
-- Higher ef_construction = better quality, slower build
CREATE INDEX ON food_embeddings
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Set ef_search at query time
SET hnsw.ef_search = 100;
```

### Vector Query Optimization

```sql
-- Always use ORDER BY with LIMIT for index usage
SELECT id, name, embedding <=> $1 AS distance
FROM food_embeddings
WHERE user_id = $2
ORDER BY embedding <=> $1
LIMIT 10;

-- Pre-filter to reduce search space
SELECT * FROM food_embeddings
WHERE user_id = $1
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY embedding <=> $2
LIMIT 5;
```

## N+1 Query Prevention

### Problem Pattern

```typescript
// BAD: N+1 queries
const users = await pool.query('SELECT * FROM users LIMIT 100');
for (const user of users.rows) {
  const foods = await pool.query(
    'SELECT * FROM food_entries WHERE user_id = $1',
    [user.id]
  );
}
```

### Solution: JOIN

```typescript
// GOOD: Single query with JOIN
const result = await pool.query(`
  SELECT u.*, json_agg(f.*) as food_entries
  FROM users u
  LEFT JOIN food_entries f ON f.user_id = u.id
  GROUP BY u.id
  LIMIT 100
`);
```

### Solution: IN Clause

```typescript
// GOOD: Batch fetch
const users = await pool.query('SELECT * FROM users LIMIT 100');
const userIds = users.rows.map(u => u.id);

const foods = await pool.query(
  'SELECT * FROM food_entries WHERE user_id = ANY($1)',
  [userIds]
);

// Group in application
const foodsByUser = groupBy(foods.rows, 'user_id');
```

## Connection Pool Optimization

### Pool Configuration

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,   // Close idle connections
  connectionTimeoutMillis: 2000, // Fail fast
});
```

### Best Practices

```typescript
// DO: Use pool.query for simple queries
const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);

// DO: Use transactions for multiple operations
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('INSERT INTO ...');
  await client.query('UPDATE ...');
  await client.query('COMMIT');
} catch (e) {
  await client.query('ROLLBACK');
  throw e;
} finally {
  client.release(); // Always release!
}
```

## Common BMe Query Patterns

### Dashboard Aggregations

```sql
-- Efficient daily summary
SELECT 
  date_trunc('day', created_at) as day,
  SUM(calories) as total_calories,
  COUNT(*) as entries
FROM food_entries
WHERE user_id = $1
  AND created_at >= $2
  AND created_at < $3
GROUP BY date_trunc('day', created_at)
ORDER BY day;

-- Index for this pattern
CREATE INDEX idx_food_user_created ON food_entries(user_id, created_at);
```

### Recent Items

```sql
-- Get recent with pagination
SELECT * FROM food_entries
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- Index supports ORDER BY
CREATE INDEX idx_food_recent ON food_entries(user_id, created_at DESC);
```

### Semantic Food Search

```sql
-- Find similar foods
SELECT id, name, 1 - (embedding <=> $1) as similarity
FROM food_embeddings
WHERE user_id = $2
ORDER BY embedding <=> $1
LIMIT 5;
```

## Query Optimization Checklist

### Before Deploying

- [ ] Run EXPLAIN ANALYZE on new queries
- [ ] Check for Seq Scans on large tables
- [ ] Verify indexes support WHERE/ORDER BY columns
- [ ] Test with production-like data volume
- [ ] Check for N+1 patterns in ORM/service code

### Index Maintenance

```sql
-- Check index usage
SELECT relname, idx_scan, seq_scan
FROM pg_stat_user_tables
ORDER BY seq_scan DESC;

-- Find unused indexes
SELECT indexrelname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0;

-- Rebuild bloated indexes
REINDEX INDEX CONCURRENTLY index_name;
```

### Vacuuming

```sql
-- Check for bloat
SELECT relname, n_dead_tup, last_vacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

-- Manual vacuum if needed
VACUUM ANALYZE table_name;
```

## Performance Anti-Patterns

### Avoid

```sql
-- Function on indexed column (no index use)
WHERE LOWER(name) = 'rice'  -- Bad
WHERE name ILIKE 'rice'     -- Use expression index instead

-- OR conditions (hard to index)
WHERE user_id = $1 OR category = $2  -- Bad
-- Use UNION instead

-- SELECT * when you only need specific columns
SELECT * FROM large_table   -- Bad
SELECT id, name FROM large_table  -- Good

-- OFFSET for deep pagination
OFFSET 10000  -- Very slow
-- Use keyset pagination instead
```

### Keyset Pagination

```sql
-- Instead of OFFSET
SELECT * FROM food_entries
WHERE user_id = $1
  AND (created_at, id) < ($2, $3)  -- Last seen values
ORDER BY created_at DESC, id DESC
LIMIT 20;
```

## Debugging Tools

### In Application

```typescript
// Log slow queries
pool.on('query', (query) => {
  const start = Date.now();
  query.on('end', () => {
    const duration = Date.now() - start;
    if (duration > 100) {
      logger.warn({ query: query.text, duration }, 'Slow query');
    }
  });
});
```

### In PostgreSQL

```sql
-- Enable slow query logging
ALTER SYSTEM SET log_min_duration_statement = 100;
SELECT pg_reload_conf();
```
