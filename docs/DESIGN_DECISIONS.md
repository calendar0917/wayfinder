# Design Decisions

This document records all architectural and UX decisions made during the design phase for the AI-Powered Homepage Dashboard.

## AI Integration

### 1. AI Modes
**Decision**: Mode 1 (Config Assistant) + Mode 2 (Dynamic Page Agent)

- **Mode 1**: Users describe what they want in natural language. AI generates or modifies the YAML configuration. The page renders the resulting config. AI does not directly manipulate the DOM.
- **Mode 2**: Users invoke an AI dialog. AI executes tool calls that modify the page state in real time (add/remove cards, change layout, switch theme). Changes are reflected immediately.

### 2. AI Provider
**Decision**: OpenAI-compatible API format

A single integration supports OpenAI, Anthropic (via compatible endpoints), Ollama, vLLM, and other providers. Configured via `apiKey`, `apiBase`, and `aiModel` in the YAML config file.

### 3. AI Configuration Storage
**Decision**: Store `apiKey`, `apiBase`, `aiModel` in `settings.yaml`

All AI configuration lives alongside other settings in the YAML config file. This keeps configuration centralized and transparent. API key is stored as plaintext in the YAML file (acceptable for personal, local deployment).

### 4. AI Chat UI
**Decision**: Cmd+K command palette (mixed mode) + hidden side panel

- **Cmd+K** opens a command palette overlay
- **Default mode**: search bookmarks + search engine results
- **AI trigger**: Type `/` prefix to switch to AI mode
- **Side panel**: Slides out from the right when AI conversation is active, hidden by default
- The command palette combines search and AI into one entry point (Raycast/Alfred style)

### 5. AI Trigger Keyword
**Decision**: `/` prefix

Typing `/` at the start of input in the command palette switches to AI mode. Without `/`, the input searches bookmarks and the configured search engine. This mirrors Slack's slash-command convention.

### 6. AI Tool Set (Function Calling)
**Decision**: Full CRUD tool set for bookmarks, groups, widgets, page settings

Tools available to the AI agent:
- Bookmark operations: `add_bookmark`, `remove_bookmark`, `update_bookmark`, `move_bookmark`, `search_bookmarks`
- Group operations: `add_group`, `remove_group`, `rename_group`
- Page operations: `change_layout`, `change_theme`, `add_widget`, `remove_widget`
- System operations: `save_config`, `reload_config`

### 7. AI Save Strategy
**Decision**: Auto-save on every tool execution

Each AI tool call immediately writes to the YAML file. No explicit confirmation step. Paired with git-based rollback for safety.

### 8. Rollback Mechanism
**Decision**: Git auto-commit on AI changes

Every AI tool execution triggers `git add . && git commit -m "ai: <tool_name>"` in the `data/` directory. Rollback is done via `git revert` or restoring a previous commit. The YAML files remain transparent and version-controlled.

---

## Architecture

### 9. Architecture Pattern
**Decision**: Next.js App Router with API route proxy

Next.js serves both the frontend and backend (API routes). API routes proxy AI requests, handle config CRUD, serve system resource data, and manage authentication. No separate backend service needed.

### 10. Performance Priority
**Decision**: Page load speed > AI response speed

The dashboard must feel instant on first paint. AI interactions can have some latency — users expect AI to take a moment. This drives decisions around CSS approach, widget rendering strategy, and data fetching patterns.

### 11. Deployment
**Decision**: Docker containerization

Multi-stage Docker build produces a production image. `docker-compose.yml` mounts the `data/` directory as a volume (for YAML config visibility) and enables `--pid=host` (for system resource widget access to host `/proc`).

---

## Data & Storage

### 12. Data Storage
**Decision**: YAML/JSON files on disk

A single `data/settings.yaml` file stores all configuration. This mirrors the homepage approach and keeps configuration transparent, version-control friendly, and manually editable. No database dependency.

### 13. Config File Schema
**Decision**: Nested structure with groups, bookmarks, widgets, and settings

```yaml
settings:    # Page-level settings (title, theme, layout, search, AI config, auth)
widgets:     # Ordered list of information widgets (datetime, greeting, weather, resources, logo)
groups:      # Ordered list of bookmark groups, each containing bookmarks
```

### 14. Bookmark Fields
**Decision**: All homepage-compatible fields

Each bookmark supports: `name` (required), `url` (required), `icon` (external URL), `description`, `shortcut`, `tags`, `server`, `container`. The `server` and `container` fields are stored for future service status detection; v1 does not implement the detection logic.

### 15. Nested Groups
**Decision**: Supported

Groups can contain sub-groups for hierarchical organization. Groups support collapse/expand.

### 16. Icon Strategy
**Decision**: External URLs only

