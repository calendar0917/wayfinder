# Architecture

## Overview

The dashboard is a Next.js application using the App Router. The same Node.js process serves both the frontend (React Server Components + Client Components) and the backend (API Routes). All configuration is stored in a single YAML file on disk.

```
┌─────────────────────────────────────────────────┐
│                    Docker                        │
│  ┌───────────────────────────────────────────┐  │
│  │              Next.js Server               │  │
│  │                                           │  │
│  │  ┌─────────────┐    ┌─────────────────┐  │  │
│  │  │  Frontend   │    │   API Routes    │  │  │
│  │  │  (RSC + CC) │    │                 │  │  │
│  │  │             │    │  /api/config    │  │  │
│  │  │  Dashboard  │    │  /api/ai/chat   │  │  │
│  │  │  Widgets    │◄──►│  /api/ai/tools  │  │  │
│  │  │  Bookmarks  │    │  /api/system    │  │  │
│  │  │  Palette    │    │  /api/auth/*    │  │  │
│  │  │  AI Panel   │    │  /api/git       │  │  │
│  │  └─────────────┘    └───────┬─────────┘  │  │
│  │                              │            │  │
│  │                      ┌───────▼─────────┐  │  │
│  │                      │   YAML Config   │  │  │
│  │                      │  (data volume)  │  │  │
│  │                      └───────┬─────────┘  │  │
│  │                              │            │  │
│  │                      ┌───────▼─────────┐  │  │
│  │                      │   Git Repo      │  │  │
│  │                      │  (auto-commit)  │  │  │
│  │                      └─────────────────┘  │  │
│  └───────────────────────────────────────────┘  │
│                                                   │
│  ┌────────────────────────────────────────────┐  │
│  │           External Services                │  │
│  │  ┌──────────┐  ┌──────────┐  ┌─────────┐  │  │
│  │  │ OpenAI/  │  │Open-Meteo│  │  /proc  │  │  │
│  │  │Compat.   │  │ Weather  │  │ System  │  │  │
│  │  │   API    │  │   API    │  │  Stats  │  │  │
│  │  └──────────┘  └──────────┘  └─────────┘  │  │
│  └────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Directory Structure

```
homepage/
├── docker-compose.yml
├── Dockerfile
├── next.config.ts
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── data/                          # YAML config (Docker volume mount)
│   └── settings.yaml
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout, theme provider
│   │   ├── page.tsx               # Main dashboard (server component)
│   │   ├── login/
│   │   │   └── page.tsx           # Password login page
│   │   └── api/
│   │       ├── config/
│   │       │   └── route.ts       # GET/PUT full config
│   │       ├── ai/
│   │       │   ├── chat/
│   │       │   │   └── route.ts   # AI chat (streaming proxy)
│   │       │   └── tools/
│   │       │       └── route.ts   # AI tool execution
│   │       ├── system/
│   │       │   └── route.ts       # System resources data
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts   # POST login
│   │       │   └── logout/
│   │       │       └── route.ts   # POST logout
│   │       └── git/
│   │           └── route.ts       # Git log for rollback
│   ├── components/
│   │   ├── layout/                # Dashboard, WidgetRow, BookmarkGrid
│   │   ├── widgets/               # Clock, Greeting, Weather, Resources, Logo
│   │   ├── bookmarks/             # BookmarkGroup, BookmarkCard, BookmarkIcon
│   │   ├── editing/               # EditModeToggle, CRUD forms
│   │   ├── command-palette/       # CommandPalette, SearchResults, AIInputMode
│   │   ├── ai/                    # AISidePanel, AIChatMessages, AIChatInput
│   │   ├── auth/                  # LoginForm
│   │   └── ui/                    # ThemeToggle, SearchBar, ToolResultCard
│   ├── lib/
│   │   ├── config.ts              # YAML read/write
│   │   ├── config-schema.ts       # Zod validation
│   │   ├── ai-provider.ts         # OpenAI-compatible client
│   │   ├── ai-tools.ts            # Function calling tool definitions
│   │   ├── git.ts                 # Git auto-commit
│   │   ├── system-resources.ts    # /proc reader
│   │   ├── weather.ts             # Open-Meteo client
│   │   ├── auth.ts                # bcrypt + cookie management
│   │   └── search.ts              # Search engine URL builders
│   └── types/
│       └── config.ts              # TypeScript types
└── public/
    └── favicon.ico
