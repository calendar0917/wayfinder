"use client";

import type { Bookmark } from "@/types/config";
import BookmarkIcon from "./BookmarkIcon";

interface BookmarkCardProps {
  bookmark: Bookmark;
  editMode?: boolean;
  onDelete?: (name: string) => void;
}

export default function BookmarkCard({
  bookmark,
  editMode = false,
  onDelete,
}: BookmarkCardProps) {
  return (
    <a
      href={editMode ? undefined : bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 px-3 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-sm)] transition-all duration-150 cursor-pointer text-[var(--text)] no-underline hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)] hover:shadow-[var(--shadow-sm)]"
    >
      <BookmarkIcon src={bookmark.icon} name={bookmark.name} />
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium truncate">{bookmark.name}</span>
        {bookmark.description && (
          <span className="text-xs text-[var(--text-secondary)] truncate">
            {bookmark.description}
          </span>
        )}
      </div>
      {bookmark.shortcut && (
        <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[0.65rem] font-mono text-[var(--text-tertiary)] bg-[var(--surface-alt)] border border-[var(--border)] rounded">
          {bookmark.shortcut}
        </kbd>
      )}
      {editMode && onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onDelete(bookmark.name);
          }}
          className="ml-auto p-1 rounded text-[var(--error)] opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-[var(--error-soft)] cursor-pointer"
          title="Delete bookmark"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
        </button>
      )}
    </a>
  );
}
