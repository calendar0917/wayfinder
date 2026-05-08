# Directory Structure

> How backend code is organized in this project.

---

## Overview

Backend code lives in two locations:

- **API Routes**: `src/app/api/` -- Next.js App Router route handlers (one `route.ts` per endpoint)
- **Library Modules**: `src/lib/` -- business logic, I/O, validation, and integrations
- **Type Definitions**: `src/types/` -- TypeScript types inferred from Zod schemas

The frontend (React Server Components + Client Components) is in `src/app/` (pages) and `src/components/`. The backend modules under `src/lib/` are shared by both API routes and Server Components during SSR.

---

## Directory Layout

```
src/
├── app/
│   └── api/
│       ├── config/
│       │   └── route.ts          # GET/PUT full config
│       ├── ai/
│       │   ├── chat/
│       │   │   └── route.ts      # POST streaming chat proxy
│       │   └── tools/
│       │       └── route.ts      # POST tool execution
│       ├── system/
│       │   └── route.ts          # GET system resources
│       ├── auth/
│       │   ├── login/
│       │   │   └── route.ts      # POST login
│       │   └── logout/
│       │       └── route.ts      # POST logout
│       └── git/
│           └── route.ts          # GET git log for rollback
├── lib/
│   ├── config.ts                 # YAML read/write (readConfig, writeConfig)
│   ├── config-schema.ts          # Zod validation schemas
│   ├── ai-provider.ts            # OpenAI-compatible client
│   ├── ai-tools.ts               # Function calling tool definitions
│   ├── git.ts                    # Git auto-commit (gitCommit)
│   ├── system-resources.ts       # /proc reader (CPU, memory, uptime, temp)
│   ├── weather.ts                # Open-Meteo API client
│   ├── auth.ts                   # bcrypt + httpOnly cookie management
│   └── search.ts                 # Search engine URL builders
└── types/
    └── config.ts                 # TypeScript types (inferred from Zod)
```

Data lives outside `src/`:

```
data/
└── settings.yaml                 # Single source of truth (Docker volume mount)
```

---

## Module Organization

### New API endpoints

When adding a new endpoint, create a directory under `src/app/api/<feature>/` with a single `route.ts` file. The directory name becomes the URL path segment:

```
# Good:
src/app/api/bookmarks/route.ts       →  /api/bookmarks

# Good (nested resource):
src/app/api/bookmarks/[id]/route.ts  →  /api/bookmarks/:id
```

Each `route.ts` exports named HTTP method handlers:

```typescript
// src/app/api/bookmarks/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // ...
}

export async function POST(request: NextRequest) {
  // ...
}
```

### New library modules

Add new `.ts` files under `src/lib/`. Each file should have a single responsibility. If a module grows too large, split it into related files under a subdirectory.

### Business logic placement

Route handlers should be thin -- validate input, call a lib function, return a response. Business logic belongs in `src/lib/` modules, not inline in route handlers:

```typescript
// Good: route handler delegates to lib
import { readConfig, writeConfig } from "@/lib/config";
import { gitCommit } from "@/lib/git";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const config = configSchema.parse(body);      // Validate
  await writeConfig(config);                     // Delegate to lib
  await gitCommit("manual update");               // Delegate to lib
  return NextResponse.json(config);
}

// Bad: business logic mixed into route handler
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const yaml = YAML.stringify(body);
  await fs.writeFile("data/settings.yaml", yaml); // Don't do this
  execSync("git add data/ && git commit -m 'update'");
  return NextResponse.json(body);
}
```

---

## Naming Conventions

| What | Convention | Examples |
|------|-----------|----------|
| API route files | `route.ts` (always) | `src/app/api/config/route.ts` |
| Library files | kebab-case | `config-schema.ts`, `ai-provider.ts`, `system-resources.ts` |
| Type files | kebab-case | `config.ts` (inside `src/types/`) |
| Exported functions | camelCase | `readConfig()`, `writeConfig()`, `gitCommit()` |
| Exported types/interfaces | PascalCase | `SettingsConfig`, `BookmarkGroup` |
| Zod schemas | camelCase (value) or PascalCase (type) | `const configSchema = z.object(...)` |
| API path segments | kebab-case | `/api/ai/chat`, `/api/system` |

Route handlers use standard Next.js exported function names: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`.

---

## Examples

Well-organized modules to use as reference when adding new code:

- **`src/lib/config.ts`** -- clean separation of read and write paths; handles file-not-found gracefully; delegates validation to `config-schema.ts`
- **`src/app/api/config/route.ts`** -- thin route handler: validate, delegate, respond
- **`src/lib/git.ts`** -- single-purpose module: one function (`gitCommit`) that operates on `data/`
- **`src/app/api/ai/tools/route.ts`** -- tool dispatch pattern: validate tool name, execute, commit, return result