---
name: code-review
description: Code review checklists for BMe. Use when reviewing PRs, checking security, or auditing performance.
---

# Code Review Skill

Comprehensive code review checklists for BMe covering security, performance, accessibility, and best practices.

## When to Use

- Reviewing pull requests
- Auditing code for security issues
- Checking performance implications
- Ensuring accessibility compliance
- Validating best practices

## Security Review Checklist

### Authentication & Authorization

- [ ] JWT tokens are validated on all protected endpoints
- [ ] Token expiration is enforced
- [ ] Refresh token rotation is implemented
- [ ] `authenticate` middleware is applied to protected routes
- [ ] `requirePro` middleware is used for premium features
- [ ] User can only access their own data (proper ownership checks)

```typescript
// Good: Ownership check
const food = await foodModel.findById(id);
if (food.userId !== req.user.id) {
  throw new ForbiddenError();
}

// Bad: No ownership check
const food = await foodModel.findById(id);
res.json(food);
```

### Input Validation

- [ ] All user inputs are validated with Zod schemas
- [ ] SQL queries use parameterized queries (no string concatenation)
- [ ] File uploads validate type and size
- [ ] URL parameters are validated

```typescript
// Good: Parameterized query
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Bad: SQL injection risk
await pool.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

### Data Protection

- [ ] Passwords are hashed with bcrypt (12+ rounds)
- [ ] Sensitive data is not logged (passwords, tokens, PII)
- [ ] API responses don't leak sensitive fields
- [ ] Error messages don't expose internal details in production

```typescript
// Good: Redact sensitive fields
const { password, ...safeUser } = user;
res.json(safeUser);

// Bad: Exposing password hash
res.json(user);
```

### Security Headers

- [ ] CORS is properly configured
- [ ] Helmet middleware is applied
- [ ] Content-Security-Policy is set
- [ ] Rate limiting on authentication endpoints

### Common Vulnerabilities

| Vulnerability | Check |
|--------------|-------|
| XSS | React auto-escapes, avoid `dangerouslySetInnerHTML` |
| CSRF | SameSite cookies, CORS configured |
| SQL Injection | Parameterized queries only |
| Path Traversal | Validate file paths |
| Mass Assignment | Use explicit allowlists for updates |

## Performance Review Checklist

### Database

- [ ] Queries have appropriate indexes
- [ ] N+1 queries are avoided (use JOINs or batch fetches)
- [ ] Pagination is implemented for list endpoints
- [ ] Large result sets are limited
- [ ] Transactions are used for multi-step operations

```typescript
// Good: Batch fetch
const userIds = orders.map(o => o.userId);
const users = await pool.query(
  'SELECT * FROM users WHERE id = ANY($1)',
  [userIds]
);

// Bad: N+1 queries
for (const order of orders) {
  const user = await pool.query(
    'SELECT * FROM users WHERE id = $1',
    [order.userId]
  );
}
```

### API Response

- [ ] Response size is reasonable (no large payloads)
- [ ] Unnecessary fields are excluded
- [ ] Caching headers are set where appropriate
- [ ] Compression is enabled

### Frontend

- [ ] Components are memoized where beneficial
- [ ] useCallback/useMemo used for expensive operations
- [ ] Images are optimized and lazy-loaded
- [ ] Code splitting for large components
- [ ] No unnecessary re-renders

```tsx
// Good: Memoized callback
const handleClick = useCallback(() => {
  doSomething(id);
}, [id]);

// Good: Memoized expensive computation
const sortedItems = useMemo(
  () => items.sort((a, b) => b.date - a.date),
  [items]
);
```

### React Query

- [ ] Appropriate staleTime configured
- [ ] Queries use proper keys
- [ ] Mutations invalidate relevant queries
- [ ] Error and loading states handled

## Accessibility Review Checklist

### Semantic HTML

- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Interactive elements use correct tags (button, a, input)
- [ ] Form inputs have associated labels
- [ ] Lists use ul/ol with li elements

```tsx
// Good: Semantic button
<button onClick={handleClick}>Save</button>

