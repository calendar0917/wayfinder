# Quality Guidelines

> Code quality standards for backend development.

---

## Overview

All backend code must pass TypeScript strict mode, follow the patterns established in existing modules, and include appropriate validation at every external boundary. Code review verifies these standards are met.

---

## Forbidden Patterns

### 1. The `any` type

Never use `any`. Use `unknown` for truly dynamic data and narrow with type guards or Zod.

```typescript
// Bad
function process(data: any) {
  return data.name;
}

// Good
function process(data: unknown) {
  const parsed = someSchema.parse(data);
  return parsed.name;
}
```

### 2. Direct file I/O bypassing `config.ts`

Never read or write `data/settings.yaml` directly. Always use `readConfig()` and `writeConfig()` from `src/lib/config.ts`.

```typescript
// Bad: bypasses validation and git commit
import { writeFile } from "fs/promises";
await writeFile("data/settings.yaml", someYamlString);

// Good: uses validated write path
import { writeConfig } from "@/lib/config";
import { gitCommit } from "@/lib/git";
await writeConfig(updatedConfig);
gitCommit("update: description of change");
```

### 3. Unvalidated external data

Every external input must pass through Zod validation before use. This includes:
- API request bodies (`request.json()`)
- Query parameters (`request.nextUrl.searchParams`)
- AI tool call arguments (validated against tool parameter schemas)
- YAML file contents (validated by `configSchema.parse()`)

```typescript
// Bad: trusting request body
const body = await request.json();
config.bookmarks.push(body);  // body could be anything

// Good: validate at the boundary
import { bookmarkSchema } from "@/lib/config-schema";
const body = await request.json();
const bookmark = bookmarkSchema.parse(body);
config.bookmarks.push(bookmark);
```

### 4. Blocking the event loop with synchronous I/O

Never use `fs.readFileSync`, `fs.writeFileSync`, or `execSync` inside API route handlers. These block the Node.js event loop and degrade performance for all concurrent requests.

```typescript
// Bad: sync I/O blocks the event loop
import { readFileSync } from "fs";
const raw = readFileSync("data/settings.yaml", "utf-8");

// Good: async I/O
import { readFile } from "fs/promises";
const raw = await readFile("data/settings.yaml", "utf-8");
```

**Exception**: `execSync` in `src/lib/git.ts` is acceptable because git commits are infrequent, fire-and-forget, and the Node.js `child_process` exec async API adds complexity for no benefit in this case. The sync call lasts milliseconds on a local git repo.

### 5. Throwing non-Error values

```typescript
// Bad
throw "Something went wrong";
throw 404;
throw { message: "error" };

// Good
throw new Error("Something went wrong");
```

### 6. Swallowing errors silently

```typescript
// Bad
try {
  await riskyOperation();
} catch {}

// Good
try {
  await riskyOperation();
} catch (err) {
  console.error("[module] Operation failed:", err);
  throw err; // or handle gracefully with a fallback
}
```

### 7. Exposing secrets in API responses or logs

```typescript
// Bad
return NextResponse.json(config);  // apiKey and passwordHash exposed

// Good
return NextResponse.json(redactSecrets(config));
```

---

## Required Patterns

### 1. Zod validation at every boundary

Every data entry point must pass through a Zod schema:

| Boundary | Schema | Location |
|----------|--------|----------|
| Config file read | `configSchema` | `src/lib/config-schema.ts` |
| Config file write | `configSchema` | `src/lib/config-schema.ts` |
| API request body | Endpoint-specific schemas | In route handler or dedicated schema file |
| AI tool arguments | Tool parameter schemas | `src/lib/ai-tools.ts` |
| Environment variables | (not used; config comes from YAML) | -- |

### 2. Single source of truth

`data/settings.yaml` is the **only** source of configuration state. Never duplicate config values into cookies, localStorage, environment variables, or in-memory caches as the primary store. Short-lived caches (e.g., system resource polling with 3s TTL) are acceptable when the cached value is derived from an external source, not from config.

### 3. Git commit on every mutation

Every write to `data/settings.yaml` must be followed by `gitCommit()`. This requirement applies to:
- Manual edits via `PUT /api/config`
- AI tool executions via `POST /api/ai/tools`
- Any future mutation endpoints

The commit message should describe what changed and who/what triggered it (e.g., `"manual edit"`, `"ai: add_bookmark - GitHub"`).

### 4. TypeScript strict mode

`tsconfig.json` must have `"strict": true`. All code must compile without errors. No `// @ts-ignore` or `// @ts-expect-error` comments unless accompanied by a comment explaining why it is the only option.

---

## Testing Requirements

### Unit tests

Required for these modules (test with `vitest` or `jest`):

- **`src/lib/config.ts`** -- Test `readConfig()` with existing file, missing file (ENOENT), invalid YAML, valid YAML. Test `writeConfig()` with valid and invalid config objects.
- **`src/lib/git.ts`** -- Test `gitCommit()` with a mock filesystem. Verify the correct commands are invoked.
- **`src/lib/config-schema.ts`** -- Test schema validation with valid and invalid objects. Test edge cases (empty arrays, missing required fields, wrong types).

### API route tests

Required for these endpoints:

- **`GET /api/config`** -- Returns config with secrets redacted
- **`PUT /api/config`** -- Validates and persists; returns 400 on invalid input
- **`POST /api/ai/tools`** -- Executes tool and commits; returns error for unknown tool
- **`POST /api/auth/login`** -- Returns 200 on correct password, 401 on wrong password

### Test structure

Tests go in a `__tests__/` directory adjacent to the module being tested, or in a top-level `tests/` directory. Follow the project's existing pattern.

---

## Code Review Checklist

Before approving a backend change, verify:

- [ ] No `any` types introduced
- [ ] All external inputs validated with Zod
- [ ] Config reads and writes go through `readConfig()` / `writeConfig()`
- [ ] Every config mutation followed by `gitCommit()`
- [ ] Secrets (`apiKey`, `passwordHash`) redacted in API responses and logs
- [ ] No sync I/O in async route handlers
- [ ] Errors return correct HTTP status codes (400/401/404/500)
- [ ] Error responses follow `{ error, details? }` format
- [ ] New files follow naming conventions (kebab-case for lib, `route.ts` for endpoints)
- [ ] No `console.debug` usage (use `console.log`)
- [ ] Log messages use the `[module]` prefix convention
- [ ] TypeScript compiles with `strict: true` and no `@ts-ignore`
- [ ] Tests cover the happy path and at least one error case