# Type Safety

> Type safety patterns in this project.

---

## Overview

This project uses **TypeScript in strict mode** with types that flow from a single source: **Zod schemas**. All configuration types are derived from Zod validation schemas using `z.infer`. Manual type definitions are forbidden when a Zod schema exists.

The principle: **validate at boundaries, infer everywhere else**. Parse incoming data at the edges of the system (API routes, config file reads), and let TypeScript propagate the correct types inward.

---

## Type Organization

Types are organized into two categories:

| Location | Purpose | Entry point |
|----------|---------|-------------|
| `src/lib/config-schema.ts` | Zod validation schemas (runtime validation) | Source of truth for all config-related types |
| `src/types/config.ts` | TypeScript types exported via `z.infer` (compile-time) | Imported by all components and hooks |

### Pattern: Zod Schema to TypeScript Type

```tsx
// src/lib/config-schema.ts
import { z } from "zod";

export const bookmarkSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
  icon: z.string().url().optional(),
  description: z.string().optional(),
  shortcut: z.string().optional(),
  tags: z.array(z.string()).optional(),
  server: z.string().optional(),
  container: z.string().optional(),
});

export const bookmarkGroupSchema = z.object({
  name: z.string().min(1),
  collapsed: z.boolean().default(false),
  bookmarks: z.array(bookmarkSchema),
  subgroups: z.array(z.lazy(() => bookmarkGroupSchema)).optional(),
});

export const configSchema = z.object({
  settings: z.object({
    title: z.string().default("Dashboard"),
    theme: z.enum(["light", "dark", "auto"]).default("auto"),
    layout: z.object({
      columns: z.number().int().min(1).max(6).default(3),
    }),
    search: z.object({
      engine: z.enum(["google", "duckduckgo", "bing", "custom"]).default("duckduckgo"),
      customUrl: z.string().optional(),
    }),
    passwordHash: z.string().optional(),
    ai: z.object({
      apiKey: z.string().optional(),
      apiBase: z.string().url().optional(),
      aiModel: z.string().optional(),
    }).optional(),
  }),
  widgets: z.array(z.discriminatedUnion("type", [
    z.object({ type: z.literal("datetime"), /* ... */ }),
    z.object({ type: z.literal("greeting"), /* ... */ }),
    z.object({ type: z.literal("weather"), /* ... */ }),
    z.object({ type: z.literal("resources"), /* ... */ }),
    z.object({ type: z.literal("logo"), /* ... */ }),
  ])),
  groups: z.array(bookmarkGroupSchema),
});
```

```tsx
// src/types/config.ts
// Types are ALWAYS derived from Zod schemas. NEVER write these by hand.
import type { z } from "zod";
import type {
  bookmarkSchema,
  bookmarkGroupSchema,
  configSchema,
} from "@/lib/config-schema";

export type Bookmark = z.infer<typeof bookmarkSchema>;
export type BookmarkGroup = z.infer<typeof bookmarkGroupSchema>;
export type DashboardConfig = z.infer<typeof configSchema>;
```

This means:
- **One place to change**: Update the Zod schema, and all types update automatically.
- **No drift**: TypeScript types can never diverge from the runtime validation.
- **No manual maintenance**: Adding a field to the schema adds it to the type automatically.

---

## Validation at Boundaries

All data entering the system must be validated at the boundary. Data flowing within the system can be trusted (TypeScript ensures correctness).

| Boundary | What Happens | File |
|----------|-------------|------|
| **Config read** (disk) | `configSchema.parse(rawYaml)` -- throws on invalid config | `src/lib/config.ts` |
| **Config write** (API) | `configSchema.parse(requestBody)` in PUT handler | `src/app/api/config/route.ts` |
| **API requests** | Zod schemas in route handlers validate request bodies | `src/app/api/ai/chat/route.ts` |
| **AI tool execution** | Tool argument schemas validate AI-generated args before executing | `src/lib/ai-tools.ts` |
| **Weather API response** | Zod schema parses Open-Meteo response, stripping unknown fields | `src/lib/weather.ts` |
| **System resources** | Fixed shape from `/proc` reader, typed interface (no Zod needed) | `src/lib/system-resources.ts` |

```tsx
// Example: API route validates request body at the boundary
// src/app/api/config/route.ts
import { configSchema } from "@/lib/config-schema";
import { readConfig, writeConfig } from "@/lib/config";

export async function PUT(request: Request) {
  const body = await request.json();
  // Parse throws ZodError with detailed message if invalid
  const config = configSchema.parse(body);
  await writeConfig(config);
  return Response.json(config);
}
```

