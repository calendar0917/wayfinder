# Database Guidelines

> This project has no database. Configuration is persisted as a single YAML file on disk.

---

## Overview

All application state lives in `data/settings.yaml`. There is no SQL database, no ORM, no in-memory store (except short-lived caches for system resources). The YAML file **is** the database.

Three library modules manage the data lifecycle:

| Module | Responsibility |
|--------|---------------|
| `src/lib/config.ts` | Read and write the YAML file |
| `src/lib/config-schema.ts` | Zod schemas for validation |
| `src/lib/git.ts` | Auto-commit on every mutation |

---

## Read Pattern

`readConfig()` is the **only** way to load configuration. It handles missing files gracefully by returning defaults.

```typescript
// src/lib/config.ts
import { readFile } from "fs/promises";
import { parse as parseYaml } from "yaml";
import { configSchema } from "./config-schema";
import { DEFAULT_CONFIG } from "./config-schema";

export async function readConfig(): Promise<Config> {
  try {
    const raw = await readFile("data/settings.yaml", "utf-8");
    const parsed = parseYaml(raw);
    return configSchema.parse(parsed);   // Validate against Zod schema
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      // First run: no config file yet, return defaults
      console.log("[config] No settings.yaml found, using defaults");
      return DEFAULT_CONFIG;
    }
    throw err;  // Re-throw parse errors, permission errors, etc.
  }
}
```

**Key points:**

- Always validate through `configSchema.parse()` -- never trust raw YAML
- `ENOENT` (file not found) is an expected case on first run; return defaults, do not throw
- Any other error (invalid YAML syntax, schema mismatch, permission denied) propagates up

---

## Write Pattern

`writeConfig()` is the **only** way to persist configuration changes. It validates before writing.

```typescript
// src/lib/config.ts
import { writeFile } from "fs/promises";
import { stringify as stringifyYaml } from "yaml";

export async function writeConfig(config: Config): Promise<void> {
  const validated = configSchema.parse(config);  // Validate first
  const yaml = stringifyYaml(validated, null, 2); // Pretty-print with 2-space indent
  await writeFile("data/settings.yaml", yaml, "utf-8");
}
```

**Key points:**

- Validation happens **before** the write -- invalid config never touches disk
- The Zod schema is the gatekeeper for all data entering the system
- YAML is pretty-printed for human readability (the file is also an audit log)

---

## Git Commit Pattern

Every config mutation **must** be followed by a `gitCommit()` call. This creates an audit trail and enables rollback.

```typescript
// src/lib/git.ts
import { execSync } from "child_process";

export function gitCommit(message: string): void {
  const timestamp = new Date().toISOString().slice(0, 19);
  try {
    execSync(`git add data/settings.yaml`, { cwd: process.cwd() });
    execSync(`git commit -m "${message} (${timestamp})"`, { cwd: process.cwd() });
    console.log("[git] Committed:", message);
  } catch (err) {
    console.error("[git] Commit failed:", err);
    // Non-fatal: config is already written, commit failure is logged but not thrown
  }
}
```

**Key points:**

- `gitCommit` is fire-and-forget -- if the config is written but the commit fails, the config is still saved
- Commit failures are logged as errors but do **not** throw (to avoid blocking the response)
- Commit messages include a human-readable action description (e.g., `"ai: add_bookmark - GitHub"`)
- The `data/` directory is a separate git repository; commits only affect config history

---

## Transactions

There is no traditional transaction system. Data consistency is enforced by:

1. **Zod validation** before every write -- the schema is the consistency check
2. **Last-write-wins** for concurrent access -- no optimistic locking, no version numbers
3. **Atomic file write** -- `writeFile` with a string is atomic on Linux (rename-after-write internally in some patterns, but Node.js `writeFile` on the same file path is generally safe for single-process access)

If two requests modify config simultaneously, the last one to call `writeConfig()` wins. This is acceptable for a single-user dashboard where concurrent mutations are rare.

---

## Rollback

Since every config mutation is git-committed, rollback is done via git:

```bash
# View history
curl /api/git?limit=20

# Revert to a previous commit
cd data/
git revert <commit-hash>
```

The `GET /api/git` endpoint exposes the commit log for inspection. The actual revert is a manual operation (no API endpoint for destructive rollback).

---

## Naming Conventions

| What | Convention | Example |
|------|-----------|---------|
| Config file | `data/settings.yaml` (fixed path) | -- |
| Zod schema variable | `camelCase` | `configSchema`, `bookmarkSchema` |
| YAML keys | `camelCase` | `passwordHash`, `apiBase`, `aiModel` |
| Zod inferred types | `PascalCase` | `Config`, `Bookmark`, `Widget` |

---

## Common Mistakes

1. **Bypassing `writeConfig()`** -- Never use `fs.writeFile` directly to write `data/settings.yaml`. Always go through `writeConfig()` so validation runs and the schema stays the source of truth.

2. **Not handling missing file** -- `readConfig()` must check for `ENOENT`. On first run or if the data volume is empty, no YAML file exists. Return sensible defaults, do not crash.

3. **Forgetting `gitCommit()`** -- Every mutation must be followed by `gitCommit()`. If you forget, you lose the audit trail for that change. AI tool executions in `src/app/api/ai/tools/route.ts` are especially prone to this.

4. **Writing raw config from API routes** -- API route handlers should never construct YAML or call `fs.writeFile`. Import `writeConfig` from `@/lib/config` and pass the validated object.

5. **Not validating after mutation** -- If you modify a config object in memory (e.g., pushing a bookmark into an array), pass the entire modified object through `configSchema.parse()` before calling `writeConfig()`. Partial mutations can introduce invalid state.

6. **Modifying config in-place without committing** -- `readConfig()` returns the parsed object. If you mutate that object and don't call `writeConfig()` + `gitCommit()`, changes are lost on next read.