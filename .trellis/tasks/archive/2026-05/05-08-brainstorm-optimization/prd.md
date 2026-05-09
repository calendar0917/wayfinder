# Brainstorm: Next Optimization Directions

## Goal

Based on competitive analysis against mature self-hosted dashboards (Homepage, Homarr, Dashy) and a deep code audit, identify the highest-impact improvement directions and create an actionable roadmap.

---

## Competitive Analysis: What We're Missing

### Comparison Matrix

| Feature | Our Project | Homepage (29k stars) | Homarr | Dashy |
|---------|------------|---------------------|--------|-------|
| Service health monitoring | No | Ping + HTTP + Docker | Via integrations | Built-in status checks |
| Docker integration | Unused fields | Auto-discover, status, stats | Start/stop/restart | — |
| Service API widgets | No | 100+ integrations | ~30 integrations | ~50 widgets |
| AI assistant | Yes (unique!) | No | No | No |
| Git-based undo | Yes (unique!) | No | No | No |
| Config editor in UI | Basic settings | No (YAML only) | Drag-and-drop | Visual + raw editor |
| Optimistic UI updates | No | No | No | No |
| Loading skeletons | Yes (loading state) | SSG (instant) | Partial | Partial |
| i18n | No | 40+ languages | Yes | 5 languages |
| Custom CSS/JS | No | Yes | Limited | Extensive |
| Multi-page/boards | No | Tab groups | Multiple boards | Pages |
| RSS/iframe widgets | No | No | RSS + iframe | RSS + iframe |
| Bookmark tags | Yes (stored) | No | No | Custom tags |
| Status indicators | No | Per-service dots + metrics | Per-app | Per-item with shapes |
| Responsive mobile | Partial (CSS only) | Yes | Yes | Yes |
| Accessibility | focus-visible only | Basic | Basic | Status shapes mode |

### Our Unique Advantages (keep & amplify)

1. **AI assistant with tool use** — No other dashboard has this. This is our killer feature. Users can modify their dashboard through conversation.
2. **Git-based config versioning + undo** — Unique safety net. Homepage uses YAML but no undo; Homarr has SQLite with no undo.
3. **Single-file YAML config** — Simpler than Homepage (3+ files) or Homarr (SQLite).

---

## Part 1: Improvement Directions (Ranked by Impact)

### Tier 1 — Differentiators (makes us stand out)

#### 1A. Service Health Monitoring + Status Indicators
**Why**: Every top dashboard has this. Homepage shows per-service ping/HTTP status with response time. Dashy has colored dots (green/yellow/red/grey) with configurable polling. Our `server`/`container` fields are stored but unused.

**What to build**:
- Per-bookmark HTTP ping/status check (optional, opt-in per bookmark)
- Colored status dot next to bookmark icon (green=up, red=down, yellow=checking, grey=disabled)
- Response time on hover
- Configurable polling interval (default: check on load only)
- Server-side proxy endpoint to avoid CORS and hide internal URLs

**Precedent**: Dashy's `statusCheck` + `statusCheckInterval`; Homepage's `ping` + `siteMonitor`

#### 1B. Docker Container Integration
**Why**: Homepage and Homarr both show Docker container status (running/stopped). Homarr even allows start/stop/restart. Our `server`/`container` fields suggest this was planned.

**What to build**:
- Docker socket mount option (like Homarr/Homepage)
- Container status display (running/stopped/restarting) per bookmark
- Optional start/stop/restart controls in edit mode
- API proxy to Docker socket (avoid exposing socket to client)

**Precedent**: Homepage's Docker integration; Homarr's container management

### Tier 2 — Core UX Gaps (expected by users)

#### 2A. Optimistic UI Updates
**Why**: Every mutation currently waits for server response. Users see lag on add/edit/delete. No competitor does this well — opportunity to lead.

**What to build**:
- Immediate local state update on mutation
- Rollback on server error
- Apply to: bookmark CRUD, group CRUD, widget CRUD, settings changes

#### 2B. Mobile-First Responsive Overhaul
**Why**: DESIGN.md defines responsive breakpoints but implementation is partial. Header doesn't collapse properly on mobile. Touch targets < 44px in places.

