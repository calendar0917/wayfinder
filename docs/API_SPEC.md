# API Specification

All API routes are served by the Next.js App Router under `/api/`.

## Authentication

If `settings.passwordHash` is configured, all routes except those under `/api/auth/` require a valid auth cookie. The middleware at `middleware.ts` enforces this.

## Routes

### Config

#### GET /api/config

Returns the full configuration object. `passwordHash` and `apiKey` are redacted from the response.

**Response** `200 OK`:
```json
{
  "settings": {
    "title": "My Dashboard",
    "theme": "auto",
    "layout": { "columns": 4 },
    "search": { "engine": "duckduckgo", "customUrl": "" },
    "passwordHash": "***",
    "apiKey": "***",
    "apiBase": "https://api.openai.com/v1",
    "aiModel": "gpt-4o"
  },
  "widgets": [...],
  "groups": [...]
}
```

#### PUT /api/config

Replaces the full configuration. Validates with Zod before writing.

**Request body**: Full config object matching the YAML schema.

**Response** `200 OK`: The updated config (with redacted fields).

**Response** `400 Bad Request`: Validation error details.

---

### AI Chat

#### POST /api/ai/chat

Proxies a chat completion request to the OpenAI-compatible API configured in `settings.yaml`. Returns a streaming response with tool use interleaved.

**Request body**:
```json
{
  "messages": [
    {"role": "user", "content": "/add a bookmark for GitHub"}
  ],
  "systemPrompt": "You are a dashboard assistant..."
}
```

**Response**: `text/event-stream` (SSE stream)

The stream contains:
- `data: {"type":"text","content":"..."}` — text chunks
- `data: {"type":"tool_call","name":"add_bookmark","arguments":{...}}` — tool calls
- `data: {"type":"done"}` — stream complete

The AI model has access to tool definitions registered in the request. The frontend handles tool execution by calling `POST /api/ai/tools`.

---

### AI Tool Execution

#### POST /api/ai/tools

Executes a tool call requested by the AI model. Writes changes to the YAML config and git-commits them.

**Request body**:
```json
{
  "name": "add_bookmark",
  "arguments": {
    "name": "GitHub",
    "url": "https://github.com",
    "group": "Development",
    "icon": "https://github.com/favicon.ico",
    "description": "Code hosting"
  }
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "result": "Bookmark 'GitHub' added to group 'Development'",
  "config": { ... }
}
```

#### Available Tools

| Tool | Arguments | Description |
|------|-----------|-------------|
| `add_bookmark` | `name`, `url`, `group?`, `icon?`, `description?`, `shortcut?`, `tags?`, `server?`, `container?` | Add a bookmark to a group |
| `remove_bookmark` | `name`, `group?` | Remove a bookmark by name |
| `update_bookmark` | `name`, `group?`, `updates` | Update fields of an existing bookmark |
| `move_bookmark` | `name`, `fromGroup?`, `toGroup?`, `position?` | Move a bookmark between groups or reorder |
| `search_bookmarks` | `query` | Search bookmarks by name, URL, tags, description |
| `add_group` | `name`, `icon?`, `parentGroup?` | Create a new bookmark group |
| `remove_group` | `name` | Remove a group and all its bookmarks |
| `rename_group` | `oldName`, `newName` | Rename a group |
| `change_layout` | `layout` (`grid` \| `list`), `columns?` | Change page layout |
| `change_theme` | `theme` (`auto` \| `light` \| `dark`) | Change theme |
| `add_widget` | `type`, `config` | Add a widget to the page |
| `remove_widget` | `type` | Remove a widget by type |
| `save_config` | — | Explicitly save and git-commit current config |
| `reload_config` | — | Reload config from YAML (discard uncommitted changes) |

---

### System Resources

#### GET /api/system

Returns current system resource usage. Data is cached in-memory with a 3-second TTL.

**Response** `200 OK`:
```json
{
  "cpu": {
    "percent": 23.5
  },
  "memory": {
    "total": 17179869184,
    "used": 8589934592,
    "free": 8589934592,
    "percent": 50.0
  },
  "uptime": {
    "seconds": 86400,
    "formatted": "1d 0h 0m"
  },
  "cpuTemp": {
    "celsius": 45.0
  }
}
```

`cpuTemp` may be `null` if no thermal sensor is available.

---

### Git Rollback

#### GET /api/git

Returns the git log for the `data/` directory.

**Query params**:
- `limit` (default: 20): Number of commits to return

**Response** `200 OK`:
```json
{
  "commits": [
    {
      "hash": "a1b2c3d",
      "message": "ai: add_bookmark - GitHub",
      "date": "2026-05-07T12:00:00Z"
    }
  ]
}
```

---

### Authentication

#### POST /api/auth/login

Verifies the password against the bcrypt hash in `settings.passwordHash`.

**Request body**:
```json
{
  "password": "mypassword"
}
```

**Response** `200 OK`:
```json
{
  "success": true,
  "redirect": "/"
}
```

Sets an httpOnly cookie on success.

**Response** `401 Unauthorized`:
```json
{
  "success": false,
  "error": "Invalid password"
}
```

#### POST /api/auth/logout

Clears the auth cookie.

**Response** `200 OK`: Redirect to `/login`.

---

## Error Responses

All routes return errors in a consistent format:

```json
{
  "error": "Human-readable error message",
  "details": {}  // Optional validation/field details
}
```

| Status | Meaning |
|--------|---------|
| 400 | Bad request / validation failure |
| 401 | Unauthorized (missing or invalid auth) |
| 404 | Route or resource not found |
| 500 | Internal server error (AI API failures, file I/O errors) |
