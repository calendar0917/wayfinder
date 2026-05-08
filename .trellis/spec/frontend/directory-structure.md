# Directory Structure

> How frontend code is organized in this project.

---

## Overview

The frontend follows a **feature-based component organization** under `src/components/`, with Next.js App Router pages in `src/app/`. Each feature gets its own directory. Shared utilities live in `src/lib/`, and TypeScript types in `src/types/`.

The guiding principle: **one component per file, named exports only, directories use kebab-case, component files use PascalCase**.

---

## Directory Layout

```
src/
├── app/
│   ├── layout.tsx                    # Root layout: <html>, theme provider, fonts
│   ├── page.tsx                      # Main dashboard (Server Component)
│   └── login/
│       └── page.tsx                  # Password login page
├── components/
│   ├── layout/
│   │   ├── Dashboard.tsx             # Top-level layout: widgets + bookmarks
│   │   ├── WidgetRow.tsx             # Horizontal widget container
│   │   └── BookmarkGrid.tsx          # CSS Grid for bookmark groups
│   ├── widgets/
│   │   ├── Clock.tsx                 # Current time (client, ticking)
│   │   ├── Greeting.tsx              # Time-based greeting ("Good morning")
│   │   ├── Weather.tsx               # Weather display (client, polling)
│   │   ├── Resources.tsx             # System CPU/memory/uptime (client, polling)
│   │   └── Logo.tsx                  # Static logo/image widget
│   ├── bookmarks/
│   │   ├── BookmarkGroup.tsx         # Group container (collapse/expand)
│   │   ├── BookmarkCard.tsx          # Single bookmark link card
│   │   └── BookmarkIcon.tsx          # Favicon with fallback
│   ├── editing/
│   │   ├── EditModeToggle.tsx        # Read-only / edit mode switch
│   │   ├── BookmarkForm.tsx          # Add/edit bookmark form
│   │   ├── GroupForm.tsx             # Add/edit group form
│   │   └── WidgetForm.tsx            # Configure widget form
│   ├── command-palette/
│   │   ├── CommandPalette.tsx        # Cmd+K overlay container
│   │   ├── SearchResults.tsx         # Bookmark + search engine results
│   │   └── AIInputMode.tsx           # AI chat input mode (triggered by "/")
│   ├── ai/
│   │   ├── AISidePanel.tsx           # Slide-out AI chat panel
│   │   ├── AIChatMessages.tsx        # Chat message list
│   │   └── AIChatInput.tsx           # Chat message input
│   ├── auth/
│   │   └── LoginForm.tsx             # Password login form
│   └── ui/
│       ├── ThemeToggle.tsx           # Light / Dark / Auto toggle
│       ├── SearchBar.tsx             # Search engine URL builder
│       └── ToolResultCard.tsx        # AI tool execution result display
├── lib/
│   ├── config.ts                     # YAML read/write
│   ├── config-schema.ts              # Zod validation schemas
│   ├── ai-provider.ts                # OpenAI-compatible API client
│   ├── ai-tools.ts                   # Function calling tool definitions
│   ├── git.ts                        # Git auto-commit helper
│   ├── system-resources.ts           # /proc reader and cache
│   ├── weather.ts                    # Open-Meteo API client
│   ├── auth.ts                       # bcrypt + cookie management
│   └── search.ts                     # Search engine URL builders
└── types/
    └── config.ts                     # TypeScript types (z.infer from Zod)
```

---

## Module Organization

New features follow this decision tree:

1. **Is it a page?** Put it in `src/app/<route>/page.tsx` or `layout.tsx`.
2. **Is it a reusable UI piece?** Put it in `src/components/<feature>/<ComponentName>.tsx` grouped by domain (layout, widgets, bookmarks, editing, command-palette, ai, auth, ui).
3. **Is it server-side logic?** Put it in `src/lib/<module>.ts` as a plain function.
4. **Is it a type?** Put it in `src/types/config.ts` if shared, or co-locate a `types.ts` in the feature directory if purely local.

Feature directories stay flat (no nested subdirectories within a feature folder) unless a feature grows past 6 files.

Shared components that serve multiple features go in `src/components/ui/`. Do not create a "shared" or "common" feature directory -- use `ui/` instead.

---

## Naming Conventions

| Element | Convention | Example |
|---------|-----------|---------|
| Pages | `page.tsx` / `layout.tsx` | `src/app/login/page.tsx` |
| Components | PascalCase, one per file | `BookmarkCard.tsx` |
| Directories | kebab-case | `command-palette/` |
| Hooks | `use` prefix, camelCase | `useSystemResources.ts` |
| Lib modules | kebab-case | `config-schema.ts` |
| Type files | `config.ts` for shared, `types.ts` for local | `src/types/config.ts` |

Rules:
- **Named exports only** -- no `export default` for components. Use `export function ComponentName() { ... }`.
- **One component per file** -- do not define multiple components in the same file.
- **Co-locate tests** -- if testing, place `ComponentName.test.tsx` next to `ComponentName.tsx`.

---

## Examples

Well-organized features to use as reference:

- **`src/components/bookmarks/`** -- Clean separation: `BookmarkGroup` composes `BookmarkCard` which composes `BookmarkIcon`. Each file exports exactly one component. Props interfaces are defined in the same file.
- **`src/components/command-palette/`** -- Three files for three concerns: the overlay container, the search results view, and the AI input mode. No index barrel file.
- **`src/app/`** -- Minimal: one `layout.tsx` for root chrome, one `page.tsx` for the dashboard route, one `login/page.tsx` for auth. No deeply nested route groups.