**What to build**:
- Header: icon-only buttons on mobile (btn-label already has `hidden sm:inline-flex`)
- Touch target audit: ensure all interactive elements ≥ 44×44px
- Bookmark grid: responsive column override already in DESIGN.md but needs implementation
- AI panel: full-screen on mobile (DESIGN.md specifies but needs verification)
- Command palette: 95vw on mobile

#### 2C. RSS Feed Widget
**Why**: Homarr has this. Dashboard users commonly want to see RSS feeds. Natural fit for a homepage.

**What to build**:
- New `rss` widget type with `url` and `maxItems` config
- Server-side RSS fetching (avoid CORS), cached with TTL
- Expandable items showing title + summary

### Tier 3 — Polish & Reliability

#### 3A. Code Quality Fixes (from audit)
These are concrete issues found in the code that should be fixed regardless of feature direction:

1. **`system-resources.ts` bug**: `import os from "fs"` on line 1, then uses `require("fs")` and `require("os")` inside functions. Import is misleading.
2. **Undo route shell injection risk**: Uses `exec()` with string interpolation instead of `execFileSync()` (like `git.ts` does correctly).
3. **Bifurcated mutation path**: `handleSettingsSave` in Dashboard.tsx has a special case that PUTs directly to `/api/config` for `update_title` and `update_search`, bypassing the tool system. This also sends `apiKey` and `passwordHash` in the request body unnecessarily.
4. **Inlined "Add Group" modal**: Lines 336-363 in Dashboard.tsx duplicate modal pattern instead of using a component.
5. **No CSRF protection** on POST/PUT endpoints.
6. **`next.config.ts`**: `images.remotePatterns` allows `**` (any host) — too permissive.
7. **`@tabler/icons-react`** is installed but unused — dead dependency.
8. **ErrorBoundary** component exists but is not used in the component tree.
9. **In-memory rate limiter** not shared across serverless instances.

#### 3B. Test Coverage Expansion
**Current**: 44 tests in `src/lib/__tests__/`, all server-side unit tests.
**Missing**: Zero component tests, zero E2E tests, no API route handler tests.

**Priority additions**:
- Component tests for BookmarkCard, BookmarkGrid (user interactions)
- Hook tests for useConfig, useMutate
- Integration test for full mutation flow (UI → API → config → git commit)

### Tier 4 — Future Expansion

#### 4A. i18n (Internationalization)
**Why**: Homepage supports 40+ languages. Our project mixes Chinese/English in data and UI. Framework: `next-intl` or similar.

