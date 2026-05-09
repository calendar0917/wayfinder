"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Group } from "@/types/config";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  groups: Group[];
  searchEngine: string;
  customUrl: string;
  authenticated: boolean;
  onOpenAI?: (message: string) => void;
}

function flattenBookmarks(groups: Group[], prefix = ""): { name: string; url: string; group: string }[] {
  const results: { name: string; url: string; group: string }[] = [];
  for (const g of groups) {
    for (const b of g.bookmarks ?? []) {
      results.push({ name: b.name, url: b.url, group: `${prefix}${g.name}` });
    }
    if (g.groups) {
      results.push(...flattenBookmarks(g.groups, `${prefix}${g.name}/`));
    }
  }
  return results;
}

function getSearchUrl(engine: string, customUrl: string, query: string): string {
  const encoded = encodeURIComponent(query);
  switch (engine) {
    case "google": return `https://www.google.com/search?q=${encoded}`;
    case "bing": return `https://www.bing.com/search?q=${encoded}`;
    case "duckduckgo": return `https://duckduckgo.com/?q=${encoded}`;
    case "custom": return customUrl ? `${customUrl}${encoded}` : `https://duckduckgo.com/?q=${encoded}`;
    default: return `https://duckduckgo.com/?q=${encoded}`;
  }
}

export default function CommandPalette({
  open,
  onClose,
  groups,
  searchEngine,
  customUrl,
  authenticated,
  onOpenAI,
}: CommandPaletteProps) {
  const [rawInput, setRawInput] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // "/" prefix = AI mode, everything else = search mode
  const isAiMode = rawInput.startsWith("/");
  const query = isAiMode ? rawInput.slice(1) : rawInput;

  const allBookmarks = flattenBookmarks(groups);
  const filtered = query.trim()
    ? allBookmarks.filter(
        (b) =>
          b.name.toLowerCase().includes(query.toLowerCase()) ||
          b.url.toLowerCase().includes(query.toLowerCase())
      )
    : allBookmarks;

  const isSearch = !isAiMode && query.trim() && filtered.length === 0;
  const searchItems = isSearch
    ? [{ name: `Search "${query}"`, url: getSearchUrl(searchEngine, customUrl, query), group: "" }]
    : filtered;

  useEffect(() => {
    if (open) {
      setRawInput("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const executeSearch = useCallback(
    (index: number) => {
      const item = searchItems[index];
      if (item) {
        window.open(item.url, "_blank");
        onClose();
      }
    },
    [searchItems, onClose]
  );

  const handleAiSubmit = useCallback(() => {
    if (!query.trim()) return;
    onOpenAI?.(query.trim());
    onClose();
  }, [query, onOpenAI, onClose]);

  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (isAiMode) {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleAiSubmit();
        } else if (e.key === "Escape") {
          onClose();
        }
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % searchItems.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + searchItems.length) % searchItems.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeSearch(selectedIndex);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, isAiMode, searchItems.length, selectedIndex, executeSearch, handleAiSubmit, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-[rgba(var(--bg-rgb),0.6)] backdrop-blur-[4px)] z-[300] animate-[fadeIn_0.15s_ease]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[300] flex items-start justify-center pt-[20vh] p-4">
        <div
          className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
          style={{ width: "min(32rem, 95vw)" }}
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--border)]">
            {isAiMode ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93V12h2.75a2.5 2.5 0 0 1 2.5 2.5V18a2 2 0 1 1-2 0v-3.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5V18a2 2 0 1 1-2 0v-3.5a2.5 2.5 0 0 1 2.5-2.5h2.75V9.93A4.002 4.002 0 0 1 12 2z" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            )}
            <input
              ref={inputRef}
              value={rawInput}
              onChange={(e) => {
                setRawInput(e.target.value);
                setSelectedIndex(0);
              }}
              placeholder={authenticated ? "Search or type / for AI..." : "Search bookmarks..."}
              className="flex-1 bg-transparent border-none outline-none text-sm text-[var(--text)] placeholder:text-[var(--text-tertiary)]"
            />
            <div className="flex items-center gap-1">
              {isAiMode && (
                <span className="inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-medium text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)] rounded">AI</span>
              )}
              <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[0.65rem] font-mono text-[var(--text-tertiary)] bg-[var(--surface-alt)] border border-[var(--border)] rounded">
                Esc
              </kbd>
            </div>
          </div>

          {/* AI mode content */}
          {isAiMode && (
            <div className="max-h-64 overflow-y-auto">
              {!authenticated ? (
                <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">
                  Login required to use AI. Type without / to search bookmarks.
                </div>
              ) : (
                <div className="px-4 py-3 text-sm text-[var(--text-tertiary)]">
                  Press Enter to open AI assistant...
                </div>
              )}
            </div>
          )}

          {/* Search mode content */}
          {!isAiMode && searchItems.length > 0 && (
            <ul className="max-h-64 overflow-y-auto py-1">
              {searchItems.slice(0, 20).map((item, i) => (
                <li key={`${item.url}-${i}`}>
                  <button
                    onClick={() => executeSearch(i)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-2.5 px-4 py-2 text-left cursor-pointer transition-colors duration-75 border-none ${
                      i === selectedIndex
                        ? "bg-[var(--accent-soft)] text-[var(--accent)]"
                        : "bg-transparent text-[var(--text)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <span className="text-sm font-medium truncate">{item.name}</span>
                    {item.group && (
                      <span className="text-xs text-[var(--text-tertiary)] ml-auto shrink-0">
                        {item.group}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
