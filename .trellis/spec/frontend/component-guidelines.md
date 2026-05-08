# Component Guidelines

> How components are built in this project.

---

## Overview

This project uses React Server Components (RSC) by default. A component is a **Server Component unless it needs `"use client"`**. The dividing line is:

- **Server Component** (default): renders static markup, reads config directly, passes data to children as props.
- **Client Component** (`"use client"`): uses `useState`, `useEffect`, event handlers (`onClick`, `onChange`), browser APIs (`window`, `localStorage`), or React context.

Every component is a named function export. No default exports. Styling is Tailwind CSS only.

---

## Component Structure

```tsx
// 1. Directive (only if Client Component)
"use client";

// 2. External imports
import { useState } from "react";
import { IconClock } from "@tabler/icons-react";

// 3. Internal imports
import { formatTime } from "@/lib/time";

// 4. Props interface (always exported for reuse)
export interface ClockProps {
  timeZone?: string;
  showSeconds?: boolean;
}

// 5. Component function (always named export)
export function Clock({ timeZone = "UTC", showSeconds = false }: ClockProps) {
  const [now, setNow] = useState(new Date());

  // ... component body

  return (
    <div className="flex items-center gap-2 text-neutral-100">
      <IconClock className="h-5 w-5" />
      <span className="font-mono text-lg">
        {formatTime(now, { timeZone, showSeconds })}
      </span>
    </div>
  );
}
```

Key rules:
- The `"use client"` directive must be the **very first line** of the file, above imports.
- Props interfaces are always exported so parent components can reference them.
- No `.defaultProps` -- use default parameter values instead.
- No `React.FC<Props>` -- use the simpler `function Name(props: Props)` syntax.

---

## Props Conventions

```tsx
// Props should be an interface, not a type alias (consistency)
export interface BookmarkCardProps {
  /** Display name of the bookmark */
  name: string;
  /** Full URL to navigate to on click */
  url: string;
  /** Optional icon URL; falls back to globe icon if omitted or broken */
  icon?: string;
  /** Called when the user clicks the card (in read mode, navigates to url) */
  onClick?: () => void;
  /** Called when the user clicks the edit button (only visible in edit mode) */
  onEdit?: () => void;
  /** Called when the user clicks the delete button (only visible in edit mode) */
  onDelete?: () => void;
  /** Whether edit controls should be visible */
  isEditing?: boolean;
}
```

Conventions:
- **Destructure props** in the function signature: `function Card({ name, url }: CardProps)`.
- **Callback props use `on<Event>` naming**: `onClick`, `onEdit`, `onDelete`, `onClose`, `onSubmit`.
- **Boolean props use `is` or `has` prefix**: `isEditing`, `isLoading`, `hasError`.
- **Optional props use `?`** and provide sensible defaults in the destructuring.
- **JSDoc comments on each prop** are encouraged but not enforced. At minimum, add them for non-obvious props.
- **Never use `children` as an explicit prop type** -- import `PropsWithChildren` from React instead if needed, or prefer composition with explicit slot props.

---

## Styling Patterns

**Only Tailwind CSS utility classes are allowed.** No exceptions for:

- CSS modules (`.module.css` files)
- CSS-in-JS (styled-components, Emotion, etc.)
- Inline `style={{ }}` objects

```tsx
// GOOD: Tailwind only
<div className="rounded-lg border border-neutral-700 bg-neutral-900 p-4">

// GOOD: Dynamic values via inline style (the ONLY allowed case)
<div
  className="rounded-lg bg-neutral-900"
  style={{ gridColumn: `span ${columnSpan}` }}
>

// BAD: Inline styles for static properties
<div style={{ padding: "16px", borderRadius: "8px" }}>

// BAD: CSS modules
import styles from "./Card.module.css";
<div className={styles.card}>
```

The one exception to `style={{ }}` is **dynamically computed values** (e.g., grid spans, animation positions) that cannot be expressed as Tailwind classes because they depend on runtime data.

For theme support, use Tailwind's `dark:` variant or the project's `[data-theme]` attribute on `<html>`. The theme is applied via CSS variables, so Tailwind's color classes work automatically.

---

## Accessibility

All components must meet these baseline requirements:

1. **Focus management**: Modals, popovers, and the command palette must trap focus when open and return focus to the trigger element on close.
2. **Keyboard navigation**: Interactive elements must be reachable via Tab. Custom interactive elements (bookmark cards, widget toggles) must use `<button>` or have `role="button"` + `tabIndex={0}` + keyboard handlers.
3. **Labels**: Every form input must have an associated `<label>`. Icon-only buttons must have `aria-label`.
4. **Image fallbacks**: Bookmark icons and any `<img>` elements must have an `onError` handler that shows a fallback. See the `BookmarkIcon` pattern.
5. **Escape to close**: The command palette, side panel, and any modals must close on the Escape key.

```tsx
// GOOD: Icon button with accessible label
<button
  onClick={onClose}
  aria-label="Close command palette"
  className="rounded p-1 hover:bg-neutral-800"
>
  <IconX className="h-4 w-4" />
</button>

// GOOD: Form input with label
<label htmlFor="bookmark-name" className="text-sm text-neutral-400">
  Name
</label>
<input
  id="bookmark-name"
  type="text"
  value={name}
  onChange={(e) => setName(e.target.value)}
  className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2"
/>

// BAD: Input without label
<input type="text" placeholder="Name" />
```

---

## Common Mistakes

1. **Unnecessary `"use client"`**: Adding the directive to components that could be server-rendered. Server Components should be the default -- only add `"use client"` when you must have interactivity.

   ```tsx
   // BAD: Server Component marked as client
   "use client";
   export function StaticGreeting() {
     return <h1>Hello</h1>;
   }

   // GOOD: No directive needed
   export function StaticGreeting() {
     return <h1>Hello</h1>;
   }
   ```

2. **Importing server-only modules in Client Components**: `fs`, `path`, `readConfig()`, etc. If a Client Component needs data, pass it as a prop from a parent Server Component.

   ```tsx
   // BAD: Client Component importing server-only lib
   "use client";
   import { readConfig } from "@/lib/config";

   // GOOD: Server Component passes data as props
   // In page.tsx (Server Component):
   import { Dashboard } from "@/components/layout/Dashboard";
   const config = await readConfig();
   return <Dashboard config={config} />;
   ```

3. **Inline styles for static values**: Using `style={{ color: "red" }}` instead of Tailwind's `className="text-red-500"`.

4. **Default exports**: Using `export default function ComponentName()`. Always use named exports.

5. **Multiple components per file**: Each component gets its own file, even if small. The only exception is a purely private helper sub-component that is never used elsewhere and is tightly coupled.

6. **Over-abstracting**: Extracting a component too early (before it's used in 2+ places). Avoid premature abstraction.
