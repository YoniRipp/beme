# `CORS_ORIGIN` supports a comma-separated list that the config schema then rejects

Status: **not started** — filed from the iOS simulator click sweep of 2026-09-14.
Severity: **high**. The backend refuses to start.

## The mismatch

`backend/src/config/index.ts` implements comma-separated origins, with a comment saying
so:

```ts
// backend/src/config/index.ts:116-124
const CORS_ORIGIN: string | string[] | boolean = (() => {
  if (rawCorsOrigin != null && rawCorsOrigin !== '') {
    // Support comma-separated origins (e.g. "https://app.example.com,https://staging.example.com")
    if (rawCorsOrigin.includes(',')) {
      return rawCorsOrigin.split(',').map(o => o.trim().replace(/\/+$/, ''));
    }
    return rawCorsOrigin;
  }
  …
```

The Zod schema a few lines above has no array branch:

```ts
// backend/src/config/index.ts:57-59
corsOrigin: isProduction
  ? z.string().min(1, 'CORS_ORIGIN must be set to an explicit origin in production')
  : z.union([z.string(), z.boolean(), z.undefined()]),
```

So the moment you use the documented comma syntax, the process dies at boot:

```
$ CORS_ORIGIN='capacitor://localhost,http://localhost:5173' npx tsx index.ts

/…/backend/src/config/index.ts:191
Error: corsOrigin: Invalid input
```

A single origin boots fine — verified both ways:

```
$ CORS_ORIGIN='capacitor://localhost' PORT=3001 npx tsx index.ts
{"corsOrigin":"capacitor://localhost", … ,"msg":"CORS configured"}
{"port":3001, … ,"msg":"TrackVibe backend listening"}
```

This bites in production too: the production branch is `z.string().min(1)`, which an
array also fails.

`cors()` itself accepts `string | string[] | RegExp | boolean`, so the runtime was always
fine — only the validation is wrong.

## Fix

Let the schema describe what the parser actually produces:

```diff
 corsOrigin: isProduction
-  ? z.string().min(1, 'CORS_ORIGIN must be set to an explicit origin in production')
-  : z.union([z.string(), z.boolean(), z.undefined()]),
+  ? z.union([z.string().min(1), z.array(z.string().min(1)).min(1)], { errorMap })
+  : z.union([z.string(), z.array(z.string()), z.boolean(), z.undefined()], { errorMap }),
```

Keep the production guard that rejects `true` / an empty value.

Three corrections to the block above, all confirmed while implementing:

1. `.min(1)`, not `.nonempty()`. `.nonempty()` adds a redundant `[string, ...string[]]` tuple
   to the exported union; `.min(1)` is the same runtime check and yields exactly
   `string | boolean | string[] | undefined`.
2. Every message must name `CORS_ORIGIN`. A bare union reports `Invalid input`. The union
   `errorMap` covers a value matching no member; the per-check messages inside the members
   cover Zod's "dirty" path, where a failed `.min()` inside a member is reported directly at
   `corsOrigin.<index>` and the union's `errorMap` never runs.
3. The schema change alone is not enough. The split needs `.filter(Boolean)` or a trailing
   comma becomes a *new* boot crash (`corsOrigin.2: ...at least 1 character`), and
   `frontendOrigin` must be derived from the first parsed origin or it silently keeps the
   whole list — see `plan.md` Tasks 3 and 4.

## Acceptance criteria

- [x] A comma-separated `CORS_ORIGIN` boots in development and in production mode
- [x] Each origin in the list is actually honoured by the `cors()` middleware
- [x] Production still refuses `CORS_ORIGIN=true` and an unset value
- [x] A config test covers the single, list, boolean and unset cases
