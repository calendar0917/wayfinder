# Logging Guidelines

> How logging is done in this project.

---

## Overview

This project uses **plain `console.log`, `console.warn`, and `console.error`**. No external logging library (no pino, no winston, no log4js). Logs go to stdout/stderr and are captured by the Docker runtime.

All log messages use a structured **prefix convention** to identify the source module.

---

## Log Levels

| Level | Console method | When to use |
|-------|---------------|-------------|
| **error** | `console.error(...)` | Failures that need attention: AI API errors, file I/O failures, git commit failures, unhandled exceptions |
| **warn** | `console.warn(...)` | Recoverable issues or unusual conditions: failed login attempts, stale cache, degraded functionality |
| **info** | `console.log(...)` | Important state transitions: server startup, config changes, git commits, AI tool executions |

`console.debug` is **not used**. Use `console.log` for everything that is not a warning or error.

---

## Structured Logging

Log messages use plain text with a bracketed prefix indicating the source module:

```
[config] No settings.yaml found, using defaults
[config] Config updated via PUT /api/config
[ai] Tool executed: add_bookmark - GitHub
[ai] Provider error: timeout after 30s
[git] Committed: ai: add_bookmark - GitHub (2026-05-07T12:00:00)
[system] CPU: 23.5%, Memory: 50.0%, Temp: 45.0C
[auth] Failed login attempt
[api] GET /api/config 200 (45ms)
```

### Recognized prefixes

| Prefix | Source module(s) |
|--------|-----------------|
| `[config]` | `src/lib/config.ts` |
| `[ai]` | `src/lib/ai-provider.ts`, `src/lib/ai-tools.ts`, AI-related route handlers |
| `[git]` | `src/lib/git.ts` |
| `[system]` | `src/lib/system-resources.ts` |
| `[auth]` | `src/lib/auth.ts`, auth route handlers |
| `[api]` | Generic API route handlers (for request/response logging) |
| `[weather]` | `src/lib/weather.ts` |

---

## What to Log

Always log these events:

- **Server startup** -- Log when the server is ready (Next.js does this by default; add custom startup logs if needed)
- **Config mutations** -- Every call to `writeConfig()` should log what changed
- **AI tool executions** -- Log the tool name and its key arguments (with **secrets redacted**)
  ```
  [ai] Tool executed: add_bookmark name="GitHub" url="https://github.com"
  ```
- **AI API errors** -- Log the full error from the provider for debugging
- **Git commits** -- `gitCommit()` already logs on success and failure
- **Failed login attempts** -- Log at warn level (credential verification failure, not 401 from middleware)

---

## What NOT to Log

These must **never** appear in log output:

| Sensitive field | Location | Redaction |
|----------------|----------|-----------|
| `apiKey` | `settings.yaml` | Replace with `"***"` |
| `passwordHash` | `settings.yaml` | Replace with `"***"` |
| Auth cookies | HTTP headers | Never log cookie values |
| Full config object | API responses, server-side | Redact secrets before logging |

**Never log on every request:**

- Do **not** log every `GET /api/system` call (polls every 3 seconds)
- Do **not** log the full config object on every read
- Do **not** log every successful request (a full access log is unnecessary for a single-user dashboard)

---

## Redaction Helper

Use this pattern when logging config-related data:

```typescript
function redactSecrets(config: Config): Config {
  return {
    ...config,
    settings: {
      ...config.settings,
      apiKey: config.settings.apiKey ? "***" : "",
      passwordHash: config.settings.passwordHash ? "***" : "",
    },
  };
}

// Usage:
console.log("[config] Config updated:", redactSecrets(config));
```

Apply the same redaction before returning config in API responses (`GET /api/config`, `PUT /api/config`).

---

## Common Mistakes

1. **Logging config without redaction** -- This is the most dangerous mistake. If `apiKey` or `passwordHash` appear in Docker logs, they are exposed to anyone with log access.

   ```typescript
   // Bad: secrets exposed
   console.log("[config] Updated:", config);

   // Good: secrets redacted
   console.log("[config] Updated:", redactSecrets(config));
   ```

2. **Logging every API request** -- System resource polling hits `/api/system` every 3 seconds. Logging each call would flood the logs. Limit request logs to mutations (POST/PUT/DELETE) and errors.

3. **Using `console.debug`** -- The project does not use debug-level logging. Use `console.log` for everything below warn. This keeps the mental model simple.

4. **Logging `err.stack` in production** -- Stack traces should go to `console.error`, which is fine for Docker logs, but never include them in API responses. `console.error` with the full error object is acceptable for server-side debugging.

5. **Silent failures in background operations** -- If a non-critical operation fails (e.g., git commit), log it at error level even if you don't throw. An error that is never logged is an error that cannot be debugged.

   ```typescript
   // Bad: silent failure
   try { gitCommit(msg); } catch {}

   // Good: logged failure
   try {
     gitCommit(msg);
   } catch (err) {
     console.error("[git] Commit failed:", err);
   }
   ```