#### 4B. Service Integration Widgets
**Why**: Homepage has 100+ integrations. Start with a "Custom API" widget (like Homepage's `customapi` type) that can fetch and display data from any endpoint.

#### 4C. Multi-Page / Tabs
**Why**: Homarr has multiple boards, Dashy has pages. For users with many bookmark groups.

---

## Part 2: Code Audit — Issues Needing Fix

### Security (must fix before any public exposure)

| # | Issue | File | Severity |
|---|-------|------|----------|
| S1 | API key in plaintext YAML, tracked by git | `data/settings.yaml` | High |
| S2 | Undo route uses `exec()` with shell string (inconsistent with `git.ts` secure pattern) | `src/app/api/config/undo/route.ts` | Medium |
| S3 | No AUTH_SECRET env var in docker-compose | `docker-compose.yml` | Medium |
| S4 | No rate limiting on config/mutate & config/undo endpoints | `src/app/api/config/mutate/route.ts` | Medium |
| S5 | No CSRF protection on state-changing endpoints | All POST/PUT routes | Medium |
| S6 | `images.remotePatterns` allows `**` | `next.config.ts` | Low |

### Bugs

| # | Issue | File |
|---|-------|------|
| B1 | `import os from "fs"` — misleading import, then `require()` inside functions | `src/lib/system-resources.ts:1` |
| B2 | Command palette prefix bug: both modes show `>` | `src/components/command-palette/CommandPalette.tsx` |
| B3 | `update_bookmark` cannot intentionally clear fields (empty string = no change) | `src/lib/ai-tools.ts` |
| B4 | `reload_config` tool calls `readConfig()` but the mutate route doesn't actually reload from disk | `src/app/api/config/mutate/route.ts` |
| B5 | Empty `favicon.ico` (0 bytes) | `public/favicon.ico` |

### Code Structure

| # | Issue | Suggestion |
|---|-------|------------|
| C1 | Dashboard.tsx is 366 lines with inlined "Add Group" modal | Extract to AddGroupModal component |
| C2 | `handleSettingsSave` bypasses tool system for title/search updates | Route through tool system with `update_title` / `update_search` tools |
| C3 | `handleSettingsSave` sends secrets (apiKey, passwordHash) in PUT body | Use targeted mutation instead |
| C4 | No ErrorBoundary in component tree | Wrap Dashboard in ErrorBoundary |
| C5 | `@tabler/icons-react` installed but unused | Remove from package.json |
| C6 | `api-routes.test.ts` tests `executeTool` directly, not actual HTTP routes | Rename or add true route handler tests |

---

## Research Notes

### What similar tools do

- **Homepage (gethomepage.dev)**: SSG for instant loads, 100+ service integrations pulling live data, Docker auto-discovery via labels, Kubernetes support, YAML-only config, no auth (use reverse proxy). The dominant project.
- **Homarr**: Drag-and-drop visual editor, SQLite persistence, built-in user management, Docker container management (start/stop), OIDC auth. The "no-code" alternative.
- **Dashy**: Most customizable (50+ themes, custom CSS/JS), built-in status checks with polling and accessibility shapes, multi-page support, cloud sync backup, workspace view for multitasking.

### Constraints from our repo

- Single YAML file persistence (intentional simplicity, not changing)
- No database (no SQLite, no Postgres — by design)
- Next.js 15 App Router + React 19
- Tailwind v4 with CSS custom properties
- All components are client components (no RSC optimization yet)
- Docker deployment with standalone Next.js output

### Feasible approaches for next phase

**Approach A: "Security + UX Foundation" (Recommended)**

Fix all security issues and code quality bugs first, then implement optimistic updates + mobile responsiveness. This makes the project production-ready and smooth before adding new features.

Phase 1: Security fixes (S1-S6) + bugs (B1-B5) + dead code removal (C5)
Phase 2: Code structure cleanup (C1-C4, C6)
Phase 3: Optimistic UI + mobile responsive

- **Pros**: Solid foundation, no new features on shaky ground, security-safe for public deployment
- **Cons**: No "sexy" new features for a while

**Approach B: "Differentiation Sprint"**

Build the unique features that make us stand out (status indicators + Docker integration), then fix quality.

Phase 1: Service health monitoring + status indicators
Phase 2: Docker container integration
Phase 3: Security fixes + code cleanup

- **Pros**: Rapid feature growth, competitive positioning faster
- **Cons**: Building features on known bugs is risky, security exposure

**Approach C: "Balanced Roadmap"**

Alternate between fixes and features. Each phase includes a mix.

Phase 1: Security fixes S1-S4 + service health monitoring
Phase 2: Bugs B1-B5 + code structure C1-C3 + optimistic UI
Phase 3: Mobile responsive + RSS widget + Docker integration

- **Pros**: Steady progress on both fronts, visible feature growth
- **Cons**: Context-switching between fix mode and feature mode

---

## Decisions

### D1: Approach — Balanced Roadmap (C)
Alternate between fixes and features. Each phase includes a mix.

### D2: Docker Scope — Read-only status display
Only display container running/stopped state. No start/stop/restart controls. Docker socket mounted read-only (`:ro`).

### D3: Status Check Default — Off by default
Users opt-in per bookmark via `statusCheck: true`. Avoids 50-bookmark stampede on first load.

### D4: Integration Architecture — Universal schema + AI adapter factory
Instead of hardcoding per-service adapters (like Homepage's 100+ integrations), build one generic integration component with a declarative schema. AI generates the schema via `configure_integration` tool.

### D5: Secret Management — Environment variable references only
Integration headers in YAML store only `${VAR_NAME}` references, never real values. Same pattern as existing `apiKey`/`passwordHash` handling:
- YAML stores `${JELLYFIN_TOKEN}`, not `abc123`
- `config.ts` resolves from `process.env` at read time
- Write path strips `${...}` referenced values
- Client/AI never see actual secrets
- User sets real values in `.env.local` or docker-compose environment

---

### D6: Mobile & i18n — Deferred to Phase 4
Both mobile responsive overhaul and i18n are lower priority. Focus on Phases 1-3 (security, probes, Docker, integration) first.

## Open Questions

None — all resolved.

---

## Implementation Plan

### Phase 1: Security + HTTP Probe

**Security fixes (S1-S6) + Bugs (B1-B5) + Dead code (C5)**
- Move secrets to env vars (extend existing pattern to integration refs)
- Fix `exec()` → `execFileSync()` in undo route
- Add AUTH_SECRET to docker-compose
- Rate limit on mutate/undo endpoints
- Fix `system-resources.ts` import bug
- Fix command palette prefix bug
- Fix `update_bookmark` clear-fields behavior
- Fix `reload_config` to actually reload from disk
- Add non-empty favicon.ico
- Remove `@tabler/icons-react`

**HTTP Status Probe**
- New `POST /api/status-check` endpoint (server-side proxy, avoids CORS)
- `statusCheck: boolean` on Bookmark schema
- Small colored dot on BookmarkCard (green/red/grey)
- Response time on hover tooltip
- Only probes bookmarks with `statusCheck: true`

### Phase 2: Code Quality + Optimistic UI + Docker

**Code structure (C1-C4, C6)**
- Extract AddGroupModal component
- Route all mutations through tool system (eliminate `handleSettingsSave` special case)
- Add ErrorBoundary to component tree
- Rename/fix misleading test files

**Optimistic UI Updates**
- Immediate local state update on mutation
- Rollback on server error with toast
- Apply to: bookmark CRUD, group CRUD, widget CRUD

**Docker Read-only Integration**
- `server: docker` + `container: name` → query Docker socket
- New `GET /api/docker/status` endpoint (reads containers from socket)
- Display container state badge on BookmarkCard
- Docker socket mounted `:ro` in docker-compose

### Phase 3: Universal Integration + Mobile

**Universal Integration System**
- `integration` field on Bookmark schema (endpoint, headers, fields, display, pollInterval)
- `POST /api/integration/proxy` — server-side proxy with env-var resolution
- Generic IntegrationDisplay component (inline / badge / card modes)
- JSON path selector for field extraction
- `configure_integration` AI tool — AI generates schema, user provides env vars
- Extend `config.ts` env-var resolution to integration headers

**Mobile Responsive Overhaul**
- Header: icon-only buttons (already partially done via `hidden sm:inline-flex`)
- Touch target audit (≥ 44×44px)
- Bookmark grid responsive columns
- AI panel full-screen on mobile
- Command palette 95vw on mobile

### Phase 4 (Future): i18n + RSS + Multi-page

- i18n framework (next-intl)
- RSS feed widget
- Multi-page / tab support
- Custom CSS/JS injection

## Definition of Done

* Tests added/updated (unit/integration where appropriate)
* Lint / typecheck / CI green
* Docs/notes updated if behavior changes
* Security issues resolved before any public deployment

## Out of Scope (explicit)

* Complete rewrite of existing working features
* Adding a database (the single-YAML design is intentional)
* Building 100+ service integrations (start with custom API widget)
* Multi-user system (single-user dashboard by design)

## Technical Notes

- Tailwind v4 uses CSS-only config (`@theme` in globals.css, no tailwind.config.js)
- Theme tokens are CSS custom properties mapped to Tailwind via `@theme` block
- All components are client components ("use client") — no RSC optimization yet
- Docker: `pid: host` needed for system resource monitoring
- `@hello-pangea/dnd` is installed — drag-and-drop already available
- AI chat uses SSE streaming with typed events
- The tool system is the canonical mutation path — any new mutations should go through it
