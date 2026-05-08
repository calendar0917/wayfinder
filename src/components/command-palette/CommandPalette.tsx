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
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={containerStyle}>
        <div style={inputRowStyle}>
          <span style={inputPrefixStyle}>{isAiMode ? ">" : ">"}</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onClose();
            }}
            placeholder="Search bookmarks or type / for AI..."
            style={inputStyle}
          />
        </div>

        <div style={resultsStyle}>
          {isAiMode ? (
            <div style={hintStyle}>Press Enter to send to AI assistant</div>
          ) : (
            results.map((r, i) => (
              <a
                key={i}
                href={r.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => onClose()}
                style={resultRowStyle}
                onMouseEnter={(e) => { e.currentTarget.style.background = "var(--card-hover)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span style={resultIconStyle}>
                  {r.type === "search" ? "S" : r.icon ? "" : "B"}
                </span>
                {r.type === "bookmark" && r.icon && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={r.icon} alt="" width={16} height={16} style={{ position: "absolute", borderRadius: 3 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={resultNameStyle}>{r.name}</div>
                  {r.description && (
                    <div style={resultDescStyle}>{r.description}</div>
                  )}
                </div>
                {r.type === "search" && (
                  <span style={resultBadgeStyle}>Search</span>
                )}
              </a>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  paddingTop: "15vh",
  zIndex: 1000,
};

const containerStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  width: 560,
  maxHeight: "60vh",
  boxShadow: "var(--shadow-lg)",
  overflow: "hidden",
};

const inputRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
  gap: 8,
};

const inputPrefixStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontWeight: 700,
  fontSize: "1rem",
  fontFamily: "monospace",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: "1rem",
  color: "var(--text)",
};

const resultsStyle: React.CSSProperties = { maxHeight: "40vh", overflowY: "auto" };

const hintStyle: React.CSSProperties = {
  padding: 16,
  color: "var(--text-secondary)",
  fontSize: "0.85rem",
};

const resultRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 16px",
  textDecoration: "none",
  color: "var(--text)",
  borderBottom: "1px solid var(--border)",
  transition: "background 0.1s",
};

const resultIconStyle: React.CSSProperties = {
  width: 16,
  height: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "0.65rem",
  fontWeight: 700,
  color: "var(--text-secondary)",
  position: "relative",
  flexShrink: 0,
};

const resultNameStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const resultDescStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
};

const resultBadgeStyle: React.CSSProperties = {
  fontSize: "0.65rem",
  padding: "1px 6px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 3,
  color: "var(--text-secondary)",
  fontWeight: 500,
};
