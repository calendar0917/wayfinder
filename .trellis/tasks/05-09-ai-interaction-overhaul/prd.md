# AI Interaction Overhaul

## Goal

Unify the two AI interaction surfaces (AISidePanel + CommandPalette `/` mode) into a single, polished experience. The CommandPalette no longer has its own AI session — `/` mode opens the AISidePanel instead. Add missing UX features to the panel: clear history, stop generation, and suggested prompts.

## Problem Statement

1. **Two inconsistent AI codepaths**: The side panel supports streaming, tool calls, Markdown, and conversation history. The palette's `/` mode is single-shot, no streaming, no tools, no Markdown. Users are confused.
2. **No clear conversation**: Messages accumulate with no way to reset.
3. **No stop generation**: Once streaming starts, the only option is closing the panel.
4. **No onboarding hints**: New users don't know what the AI can do. Static hint text only.

## Requirements

### 1. CommandPalette `/` mode → opens AISidePanel

- Replace `onAiChat` prop with `onOpenAI?: (message: string) => void`
- When user types `/something` and presses Enter: call `onOpenAI(query.trim())` and close the palette
- Remove `aiResponse`, `aiLoading` state from CommandPalette — no AI rendering in the palette
- In AI mode, show a lightweight hint ("Press Enter to open AI assistant...") instead of an inline response area
- Remove `onAiChat` prop and `handleAiChat` from Dashboard

### 2. AISidePanel: initial message with auto-send

- Add `initialMessage?: string` prop (one-shot: consumed and cleared after sending)
- When `initialMessage` is provided: set it as input, call `sendMessage()`, then clear (use ref to prevent re-trigger)
- Dashboard manages `aiInitialMessage` state, set by palette's `onOpenAI`, cleared after consumption

### 3. Clear conversation

- Add "Clear" button in panel header (next to close button), visible only when `messages.length > 0`
- Small trash/broom icon
- Clicking: `setMessages([])`, clear input, show toast "Conversation cleared"

### 4. Stop generation

- Store `AbortController` ref during streaming
- Replace Send button ("...") with a Stop button (square icon) while `streaming === true`
- Clicking Stop: `abortController.abort()`, which causes `reader.read()` to throw → caught by existing catch → `streaming(false)` in finally block
- Append system message "Generation stopped" after abort

### 5. Suggested prompts

- When `messages.length === 0 && authenticated`: show 4-6 clickable prompt chips below the static hint
- Examples: "Add a bookmark to YouTube", "Change theme to dark", "Add a weather widget", "Show my Docker containers", "What can you do?"
- Clicking a chip: fill input with the prompt text, call `sendMessage()`
- Style: `accent-soft` background with accent-colored text, rounded pill shape, consistent with existing badge patterns

## Acceptance Criteria

- [ ] Typing `/add a bookmark` in CommandPalette + Enter opens AISidePanel and auto-sends the message
- [ ] CommandPalette has no AI response rendering — only routes to the side panel
- [ ] `handleAiChat` and `onAiChat` prop are removed from Dashboard and CommandPalette
- [ ] Clear button resets conversation and shows toast
- [ ] Stop button appears during streaming, clicking it halts generation
- [ ] Suggested prompt chips appear on empty authenticated panel
- [ ] Clicking a chip sends the message automatically
- [ ] Lint / typecheck / build pass

## Technical Notes

- The `initialMessage` prop should use a ref (`initialMessageRef`) to track whether it's been consumed. In a `useEffect` on `[initialMessage]`: if it's set, send and clear. This prevents double-sending on re-renders.
- AbortController: create inside `sendMessage` before `fetch`, store in a `useRef<AbortController | null>`. On Stop click, call `ref.current?.abort()`.
- The existing `sendMessage` catch block already handles errors gracefully; the abort will flow through there. Just add the "Generation stopped" system message in the catch when `error.name === 'AbortError'`.

## File List

| File | Action | Summary |
|------|--------|---------|
| `src/components/ai/AISidePanel.tsx` | modify | Add `initialMessage` prop, clear button, stop generation, suggested prompts |
| `src/components/command-palette/CommandPalette.tsx` | modify | Remove AI mode rendering, replace `onAiChat` with `onOpenAI` |
| `src/components/layout/Dashboard.tsx` | modify | Remove `handleAiChat`, add `aiInitialMessage` state, wire palette→panel |
