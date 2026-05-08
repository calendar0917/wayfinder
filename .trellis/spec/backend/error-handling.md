# Error Handling

> How errors are handled and returned in this project.

---

## Overview

Errors follow a consistent pattern across all API routes. The project does not use custom error classes -- it distinguishes errors by type-checking (e.g., `instanceof ZodError`) and maps them to appropriate HTTP status codes.

Errors at the lib level throw native `Error` objects. Route handlers catch them and translate into the standard API response format.

---

## Error Types

No custom error classes are defined. Use standard JavaScript types:

- **`Error`** -- for expected operational failures (file I/O, API failures)
- **`ZodError`** -- thrown by `configSchema.parse()` on validation failure
- **Node.js errors** -- `ENOENT`, `EACCES`, etc. (check `err.code`)

---

## Error Handling Patterns

### Route handler pattern

Every route handler follows this structure:

```typescript
import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse and validate input
    const body = await request.json();

    // 2. Delegate to lib
    const result = await someLibFunction(body);

    // 3. Return success
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: err.errors },
        { status: 400 }
      );
    }
    console.error("[api] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Lib-level pattern

Library functions throw errors rather than returning error objects. Let the route handler decide the HTTP status code:

```typescript
// src/lib/config.ts
export async function readConfig(): Promise<Config> {
  try {
    const raw = await readFile("data/settings.yaml", "utf-8");
    const parsed = parseYaml(raw);
    return configSchema.parse(parsed);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      console.log("[config] No settings.yaml found, using defaults");
      return DEFAULT_CONFIG;  // Graceful fallback
    }
    // ZodError, YAML parse error, permission error -- propagate to caller
    throw err;
  }
}
```

### AI API error pattern

AI provider failures are wrapped for consistent reporting:

```typescript
// In an AI route handler or lib function
try {
  const response = await openai.chat.completions.create(params);
} catch (err) {
  console.error("[ai] Provider error:", err);
  return NextResponse.json(
    { error: "AI service unavailable", details: { message: (err as Error).message } },
    { status: 500 }
  );
}
```

---

## API Error Responses

All routes return errors in this format:

```json
{
  "error": "Human-readable error message",
  "details": {}
}
```

`details` is optional and only included when there is useful diagnostic information (e.g., Zod field errors, upstream API error messages).

### HTTP Status Code Table

| Status | When to use | Example |
|--------|------------|---------|
| **400** | Zod validation failure, malformed request body | `configSchema.parse()` throws `ZodError` |
| **401** | Missing or invalid auth cookie | `middleware.ts` blocks unauthenticated request |
| **404** | Resource not found | Requested bookmark that does not exist |
| **500** | Unexpected server errors | AI API failure, file I/O error, unhandled exception |

### Status code examples

```typescript
// 400 - Validation failure
if (err instanceof ZodError) {
  return NextResponse.json(
    { error: "Validation failed", details: err.errors },
    { status: 400 }
  );
}

// 401 - Auth failure (handled by middleware.ts)
// middleware.ts returns 401 if auth cookie is invalid

// 404 - Not found
const bookmark = findBookmark(config, name);
if (!bookmark) {
  return NextResponse.json(
    { error: `Bookmark '${name}' not found` },
    { status: 404 }
  );
}

// 500 - Internal server error
catch (err) {
  console.error("[api] Unexpected error:", err);
  return NextResponse.json(
    { error: "Internal server error" },
    { status: 500 }
  );
}
```

---

## Forbidden

- **Swallowing errors silently** -- Every `catch` block must either handle the error (return a response) or log it. Never use `catch {}` or `catch (err) { /* ignore */ }`.

- **Exposing stack traces to clients** -- Never include `err.stack` in API responses. Production errors should return clean messages. Stack traces are for server-side logs only.

- **Throwing non-Error values** -- Always `throw new Error("message")`, never `throw "something broke"` or `throw 404`. String/number throws make type-checking and stack traces unreliable.

- **Returning 200 for errors** -- Never return `{ error: "..." }` with status 200. Use the correct HTTP status code.

---

## Common Mistakes

1. **Not distinguishing `ZodError` from other errors** -- Zod validation failures must return 400 with field-level details. Catching them generically as 500s hides useful information from the client.

   ```typescript
   // Bad: ZodError treated as 500
   catch (err) {
     return NextResponse.json({ error: "Failed" }, { status: 500 });
   }

   // Good: ZodError gets 400
   catch (err) {
     if (err instanceof ZodError) {
       return NextResponse.json(
         { error: "Validation failed", details: err.errors },
         { status: 400 }
       );
     }
     return NextResponse.json({ error: "Internal error" }, { status: 500 });
   }
   ```

2. **Not handling missing config file on first run** -- `readConfig()` must catch `ENOENT`. The first request to a fresh deployment will find no `data/settings.yaml`. Return defaults, do not crash.

3. **Swallowing AI API errors** -- When the AI provider returns an error (rate limit, auth failure, timeout), the API route must return a 500 with a meaningful message. Hiding the error and returning an empty response confuses the frontend.

4. **Throwing in async route handlers without try/catch** -- Next.js App Router does **not** automatically catch errors in route handlers. Every exported handler function must wrap its body in try/catch, or errors will result in a generic 500 with no JSON body.