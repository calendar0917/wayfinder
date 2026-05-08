# Hook Guidelines

> How hooks are used in this project.

---

## Overview

This project uses **React's built-in hooks only** (`useState`, `useEffect`, `useCallback`, `useRef`, `useMemo`). No external data-fetching or state-management libraries. Custom hooks encapsulate reusable client-side logic.

Custom hooks live alongside the components that use them, in a `hooks/` subdirectory within the feature folder, or at `src/hooks/` if shared across features.

---

## Custom Hook Patterns

### Polling Hook (useSystemResources)

```tsx
// src/components/widgets/hooks/useSystemResources.ts
"use client";

import { useState, useEffect, useCallback } from "react";

interface SystemResources {
  cpu: number;
  memory: { used: number; total: number; percent: number };
  uptime: number;
  cpuTemp?: number;
}

export function useSystemResources(pollIntervalMs = 3000) {
  const [data, setData] = useState<SystemResources | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchResources = useCallback(async () => {
    try {
      const res = await fetch("/api/system");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch system resources");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      // Fetch immediately, then poll
      await fetchResources();
      if (!cancelled) {
        interval = setInterval(() => {
          if (!cancelled) fetchResources();
        }, pollIntervalMs);
      }
    };

    let interval: ReturnType<typeof setInterval>;
    tick();

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [fetchResources, pollIntervalMs]);

  return { data, error, refetch: fetchResources };
}
```

Key patterns:
- **Cancelled flag** prevents state updates after unmount.
- **`clearInterval` in the cleanup** function stops polling on unmount.
- **`useCallback` for `fetchResources`** keeps the reference stable.
- **Return `refetch`** so the consumer can trigger a manual refresh.

### Mutation Hook (useConfigMutation)

```tsx
// src/hooks/useConfigMutation.ts
"use client";

import { useState, useCallback } from "react";
import type { DashboardConfig } from "@/types/config";

export function useConfigMutation() {
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveConfig = useCallback(async (config: DashboardConfig) => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      return await res.json() as DashboardConfig;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save config";
      setSaveError(message);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { saveConfig, isSaving, saveError };
}
```

Key patterns:
- **Loading and error state** are returned alongside the mutation function.
- **Optimistic updates** happen in the calling component (see state management spec).
- **`finally` block** ensures loading state is always cleared.

### Keyboard Shortcut Hook (useKeyboardShortcut)

```tsx
// src/hooks/useKeyboardShortcut.ts
"use client";

import { useEffect } from "react";

export function useKeyboardShortcut(
  key: string,
  modifiers: { meta?: boolean; ctrl?: boolean; shift?: boolean } = {},
  callback: () => void,
) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const metaMatch = modifiers.meta ? (e.metaKey || e.ctrlKey) : true;
      const ctrlMatch = modifiers.ctrl ? e.ctrlKey : true;
      const shiftMatch = modifiers.shift ? e.shiftKey : true;

      if (e.key.toLowerCase() === key.toLowerCase() && metaMatch && ctrlMatch && shiftMatch) {
        e.preventDefault();
        callback();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [key, modifiers.meta, modifiers.ctrl, modifiers.shift, callback]);
}
```

Usage:
```tsx
useKeyboardShortcut("k", { meta: true }, () => setIsPaletteOpen(true));
// Matches Cmd+K (Mac) and Ctrl+K (Windows/Linux)
```

---

## Data Fetching

### Client-Side Fetch (Polling)

Used for data that changes over time and must update without a page reload: system resources, weather. Simple `useEffect` + `fetch` in a custom hook with cleanup. No library.

```tsx
// Pattern: polling hook with cleanup
useEffect(() => {
  let cancelled = false;
  const interval = setInterval(async () => {
    const res = await fetch("/api/system");
    if (!cancelled) setData(await res.json());
  }, 3000);
  return () => { cancelled = true; clearInterval(interval); };
}, []);
```

### Server-Side Fetch (Server Components)

Used for the initial page load. The config is read directly from the YAML file in the Server Component. No `fetch` call needed -- just import `readConfig` from `@/lib/config`.

```tsx
// src/app/page.tsx (Server Component -- no "use client")
import { readConfig } from "@/lib/config";
import { Dashboard } from "@/components/layout/Dashboard";

export default async function HomePage() {
  const config = await readConfig();
  return <Dashboard config={config} />;
}
```

### AI Streaming (SSE Reader)

Used for AI chat messages. The client reads a streaming response body via `response.body.getReader()` and parses Server-Sent Events.

```tsx
const response = await fetch("/api/ai/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ messages }),
});

const reader = response.body?.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  const chunk = decoder.decode(value, { stream: true });
  // Parse SSE events from chunk, update UI incrementally
}
```

---

## Naming Conventions

| Hook Type | Pattern | Example |
|-----------|---------|---------|
| Data fetch (polling) | `use<ResourceName>` | `useSystemResources`, `useWeather` |
| Data mutation | `use<ActionName>` | `useConfigMutation`, `useBookmarkOperations` |
| UI state | `use<StateDescription>` | `useEditMode`, `useThemePreference` |
| Keyboard/shortcut | `useKeyboardShortcut` | `useKeyboardShortcut` |
| Event listener | `use<EventName>` | `useClickOutside`, `useEscapeKey` |

All custom hooks must start with `use`. File names match the hook name: `useSystemResources.ts`.

---

## Common Mistakes

1. **Forgetting cleanup**: Polling intervals, event listeners, and SSE readers must be cleaned up in the `useEffect` return function.

   ```tsx
   // BAD: No cleanup, interval keeps running after unmount
   useEffect(() => {
     setInterval(() => fetchData(), 3000);
   }, []);

   // GOOD: Cleanup stops the interval
   useEffect(() => {
     const id = setInterval(() => fetchData(), 3000);
     return () => clearInterval(id);
   }, []);
   ```

2. **Missing dependency arrays**: Effects re-run on every render if no dependency array is provided. Always specify one.

   ```tsx
   // BAD: Missing deps (or empty when it should have deps)
   useEffect(() => {
     fetch(`/api/data?id=${id}`);
   }); // runs on every render

   // GOOD: Explicit dependency
   useEffect(() => {
     fetch(`/api/data?id=${id}`);
   }, [id]);
   ```

3. **Fetching in Client Components what could be server-rendered**: If data is available at request time and doesn't change, fetch it in a Server Component and pass it as props. Only use client-side fetch for data that polls or is user-triggered.

   ```tsx
   // BAD: useEffect fetch for static config
   // (This adds a loading spinner, flash, and extra round trip for no reason)
   function WidgetList() {
     const [config, setConfig] = useState(null);
     useEffect(() => { fetch("/api/config").then(r => r.json()).then(setConfig); }, []);
   }

   // GOOD: Config passed from Server Component
   export function WidgetList({ config }: { config: DashboardConfig }) {
     // config is available immediately -- no loading state needed
   }
   ```

4. **Using a library for simple fetch**: No SWR, React Query, or RTK Query. The project's data fetching is simple enough that `useEffect` + `fetch` is sufficient and avoids a dependency.

5. **Stale closure over state in callbacks**: Always use `useCallback` with correct dependencies when passing fetch functions as deps to effects.