No built-in icon library. Icons are specified as URLs (favicons, CDN-hosted icons, etc.). A fallback globe icon is shown when no URL is provided or the image fails to load.

---

## UI/UX

### 17. Page Editing
**Decision**: Edit mode toggle

- **Read-only mode** (default): Clean dashboard view. Clicking bookmarks navigates. No edit controls visible.
- **Edit mode**: Toggle switch enables inline editing. Cards show edit/delete buttons, groups show rename/add buttons, widgets show remove/configure buttons. Drag-and-drop for reordering.

### 18. Layout
**Decision**: Widget row at top + bookmark grid below

Mirrors the homepage layout:
- Top area: Widgets arranged horizontally (wrapping as needed), in YAML order
- Bottom area: Bookmark groups in a CSS Grid, column count controlled by `settings.layout.columns`
- No position field — order is determined by YAML array order

### 19. Theme
**Decision**: Light / Dark / Auto (three modes)

Implemented via CSS variables and the `[data-theme]` attribute on `<html>`. Auto mode follows `prefers-color-scheme`. Pure CSS approach with zero JavaScript runtime overhead for the theme application itself.

### 20. Search Engine Integration
**Decision**: Single configurable engine, default DuckDuckGo

Configured via `settings.search.engine`. Supported engines: `google`, `duckduckgo`, `bing`, or a custom URL template. In the command palette, non-`/` queries show a "Search [engine] for 'query'" option alongside bookmark matches.

---

## Widgets

### 21. Widget Scope (v1)
**Decision**: Information widgets only; service widgets deferred

V1 includes five information widgets: datetime, greeting, weather (Open-Meteo), system resources, and logo. Service widgets (Plex, Radarr, etc.) are deferred to align with homepage's service widget model in a future version.

### 22. System Resources Widget
**Decision**: Backend cache + frontend polling, host-level data

The Next.js backend reads `/proc/stat`, `/proc/meminfo`, `/proc/uptime`, and `/sys/class/thermal/thermal_zone0/temp` with a 3-second in-memory cache. The frontend polls `GET /api/system` every 3 seconds. Docker deployment requires `--pid=host` to access host-level `/proc`.

---

## Authentication

### 23. Authentication
**Decision**: Simple password protection

A single password protects the dashboard. If `settings.passwordHash` is set, unauthenticated users are redirected to `/login`.

### 24. Password Implementation
**Decision**: bcrypt hash stored in YAML + httpOnly cookie

- Password hash stored in `settings.passwordHash` (bcrypt)
- Login form POSTs to `/api/auth/login`, which verifies the password and sets an httpOnly cookie
- Middleware checks the cookie on all routes except `/login` and auth API endpoints
- Logout clears the cookie via `/api/auth/logout`

---

## Frontend

### 25. CSS Framework
**Decision**: Tailwind CSS

Atomic utility classes with build-time tree-shaking produce minimal CSS bundles. Perfect alignment with the "page load speed first" priority. Pairs naturally with Next.js.

---

## Summary Table

| # | Domain | Decision |
|---|--------|----------|
| 1 | AI Modes | Mode 1 (config assistant) + Mode 2 (dynamic page agent) |
| 2 | Architecture | Next.js App Router with API route proxy |
| 3 | Performance | Page load speed > AI response speed |
| 4 | Storage | YAML/JSON files on disk |
| 5 | Editing | Edit mode toggle (read-only ↔ edit mode) |
| 6 | AI Provider | OpenAI-compatible format |
| 7 | Data Model | Widgets + bookmarks + search bar |
| 8 | Widget Scope | v1: info widgets only; later: homepage service widgets |
| 9 | AI Chat UI | Cmd+K command palette + hidden side panel |
| 10 | AI Tools | CRUD for bookmarks/groups/page/widgets, auto-save |
| 11 | Rollback | Git auto-commit on AI changes |
| 12 | Palette Mode | Mixed: bookmarks + search engine + `/` prefix for AI |
| 13 | AI Trigger | `/` prefix |
| 14 | YAML Schema | Nested groups, homepage fields, external icons |
| 15 | Layout | Widget rows top + bookmark grid below, YAML order |
| 16 | Theme | Light/Dark/Auto via CSS variables |
| 17 | Search Engine | Single engine configurable, default DuckDuckGo |
| 18 | Info Widgets | datetime, greeting, weather, resources, logo |
| 19 | Deployment | Docker containerization |
| 20 | Auth | Simple password protection |
| 21 | Password | bcrypt hash in YAML + httpOnly cookie |
| 22 | CSS | Tailwind CSS |
| 23 | AI Config | apiKey, apiBase, aiModel in settings.yaml |
| 24 | Bookmark Fields | name, url, icon, description, shortcut, tags, server, container |
| 25 | System Resources | Backend cache + frontend polling, host-level via `--pid=host` |
