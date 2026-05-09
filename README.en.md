# Wayfinder

A self-hosted dashboard with AI assistant. Manage your bookmarks, widgets, and integrations through natural language.

- Demo: https://calendar0917.github.io/wayfinder/
- Docker image: `ghcr.io/calendar0917/wayfinder:latest`
- GitHub: https://github.com/calendar0917/wayfinder

[中文](README.md)

## Features

- **AI Assistant** — Chat with your dashboard. Add bookmarks, rearrange groups, change themes, configure integrations — all through conversation
- **Bookmark Management** — Drag-and-drop groups, nested sub-groups, tags, favicon auto-fetch, HTTP status checks
- **Docker Integration** — Monitor container status directly on the dashboard
- **Live Integrations** — Poll any JSON API and display typed values (bytes, percent, temperature, etc.) with pre-built templates for popular services
- **Widgets** — Clock, greeting, weather, search bar, system resources, notes, custom logo
- **Pages** — Organize groups into tabs for different contexts (Work, Personal, Homelab...)
- **Auth** — Password protection with bcrypt + httpOnly HMAC-signed cookies
- **Config as YAML** — Single `settings.yaml`, version-controlled with automatic git commits and undo
- **Light/Dark/Auto Theme** — CSS variable system with custom CSS injection
- **PWA** — Service worker for offline support
- **Command Palette** — `Cmd+K` for quick search and AI chat

## Quick Start

```bash
# Clone
git clone https://github.com/calendar0917/wayfinder.git
cd wayfinder

# Configure
cp .env.example .env.local
cp data/settings.example.yaml data/settings.yaml

# Generate cookie signing secret
echo "AUTH_SECRET=$(openssl rand -hex 32)" >> .env.local

# Start
docker compose up -d
```

Open `http://localhost:3000`. Set a password through the settings dialog or AI chat.

### Deploy from GHCR

```bash
docker run -d \
  --name wayfinder \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -e AUTH_SECRET=your-secret \
  ghcr.io/calendar0917/wayfinder:latest
```

### AI Setup (Optional)

To enable the AI assistant, set your OpenAI-compatible API credentials:

```bash
# In .env.local
WAYFINDER_API_KEY=sk-your-api-key
WAYFINDER_API_BASE=https://api.openai.com/v1    # or any compatible endpoint
WAYFINDER_AI_MODEL=gpt-4o                         # or your preferred model
```

Or configure them in the dashboard Settings dialog.

### Without Docker

```bash
npm ci
npm run dev
```

## Configuration

All configuration lives in `data/settings.yaml`. The file supports environment variable substitution:

```yaml
settings:
  apiKey: ${WAYFINDER_API_KEY}
  passwordHash: ${WAYFINDER_PASSWORD_HASH}
```

See `data/settings.example.yaml` for the full schema, or [docs/CONFIG_SCHEMA.md](docs/CONFIG_SCHEMA.md) for detailed field documentation.

### AI Tools

The AI assistant can perform 27 operations:

| Category | Tools |
|----------|-------|
| Bookmarks | add, remove, update, move, reorder, search |
| Groups | add, remove, rename |
| Pages | add, remove, update |
| Appearance | change_theme, change_layout, update_title, update_custom_css |
| Widgets | add, remove, update_config |
| Integrations | configure, remove |
| Settings | update_ai_settings, update_search, update_locale, set_password |
| System | save_config, reload_config |

## Architecture

```
Next.js Server
┌──────────────┐    ┌──────────────┐
│   Frontend   │    │  API Routes  │
│  (RSC + CC)  │◄──►│              │
│              │    │ /api/config  │
│  Dashboard   │    │ /api/ai/*    │
│  Widgets     │    │ /api/system  │
│  AI Panel    │    │ /api/auth/*  │
└──────────────┘    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  YAML Config │
                    │ (data volume)│
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  Git Repo    │
                    │ (auto-commit)│
                    └──────────────┘
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full diagram and data flows.

## Development

```bash
npm ci
npm run dev          # Dev server at localhost:3000
npm run lint         # ESLint
npx tsc --noEmit     # Type check
npm test             # Vitest
npm run build        # Production build
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md) — System diagram and data flows
- [API Spec](docs/API_SPEC.md) — REST API reference
- [Config Schema](docs/CONFIG_SCHEMA.md) — YAML configuration fields
- [Design Decisions](docs/DESIGN_DECISIONS.md) — Why things are the way they are

## License

[GPL-3.0](LICENSE)
