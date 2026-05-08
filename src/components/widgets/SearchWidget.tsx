"use client";

import { useState, useCallback } from "react";
import WidgetCard from "@/components/ui/WidgetCard";

interface SearchWidgetProps {
  config?: { engine?: string; customUrl?: string };
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

export default function SearchWidget({ config }: SearchWidgetProps) {
  const [query, setQuery] = useState("");
  const engine = config?.engine || "duckduckgo";
  const customUrl = config?.customUrl || "";

  const handleSearch = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!query.trim()) return;
      window.open(getSearchUrl(engine, customUrl, query.trim()), "_blank");
      setQuery("");
    },
    [query, engine, customUrl]
  );

  return (
    <WidgetCard>
      <form onSubmit={handleSearch} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="flex-1 px-2.5 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--accent-hover)]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      </form>
    </WidgetCard>
  );
}
