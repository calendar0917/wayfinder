# State Management

> How state is managed in this project.

---

## Overview

This project uses **no external state management library**. The YAML config file on the server is the single source of truth. Client-side state is handled with React's built-in `useState` and `useReducer`, lifted up the component tree as needed via prop drilling.

This is feasible because:
- The app has a **single page** with well-defined component hierarchy.
- Config changes are infrequent (user-initiated edits or AI tool calls).
- The component tree is shallow (max 3-4 levels of nesting).

---

## State Categories

| Category | Where It Lives | Examples | Mechanism |
|----------|---------------|----------|-----------|
| **Server State** | `data/settings.yaml` on disk | Bookmarks, groups, widgets, theme, layout, AI config | Server Components read it; API routes write it; client re-fetches after mutation |
| **Client UI State** | `useState` in the nearest common ancestor | Edit mode toggle, command palette open/closed, side panel visibility, form draft values | useState + prop drilling |
| **URL State** | Not used in v1 | -- | No search params, no query strings for state |
| **Form State** | Local `useState` in form components | BookmarkForm fields, GroupForm fields, login form | useState, discarded on cancel/unmount |

---

## When to Lift State

Follow this decision tree when deciding where state should live:

```
Is the state used by only ONE component?
  YES -> Keep it local (useState in that component)
  NO  -> Is it used by exactly TWO sibling components?
           YES -> Lift to their immediate parent
           NO  -> Is it used by MANY components across the tree?
                    YES -> Lift to the nearest common ancestor or the page level
```

Examples:
- **Edit mode toggle**: Used by `EditModeToggle` (toggle button) and all bookmark/widget components (to show/hide edit controls). Lifted to `Dashboard.tsx`.
- **Command palette open/closed**: Used by `CommandPalette` (the overlay) and the keyboard shortcut listener. Lifted to `Dashboard.tsx`.
- **Form field values**: Only used inside `BookmarkForm`. Stay local.

**Prop drilling is acceptable up to 3 levels.** Beyond 3 levels, consider:
1. Composition: pass the component as a child/render prop instead of drilling data.
2. Co-location: move the state closer to where it is used.

Do not introduce React Context for prop-drilling avoidance alone. Context is reserved for truly global concerns (theme, auth session).

---

## Server State Synchronization

The config is the source of truth. When the client modifies it, the flow is:

1. **Optimistic update**: Immediately update local state so the UI feels instant.
2. **Server confirmation**: PUT the full config to `/api/config`.
3. **Re-render from server**: On success, optionally re-read config to confirm (catches any server-side normalization).
4. **Rollback on error**: If the PUT fails, revert the optimistic update and show an error.

### Pattern: handleToolResult

When the AI executes a tool (e.g., `add_bookmark`), the tool modifies the config on the server and returns the updated config. The client must refresh its local view:

```tsx
// src/components/ai/hooks/useToolExecution.ts
"use client";

import { useState, useCallback } from "react";
import type { DashboardConfig } from "@/types/config";

export function useToolExecution() {
  const [isExecuting, setIsExecuting] = useState(false);

  const handleToolResult = useCallback(async (
    toolName: string,
    toolArgs: Record<string, unknown>,
  ): Promise<DashboardConfig | null> => {
    setIsExecuting(true);
    try {
      const res = await fetch("/api/ai/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: toolName, args: toolArgs }),
      });
      if (!res.ok) return null;
      const updated = await res.json() as DashboardConfig;
      return updated; // Parent component sets this as the new config
    } finally {
      setIsExecuting(false);
    }
  }, []);

  return { handleToolResult, isExecuting };
}
```

The parent `Dashboard` component calls `handleToolResult` and sets the returned config into state:

```tsx
const result = await handleToolResult("add_bookmark", { groupId: "dev", name: "GitHub", url: "https://github.com" });
if (result) {
  setConfig(result); // Refresh the entire page from server-confirmed config
}
```

This pattern ensures the UI always reflects what is actually on disk.

---

## Common Mistakes

1. **Storing derived state**: Never store values that can be computed from existing state.

   ```tsx
   // BAD: Storing derived state
   const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
   const [bookmarkCount, setBookmarkCount] = useState(0);
   // When adding a bookmark, both must be updated. They WILL drift apart.

   // GOOD: Compute from source of truth
   const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
   const bookmarkCount = bookmarks.length;
   ```

2. **Duplicating server state**: Do not maintain a separate client copy of config that diverges from the server. After every mutation, refresh from the server or update optimistically with a rollback mechanism.

   ```tsx
   // BAD: Modifying only local state and never syncing
   function addBookmark(bookmark: Bookmark) {
     setBookmarks([...bookmarks, bookmark]); // Server knows nothing about this
   }

   // GOOD: Optimistic update + server sync
   async function addBookmark(bookmark: Bookmark) {
     const previous = bookmarks;
     setBookmarks([...bookmarks, bookmark]); // optimistic
     try {
       await saveConfig({ ...config, bookmarks: [...config.bookmarks, bookmark] });
     } catch {
       setBookmarks(previous); // rollback
       showError("Failed to save bookmark");
     }
   }
   ```

3. **Adding a state management library unnecessarily**: No Redux, Zustand, Jotai, or Context for state that can be handled with `useState` + prop drilling. The app has one page and a shallow component tree.

4. **Not refreshing config after AI mutation**: AI tool calls modify the config on the server. If the UI does not re-fetch or receive the updated config, it will be stale. Always call the config refresh path after tool execution.

5. **Using `useReducer` when `useState` suffices**: `useReducer` is only warranted when the next state depends on complex logic involving the previous state across multiple fields. Start with `useState` and refactor later if needed.
