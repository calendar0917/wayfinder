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
  const inputRef = useRef<HTMLInputElement>(null);

  const isAiMode = query.startsWith("/");
  const searchQuery = isAiMode ? query.slice(1) : query;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults([]);
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
  }, [searchQuery, groups, searchEngine, customUrl, isAiMode]);

  const handleSubmit = () => {
    if (isAiMode && searchQuery.trim()) {
      onAiMessage(searchQuery.trim());
    } else if (results.length > 0) {
      window.open(results[0].url, "_blank");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex justify-center pt-[15vh] z-[1000]" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-card border border-border rounded-xl w-[560px] max-h-3/5 shadow-card-lg overflow-hidden">
        <div className="flex items-center py-3 px-4 border-b border-border gap-2">
          <span className="text-text-secondary font-bold text-base font-mono">{isAiMode ? "/" : ">"}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search bookmarks or type / for AI..."
            className="w-full bg-transparent outline-none text-base text-text"
          />
        </div>

        <div className="max-h-[40vh] overflow-y-auto">
          {isAiMode ? (
            <div className="p-4 text-text-secondary text-[0.85rem]">Press Enter to send to AI assistant</div>
          ) : (
            results.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onClose()}
                className="flex items-center gap-2.5 py-2.5 px-4 text-text border-b border-border transition-colors duration-100 hover:bg-card-hover"
              >
                <span className="w-4 h-4 inline-flex items-center justify-center text-[0.65rem] font-bold text-text-secondary relative shrink-0">
                  {r.type === "search" ? "S" : r.icon ? "" : "B"}
                </span>
                {r.type === "bookmark" && r.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.icon} alt="" width={16} height={16} className="absolute rounded-sm" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{r.name}</div>
                  {r.description && (
                    <div className="text-xs text-text-secondary">{r.description}</div>
                  )}
                </div>
                {r.type === "search" && (
                  <span className="text-[0.65rem] py-px px-1.5 bg-bg-secondary border border-border rounded-sm text-text-secondary font-medium">Search</span>
                )}
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