```

## Data Flow

### Read Path (Dashboard Load)
```
Browser ──GET /──► Next.js Server
                      │
                      ├──► readConfig() ──► data/settings.yaml
                      │
                      ├──► page.tsx (Server Component)
                      │     passes config as props
                      │
                      ◄── Returns rendered HTML (SSR)
```

### Edit Path (Manual Edit Mode)
```
Browser ──PUT /api/config──► API Route
                               │
                               ├──► Zod validation
                               ├──► writeConfig() ──► data/settings.yaml
                               ├──► gitCommit("manual edit")
                               │
                               ◄── 200 OK + updated config
```

### AI Path (Mode 1 & 2)
```
Cmd+K → type "/add GitHub bookmark"
         │
         ▼
POST /api/ai/chat ──► OpenAI-compatible API
  (streaming)            │
                         ├──► Model processes user message
                         ├──► Model requests tool call
                         ◄──► Streaming response with tool_use
                              │
                              ▼
POST /api/ai/tools ──► Execute tool (e.g., add_bookmark)
                         │
                         ├──► Modify config object
                         ├──► writeConfig() ──► data/settings.yaml
                         ├──► gitCommit("ai: add_bookmark")
                         │
                         ◄──► Tool result returned to AI
                              │
                              ◄── AI generates final response
```

### System Resources Path
```
ResourcesWidget (3s interval)
         │
         ▼
GET /api/system ──► system-resources.ts
                      │
                      ├──► Check cache (3s TTL)
                      ├──► Read /proc/stat, /proc/meminfo, /proc/uptime
                      ├──► Read /sys/class/thermal/thermal_zone0/temp (best-effort)
                      │
                      ◄──► { cpu, memory, uptime, cpuTemp }
```

### Auth Flow
```
Request ──► middleware.ts
              │
              ├── passwordHash is empty? ──► Allow (no auth)
              │
              ├── Valid auth cookie? ──► Allow
              │
              └── No valid cookie ──► Redirect to /login
                                        │
                                        └── POST /api/auth/login
                                              │
                                              ├──► Verify password vs bcrypt hash
                                              ├──► Set httpOnly cookie
                                              └──► Redirect to /
```

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15+ (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Config Storage | YAML (js-yaml) |
| Validation | Zod |
| AI Client | OpenAI SDK (compatible mode) |
| Auth | bcryptjs + httpOnly cookies |
| Icons | @tabler/icons-react (UI) + external URLs (bookmarks) |
| Deployment | Docker multi-stage build + docker-compose |
| Rollback | Git (auto-commit in data/ directory) |

## Key Design Principles

1. **Config is the source of truth**: The YAML file is the single source of truth. AI, manual edits, and the UI all read/write the same file. No database, no duplication.

2. **Server renders, client hydrates**: Dashboard page is a Server Component that reads config at request time. Interactive elements (widgets, palette, AI panel, edit mode) are Client Components that hydrate with the server-provided data.

3. **AI operates through tools, not free-form DOM manipulation**: AI does not directly manipulate the DOM. It calls typed tools (function calling) that modify the config, and the UI reacts to config changes. This keeps AI behavior predictable and auditable.

4. **Every AI change is committed**: Git auto-commits provide a full audit trail of AI actions. Rollback is always possible. The YAML file itself serves as a human-readable changelog.

5. **Performance first**: No runtime CSS-in-JS. Widget data fetched client-side after initial render (non-blocking). System resources polled efficiently with caching. AI responses streamed.