// Bad: Div as button
<div onClick={handleClick}>Save</div>
```

### ARIA

- [ ] Decorative images have empty alt or role="presentation"
- [ ] Meaningful images have descriptive alt text
- [ ] Dynamic content uses aria-live regions
- [ ] Modals have proper focus management

```tsx
// Good: Descriptive alt
<img src={user.avatar} alt={`${user.name}'s profile photo`} />

// Good: Decorative image
<img src={decoration.svg} alt="" role="presentation" />
```

### Keyboard Navigation

- [ ] All interactive elements are keyboard accessible
- [ ] Focus is visible (no outline: none without replacement)
- [ ] Tab order is logical
- [ ] Escape closes modals/dropdowns

### Color & Contrast

- [ ] Color is not the only indicator of state
- [ ] Text has sufficient contrast (4.5:1 for normal, 3:1 for large)
- [ ] Focus states are visible

## Code Quality Checklist

### TypeScript

- [ ] No `any` types (use `unknown` if needed)
- [ ] Interfaces/types are properly defined
- [ ] Null checks are handled
- [ ] Async errors are caught

```typescript
// Good: Proper typing
interface Food {
  id: string;
  name: string;
  calories?: number;
}

// Bad: Any type
const processFood = (food: any) => { ... };
```

### Error Handling

- [ ] Async functions have try/catch or .catch()
- [ ] Errors are logged with context
- [ ] User-friendly error messages are shown
- [ ] Errors don't crash the application

### Code Organization

- [ ] Files are in the correct directories
- [ ] Naming is consistent and descriptive
- [ ] Functions are focused (single responsibility)
- [ ] Magic numbers have named constants

### Testing

- [ ] New features have tests
- [ ] Edge cases are covered
- [ ] Tests are maintainable (not brittle)
- [ ] Mock data is realistic

## BMe-Specific Checks

### Voice Commands

- [ ] New intents are added to `backend/voice/tools.js`
- [ ] Executor handles new action types in `voiceExecutor.ts`
- [ ] Frontend executes new actions in `voiceActionExecutor.ts`
- [ ] Voice prompt in `voice.ts` describes new actions

### API Routes

- [ ] Route registered in `routes/index.ts`
- [ ] Controller uses `asyncHandler`
- [ ] Proper HTTP methods (GET for read, POST for create, etc.)
- [ ] Response format is consistent

### Database Changes

- [ ] Migration file created for schema changes
- [ ] Migration is reversible (down function)
- [ ] Indexes added for frequently queried columns
- [ ] Default values considered for new columns

## Review Process

### Before Reviewing

1. Read the PR description and linked issues
2. Understand the context and requirements
3. Check what files are changed

### During Review

1. Start with high-level architecture
2. Check for security issues
3. Review performance implications
4. Verify error handling
5. Check edge cases
6. Ensure tests are adequate

### Feedback Guidelines

```markdown
# Good feedback examples

## Blocking
Security: This query is vulnerable to SQL injection. 
Use parameterized queries instead.

## Suggestion
Performance: Consider adding an index on `user_id` 
for this query pattern.

## Question
Could you explain why we're not validating 
the email format here?

## Praise
Nice use of the Result type pattern here!
```

### Severity Levels

| Level | Description | Must Fix? |
|-------|-------------|-----------|
| Blocking | Security issue, bug, or breaking change | Yes |
| Major | Performance, maintainability concern | Yes |
| Minor | Style, naming, small improvements | Preferred |
| Nit | Personal preference, optional | No |

## Quick Reference

### Security Red Flags

- String concatenation in SQL
- `any` type on user input
- Missing authentication middleware
- Password/token in logs
- eval() or new Function()

### Performance Red Flags

- Queries in loops (N+1)
- Large arrays without pagination
- Missing indexes on filtered columns
- Unnecessary data in responses
- Blocking operations in request handlers

### Code Smell Red Flags

- Functions > 50 lines
- Deeply nested conditionals
- Duplicated code
- Magic numbers/strings
- Missing error handling
