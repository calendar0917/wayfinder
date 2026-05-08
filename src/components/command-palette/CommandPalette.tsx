"use client";

import { useState, useEffect, useRef } from "react";
import type { Group } from "@/types/config";
import { buildSearchUrl, getEngineName } from "@/lib/search";

interface CommandPaletteProps {
  groups: Group[];
  searchEngine: string;
  customUrl: string;
  onClose: () => void;
  onAiMessage: (msg: string) => void;
}

interface SearchResult {
  type: "bookmark" | "search";
  name: string;
  url: string;
  icon?: string;
  description?: string;
}

export function CommandPalette({
  groups,
  searchEngine,
  customUrl,
  onClose,
  onAiMessage,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const isAiMode = query.startsWith("/");
  const searchQuery = isAiMode ? query.slice(1) : query;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
      setSelectedIndex(0);
      return;
    }
    const q = searchQuery.toLowerCase();
    const found: SearchResult[] = [];
    function searchGroup(groups: Group[]) {
      for (const g of groups) {
        for (const b of g.bookmarks ?? []) {
          if (
            b.name.toLowerCase().includes(q) ||
            b.url.toLowerCase().includes(q) ||
            b.description?.toLowerCase().includes(q) ||
            b.tags?.some((t) => t.toLowerCase().includes(q))
          ) {
            found.push({
              type: "bookmark",
              name: b.name,
              url: b.url,
              icon: b.icon,
              description: b.description,
            });
          }
        }
        if (g.groups) searchGroup(g.groups);
      }
    }
    searchGroup(groups);
    if (!isAiMode) {
      found.push({
        type: "search",
        name: `Search ${getEngineName(searchEngine)} for '${searchQuery}'`,
        url: buildSearchUrl(searchEngine, searchQuery, customUrl),
      });
    }
    setResults(found);
    setSelectedIndex(0);
  }, [searchQuery, groups, searchEngine, customUrl, isAiMode]);

  const handleSubmit = () => {
    if (isAiMode && searchQuery.trim()) {
      onAiMessage(searchQuery.trim());
    } else if (results.length > 0 && selectedIndex < results.length) {
      window.open(results[selectedIndex].url, "_blank");
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit();
    } else if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center pt-[12vh] z-[300]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-surface border border-border rounded-2xl w-[560px] max-md:w-[95vw] shadow-lg overflow-hidden animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex items-center py-3 px-4 border-b border-border gap-2.5">
          {isAiMode ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" className="shrink-0">
              <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="9" y1="21" x2="15" y2="21"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth={2} strokeLinecap="round" className="shrink-0">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search bookmarks or type / for AI..."
            className="w-full bg-transparent outline-none text-[0.9375rem] text-text placeholder:text-text-tertiary"
          />
          <kbd className="text-[0.65rem] py-0.5 px-1.5 bg-surface-alt border border-border rounded-md text-text-tertiary font-mono">ESC</kbd>
        </div>

        <div className="max-h-[40vh] overflow-y-auto">
          {isAiMode ? (
            <div className="p-4 text-text-secondary text-[0.85rem] flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
              Press Enter to send to AI assistant
            </div>
          ) : results.length === 0 && searchQuery.trim() ? (
            <div className="p-4 text-text-tertiary text-[0.85rem] text-center">No results found</div>
          ) : (
            results.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onClose()}
                className={`flex items-center gap-2.5 py-2.5 px-4 text-text border-b border-border transition-colors duration-100 ${i === selectedIndex ? "bg-accent-soft" : "hover:bg-surface-hover"}`}
              >
                <span className="w-5 h-5 inline-flex items-center justify-center text-[0.6rem] font-bold text-text-secondary shrink-0 rounded border border-border bg-surface-alt">
                  {r.type === "search" ? "S" : r.icon ? "" : "B"}
                </span>
                {r.type === "bookmark" && r.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.icon} alt="" width={16} height={16} className="rounded-sm shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-[0.875rem] font-medium truncate">{r.name}</div>
                  {r.description && (
                    <div className="text-[0.75rem] text-text-secondary truncate">{r.description}</div>
                  )}
                </div>
                {r.type === "search" && (
                  <span className="text-[0.65rem] py-0.5 px-2 bg-surface-alt border border-border rounded-md text-text-secondary font-medium">Search</span>
                )}
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
