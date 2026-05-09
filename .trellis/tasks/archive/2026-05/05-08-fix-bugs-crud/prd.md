# Fix Critical Bugs and Complete CRUD Features

## Goal
Fix all blocking bugs and complete missing CRUD functionality identified in code review.

## Requirements

### Bug Fixes
- Fix AI streaming protocol: server-side must accumulate complete tool_call arguments before emitting to client (currently emits partial JSON fragments)
- Fix handleAiMessage stale closure: useCallback depends on aiMessages state but captures stale values
- Fix system-resources regex: `get()` function regex missing closing parenthesis, memory stats always fail

### Feature: Edit Mode CRUD
- Add "Add Bookmark" form in BookmarkGroup (edit mode)
- Add "Add Group" button in BookmarkGrid (edit mode)
- Add "Edit Bookmark" inline form in BookmarkCard (edit mode)
- Add "Rename Group" / "Delete Group" buttons in BookmarkGroup (edit mode)

### Feature: Persistent UI Entry Points
- Add AI button in header to re-open AISidePanel
- Add Search button in header to open CommandPalette
- Both buttons should work without keyboard shortcuts

### API Path Corrections
- ThemeToggle: use PUT /api/config instead of POST /api/ai/tools
- BookmarkCard delete: use PUT /api/config instead of POST /api/ai/tools
- Edit mode CRUD operations: use PUT /api/config for all manual edits

## Acceptance Criteria
- [ ] AI streaming correctly accumulates tool_call arguments before sending to client
- [ ] AI panel can be re-opened via header button after closing
- [ ] Command palette can be opened via header button
- [ ] Edit mode shows Add Bookmark / Add Group / Edit / Delete for bookmarks and groups
- [ ] ThemeToggle uses PUT /api/config
- [ ] BookmarkCard delete uses PUT /api/config
- [ ] system-resources regex is fixed, memory stats display correctly
- [ ] Build passes with `npx next build`

## Technical Notes
- AI streaming: OpenAI SDK streaming returns `delta.tool_calls` where `tc.function.arguments` is a partial JSON fragment per chunk. Server must buffer by tool_call ID, join fragments, emit complete tool_call only on finish.
- Edit mode CRUD: All manual edits should read current config, modify, then PUT /api/config. Do NOT use /api/ai/tools for user-initiated edits (that endpoint is for AI agent only and triggers git commits with "ai:" prefix).
