# YAML Configuration Schema

The entire dashboard configuration lives in a single YAML file: `data/settings.yaml`.

## Top-Level Structure

```yaml
settings:   # Page-level settings
widgets:    # Information widgets (ordered list)
groups:     # Bookmark groups (ordered list, supports nesting)
```

## settings

```yaml
settings:
  title: "My Dashboard"      # Page title (shown in browser tab)
  theme: auto                # auto | light | dark
  layout:
    columns: 4               # Number of columns in bookmark grid
  search:
    engine: duckduckgo       # google | duckduckgo | bing | custom URL template
    customUrl: ""            # Only used when engine is a custom URL ({query} placeholder)
  apiKey: ""                 # OpenAI-compatible API key (empty = AI disabled)
  apiBase: "https://api.openai.com/v1"
  aiModel: "gpt-4o"
  passwordHash: ""           # bcrypt hash (empty = no auth)
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `title` | string | no | `"My Dashboard"` | Browser tab title |
| `theme` | enum | no | `auto` | `auto`, `light`, or `dark` |
| `layout.columns` | number | no | `4` | Bookmark grid columns (1–8) |
| `search.engine` | string | no | `duckduckgo` | Search engine identifier |
| `search.customUrl` | string | no | `""` | Custom search URL with `{query}` |
| `apiKey` | string | no | `""` | OpenAI-compatible API key |
| `apiBase` | string | no | `"https://api.openai.com/v1"` | API base URL |
| `aiModel` | string | no | `"gpt-4o"` | Model identifier |
| `passwordHash` | string | no | `""` | bcrypt hash (empty = no auth required) |

## widgets

Each widget in the `widgets` array is an object with `type` and `config`:

```yaml
widgets:
  - type: datetime
    config:
      format:
        dateStyle: full      # Intl.DateTimeFormat style
        timeStyle: short
      locale: zh
  - type: greeting
    config:
      text: "Welcome!"
  - type: weather
    config:
      latitude: 39.9042      # Open-Meteo coordinates
      longitude: 116.4074
      units: metric          # metric | imperial
  - type: resources
    config:
      cpu: true
      memory: true
      uptime: true
      cpuTemp: false         # Best-effort (not all systems have sensors)
  - type: logo
    config:
      src: ""               # Image URL
      alt: "Logo"
      width: 200
```

### Widget Types

| Type | Config Fields | Data Source |
|------|--------------|-------------|
| `datetime` | `format.dateStyle`, `format.timeStyle`, `locale` | Browser `Intl` |
| `greeting` | `text` | Static config |
| `weather` | `latitude`, `longitude`, `units` | Open-Meteo API (free) |
| `resources` | `cpu`, `memory`, `uptime`, `cpuTemp` | `/proc` on Linux host |
| `logo` | `src`, `alt`, `width` | Image URL |

## groups

Groups support nesting — a group can contain both bookmarks and sub-groups:

```yaml
groups:
  - name: "Development"
    icon: "https://cdn.jsdelivr.net/gh/walkxcode/dashboard-icons/png/github.png"
    collapsed: false         # Whether group is collapsed by default
    bookmarks:
      - name: "GitHub"
        url: "https://github.com"
        icon: "https://github.com/favicon.ico"
        description: "Code hosting platform"
        shortcut: "gh"
        tags: ["code", "git"]
        server: ""           # Future: hostname for service status check
        container: ""        # Future: Docker container name for status
    groups:                  # Nested sub-groups
      - name: "Sub-tools"
        icon: ""
        bookmarks:
          - name: "npm"
            url: "https://npmjs.com"
```

### Bookmark Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Display name |
| `url` | string | **yes** | Link URL |
| `icon` | string | no | External icon URL (favicon, CDN) |
| `description` | string | no | Short description shown as subtitle |
| `shortcut` | string | no | Single key or key combo hint |
| `tags` | string[] | no | Tags for filtering/search |
| `server` | string | no | Future: hostname for ping/TCP status |
| `container` | string | no | Future: Docker container name for status |

### Group Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | **yes** | Group heading |
| `icon` | string | no | External icon URL |
| `collapsed` | boolean | no | Start collapsed (default: false) |
| `bookmarks` | array | no | List of bookmarks in this group |
| `groups` | array | no | Nested sub-groups |

## Rendering Order

1. **Widgets** render in the order they appear in the `widgets` array, left to right, wrapping as needed.
2. **Groups** render in the order they appear in the `groups` array, flowing left to right, top to bottom in a CSS Grid at the configured column count.
3. **Nested groups** render inside their parent group, indented.
4. **Bookmarks** within each group render in array order.

## Validation

The schema is validated using Zod at runtime. On config read, if validation fails, an error is logged and a default config is returned. On config write, validation failure returns a 400 error.

## Default Config

When `data/settings.yaml` does not exist or is invalid, the system falls back to a built-in default:

```yaml
settings:
  title: "My Dashboard"
  theme: auto
  layout:
    columns: 4
  search:
    engine: duckduckgo
    customUrl: ""
  apiKey: ""
  apiBase: "https://api.openai.com/v1"
  aiModel: "gpt-4o"
  passwordHash: ""

widgets:
  - type: datetime
    config:
      format:
        dateStyle: full
        timeStyle: short
      locale: zh

groups:
  - name: "Getting Started"
    icon: ""
    bookmarks:
      - name: "GitHub"
        url: "https://github.com"
        icon: "https://github.com/favicon.ico"
```