```tsx
// Example: AI tool validates arguments before execution
// src/lib/ai-tools.ts
import { z } from "zod";

const addBookmarkArgs = z.object({
  groupName: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url(),
  icon: z.string().url().optional(),
});

function addBookmark(rawArgs: unknown) {
  const args = addBookmarkArgs.parse(rawArgs); // validates + narrows to correct type
  // args is now typed as { groupName: string; name: string; url: string; icon?: string }
  // ... execute the tool
}
```

---

## Common Patterns

### Type Guards for Discriminated Unions

AI streaming responses use discriminated unions. Type guards narrow the type based on the `type` field:

```tsx
// src/components/ai/types.ts
export interface TextEvent {
  type: "text";
  content: string;
}

export interface ToolCallEvent {
  type: "tool_call";
  toolName: string;
  toolArgs: Record<string, unknown>;
}

export interface DoneEvent {
  type: "done";
}

export type SSEEvent = TextEvent | ToolCallEvent | DoneEvent;

// Type guard
export function isToolCallEvent(event: SSEEvent): event is ToolCallEvent {
  return event.type === "tool_call";
}

// Usage in the SSE reader
function processSSEEvent(event: SSEEvent) {
  if (isToolCallEvent(event)) {
    // TypeScript narrows event to ToolCallEvent here
    executeTool(event.toolName, event.toolArgs);
  } else if (event.type === "text") {
    // TypeScript narrows event to TextEvent here
    appendMessage(event.content);
  }
  // event.type === "done" -- no action needed
}
```

---

## Forbidden Patterns

### 1. `any` Type

Never use `any`. It disables all type checking. If you truly don't know the type, use `unknown`, which forces you to narrow before using the value.

```tsx
// BAD
function handleResponse(data: any) {
  console.log(data.name); // no error if name doesn't exist
}

// GOOD
function handleResponse(data: unknown) {
  // Must narrow first
  if (typeof data === "object" && data !== null && "name" in data) {
    console.log((data as { name: unknown }).name);
  }
}
```

### 2. Type Assertions (`as`)

Avoid `as` casts. They override TypeScript's type checker and hide bugs. If you need to assert, it usually means validation is missing at a boundary.

```tsx
// BAD: Type assertion on API response
const data = await fetch("/api/config").then(r => r.json()) as DashboardConfig;
// If the API returns a different shape, this silently fails.

// GOOD: Validate with Zod at the boundary
import { configSchema } from "@/lib/config-schema";
const raw = await fetch("/api/config").then(r => r.json());
const data = configSchema.parse(raw); // throws with details if shape is wrong
```

### 3. `@ts-ignore` / `@ts-expect-error`

Never suppress TypeScript errors. Fix the underlying type issue instead. If a legitimate type gap exists, use `@ts-expect-error` (never `@ts-ignore`) with a comment explaining why, and file a ticket to fix it properly.

```tsx
// BAD: Suppressing an error without understanding it
// @ts-ignore
const result = someUntypedLibrary.doThing();

// ACCEPTABLE BUT RARE: Explicit suppression with explanation
// @ts-expect-error -- Third-party library has incorrect types; PR submitted upstream
const result = someUntypedLibrary.doThing();
```

### 4. Manual Type Duplication

Never write TypeScript types by hand when a Zod schema exists. Duplication is the root of drift.

```tsx
// BAD: Manually maintaining a type that mirrors a Zod schema
// src/types/config.ts
export interface Bookmark {
  name: string;
  url: string;
  icon?: string;
  description?: string;
  shortcut?: string;
  tags?: string[];
  server?: string;
  container?: string;
}
// When the Zod schema changes, this MUST be updated manually. It WILL be forgotten.

// GOOD: Derived from Zod
// src/types/config.ts
import type { z } from "zod";
import type { bookmarkSchema } from "@/lib/config-schema";
export type Bookmark = z.infer<typeof bookmarkSchema>;
```

---

## Common Mistakes

1. **Type assertions on API responses**: Writing `as DashboardConfig` after `fetch().then(r => r.json())` instead of passing the response through `configSchema.parse()`. The API might return an unexpected shape after a deployment or bug -- Zod catches this, `as` does not.

2. **Writing types by hand when a Zod schema exists**: Any time you manually write `interface Bookmark { ... }` or `type Bookmark = { ... }` when `bookmarkSchema` already defines those fields, you are duplicating and will eventually create drift.

3. **Using `any` for "type it later"**: Temporary `any` types have a way of becoming permanent. Use `unknown` and write a minimal type guard. The friction is intentional -- it reminds you to handle the unknown case.

4. **Not exporting props interfaces**: Component props must be exported so parent components and test files can reference them. `export interface BookmarkCardProps { ... }`.

5. **Overly generic types**: Avoid `Record<string, any>` or `Record<string, unknown>`. Define a specific type or Zod schema. If the shape is truly dynamic, use `unknown` and narrow at the point of use.
