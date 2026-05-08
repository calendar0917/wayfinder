# Quality Guidelines

> Code quality standards for frontend development.

---

## Overview

This project prioritizes **performance**, **consistency**, and **simplicity** in its frontend code. Patterns that harm page load speed, add unnecessary complexity, or deviate from the established conventions are forbidden.

---

## Forbidden Patterns

### 1. CSS-in-JS

No styled-components, Emotion, or any runtime CSS generation. Tailwind produces a static CSS file at build time with zero runtime cost.

```tsx
// BAD: CSS-in-JS
import styled from "styled-components";
const Card = styled.div`
  padding: 16px;
  border-radius: 8px;
`;

// GOOD: Tailwind utility classes
<div className="rounded-lg p-4">
```

### 2. Inline Styles (except dynamic computed values)

```tsx
// BAD: Inline style for a static, known value
<div style={{ display: "flex", gap: "8px" }}>

// GOOD: Tailwind
<div className="flex gap-2">

// ALLOWED EXCEPTION: Dynamically computed CSS values
<div
  className="grid"
  style={{ gridTemplateColumns: `repeat(${columnCount}, 1fr)` }}
>
```

### 3. Default Exports

Every component must use a **named export**. This enables better IDE auto-import, consistent naming in the component tree, and easier refactoring.

```tsx
// BAD
export default function BookmarkCard() { ... }
import BookmarkCard from "./BookmarkCard";

// GOOD
export function BookmarkCard() { ... }
import { BookmarkCard } from "./BookmarkCard";
```

### 4. Prop Drilling Past 3 Levels

If a prop is passed through 3 or more intermediate components that do not need it, restructure. Use composition or lift the consumer closer to the data source.

```tsx
// BAD: isEditing drilled through WidgetRow and BookmarkGrid to BookmarkCard
// Neither WidgetRow nor BookmarkGrid uses isEditing directly.
<Dashboard config={config}>
  <WidgetRow isEditing={isEditing} config={config}>
    <BookmarkGrid isEditing={isEditing} groups={config.groups}>
      <BookmarkCard isEditing={isEditing} ... />
    </BookmarkGrid>
  </WidgetRow>
</Dashboard>

// GOOD: Render BookmarkGrid directly in Dashboard, pass isEditing once
<Dashboard config={config}>
  <WidgetRow config={config} />
  <BookmarkGrid isEditing={isEditing} groups={config.groups} />
</Dashboard>
```

### 5. The `any` Type

Never use `any`. Use `unknown` and narrow with type guards. Types come from Zod schemas.

```tsx
// BAD
function processData(data: any) { ... }

// GOOD
function processData(data: unknown) {
  if (typeof data === "object" && data !== null) { ... }
}
```

---

## Required Patterns

### 1. Component Composition Over Configuration

Prefer composable components with explicit props over giant config objects. Each component should do one thing.

```tsx
// GOOD: Composition
<Dashboard>
  <WidgetRow widgets={config.widgets} />
  <BookmarkGrid groups={config.groups} />
</Dashboard>

// BAD: Configuration object driving everything
<Dashboard config={config} /> // Dashboard internally renders everything based on config
```

### 2. Named Exports

All components and functions must use named exports. No exceptions.

### 3. Server Components by Default

Start with a Server Component. Only add `"use client"` when you add interactivity (state, effects, event handlers, browser APIs).

### 4. Image Fallbacks

Every `<img>` element that displays external content must handle load failures:

```tsx
// src/components/bookmarks/BookmarkIcon.tsx
"use client";

import { useState } from "react";
import { IconWorld } from "@tabler/icons-react";

export interface BookmarkIconProps {
  src?: string;
  alt: string;
  size?: number;
}

export function BookmarkIcon({ src, alt, size = 24 }: BookmarkIconProps) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <IconWorld
        size={size}
        className="text-neutral-500"
        aria-label={alt}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      width={size}
      height={size}
      className="rounded object-contain"
      onError={() => setHasError(true)}
    />
  );
}
```

### 5. Tailwind-Only Styling

All visual styling must use Tailwind utility classes. The only exception is `style={{ }}` for dynamically computed values that cannot be expressed as Tailwind classes.

---

## Performance Requirements

1. **No runtime CSS**: Tailwind's build-time tree-shaking produces the minimal CSS bundle. Never introduce runtime CSS generation.
2. **Server Components for static content**: The dashboard page, widget layout, and bookmark grid are Server Components. Only the interactive pieces (clock ticking, resource polling, command palette, AI chat, edit mode) hydrate on the client.
3. **Client data is non-blocking**: Widgets that fetch data (system resources, weather) render a skeleton immediately and populate with data when the fetch completes. The page must not wait for client-side data.
4. **Minimal re-renders**: Use `useCallback` and `useMemo` for expensive computations or stable references passed to memoized children. But do not prematurely optimize -- measure first.

```tsx
// GOOD: Skeleton while data loads (non-blocking)
export function ResourcesWidget() {
  const { data, error } = useSystemResources(3000);

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load</div>;
  }

  if (!data) {
    return <div className="animate-pulse bg-neutral-800 rounded h-16 w-32" />;
  }

  return (
    <div className="text-sm text-neutral-300">
      <div>CPU: {data.cpu}%</div>
      <div>RAM: {data.memory.percent}%</div>
    </div>
  );
}
```

---

## Code Review Checklist

Reviewers must verify each of these before approving a PR:

### Server/Client Boundary
- [ ] No unnecessary `"use client"` directives -- is every one justified by the presence of hooks, event handlers, or browser APIs?
- [ ] No server-only imports (`fs`, `path`, `readConfig`) in Client Components.
- [ ] Data available at request time is fetched server-side and passed as props.

### Styling
- [ ] All styling uses Tailwind utility classes -- no CSS modules, no CSS-in-JS, no inline styles (except dynamic values).
- [ ] Theme works in light and dark modes (uses `dark:` variants or respects `[data-theme]`).

### Exports and Imports
- [ ] All component exports are named exports -- no `export default`.
- [ ] One component per file.

### Types
- [ ] No `any` types -- use `unknown` and narrow, or use types from Zod schemas.
- [ ] Props interfaces are exported.
- [ ] No type assertions (`as`) on API responses -- validate instead.

### Accessibility
- [ ] Interactive elements are keyboard accessible (Tab, Enter, Escape where applicable).
- [ ] Form inputs have associated labels.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Images have `alt` text and fallback on error.

### State and Effects
- [ ] All `useEffect` calls have cleanup functions where needed (intervals, event listeners, streams).
- [ ] Dependency arrays are correct and complete.
- [ ] No derived state stored separately.
- [ ] Optimistic updates have rollback on failure.

### Performance
- [ ] Client data fetching shows a skeleton or loading state, not a spinner that blocks layout.
- [ ] No unnecessary abstractions -- no premature component extraction or hook creation.
