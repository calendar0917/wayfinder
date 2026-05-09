# Phase 2: Code Quality + Optimistic UI + Docker

## Goal
Complete Phase 2 of the optimization roadmap: fix code structure issues, implement optimistic UI updates, and add Docker read-only integration.

## Requirements

### Code Structure Cleanup (C1-C4)
- **C1**: Extract inlined "Add Group" modal from Dashboard.tsx into AddGroupModal component
- **C2**: Route `handleSettingsSave` mutations through the tool system (eliminate bypass for `update_title`/`update_search`)
- **C3**: Stop sending `apiKey`/`passwordHash` in handleSettingsSave PUT body — use targeted mutations
- **C4**: Add ErrorBoundary to component tree (wrap Dashboard)

### Optimistic UI Updates
- Immediate local state update on mutation for bookmark CRUD, group CRUD, widget CRUD
- Rollback on server error with error toast notification
- Applies to: add/edit/delete bookmark, add/rename/delete group, add/edit/delete widget

### Docker Read-only Integration
- `server: docker` + `container: name` fields on Bookmark → query Docker socket
- New `GET /api/docker/status` endpoint (reads containers from Docker socket, no start/stop)
- Display container state badge on BookmarkCard (running/stopped/restarting)
- Docker socket mounted `:ro` in docker-compose.yml

## Acceptance Criteria
- [ ] Dashboard.tsx no longer inlines "Add Group" modal (extracted to component)
- [ ] All mutations go through tool system — no more handleSettingsSave bypass
- [ ] Settings saves don't leak apiKey/passwordHash in request body
- [ ] ErrorBoundary wraps Dashboard; renders fallback on crash
- [ ] Bookmark/group/widget CRUD feels instant (optimistic update, rollback on error)
- [ ] Docker container status displays on BookmarkCard for configured bookmarks
- [ ] `/api/docker/status` endpoint returns container states without exposing socket to client
- [ ] Docker socket mounted read-only in docker-compose
- [ ] Lint / typecheck / build pass

## Technical Notes
- Optimistic UI: useMutate should update local state before awaiting server response. On error, revert and show toast.
- Docker: use Docker Engine API via Unix socket (`/var/run/docker.sock`). Mount `:ro` in compose.
- Tool system is the canonical mutation path — eliminate any bypasses.
