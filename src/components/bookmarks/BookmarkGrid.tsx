"use client";

import { useState, useMemo } from "react";
import type { Group, Bookmark } from "@/types/config";
import type { StatusResult } from "@/hooks/useStatusCheck";
import type { DockerStatusResult } from "@/hooks/useDockerStatus";
import type { IntegrationResult } from "@/hooks/useIntegration";
import BookmarkGroup from "./BookmarkGroup";
import { DragDropContext, type DropResult } from "@hello-pangea/dnd";

interface BookmarkGridProps {
  groups: Group[];
  columns: number;
  editMode?: boolean;
  onDeleteBookmark?: (groupName: string, bookmarkName: string) => void;
  onAddBookmark?: (groupName: string) => void;
  onEditBookmark?: (groupName: string, bookmark: Bookmark) => void;
  onDeleteGroup?: (groupName: string) => void;
  onAddGroup?: () => void;
  onReorderBookmark?: (groupName: string, fromIndex: number, toIndex: number) => void;
  statuses?: Map<string, StatusResult>;
  dockerStatuses?: Record<string, DockerStatusResult>;
  integrationResults?: Map<string, IntegrationResult>;
}

function collectAllTags(groups: Group[]): string[] {
  const tagSet = new Set<string>();
  function walk(groups: Group[]) {
    for (const g of groups) {
      for (const b of g.bookmarks) {
        for (const t of b.tags) tagSet.add(t);
      }
      if (g.groups) walk(g.groups);
    }
  }
  walk(groups);
  return Array.from(tagSet).sort();
}

export default function BookmarkGrid({
  groups,
  columns,
  editMode = false,
  onDeleteBookmark,
  onAddBookmark,
  onEditBookmark,
  onDeleteGroup,
  onAddGroup,
  onReorderBookmark,
  statuses,
  dockerStatuses,
  integrationResults,
}: BookmarkGridProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => collectAllTags(groups), [groups]);

  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const groupName = result.source.droppableId;
    if (result.source.index !== result.destination.index) {
      onReorderBookmark?.(groupName, result.source.index, result.destination.index);
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {allTags.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-medium text-[var(--text-tertiary)] shrink-0">Tags</span>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-[0.7rem] px-2 py-0.5 rounded-full cursor-pointer border-none transition-all duration-150 whitespace-nowrap ${
                activeTag === tag
                  ? "bg-[var(--accent)] text-white"
                  : "bg-[var(--accent-soft)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      <div
        className="bookmark-grid grid gap-4"
        style={{ "--columns": columns } as React.CSSProperties}
      >
        {groups.map((group) => (
          <BookmarkGroup
            key={group.name}
            group={group}
            editMode={editMode}
            onDeleteBookmark={onDeleteBookmark}
            onAddBookmark={onAddBookmark}
            onEditBookmark={onEditBookmark}
            onDeleteGroup={onDeleteGroup}
            statuses={statuses}
            dockerStatuses={dockerStatuses}
            integrationResults={integrationResults}
            activeTag={activeTag}
          />
        ))}
        {editMode && onAddGroup && (
          <button
            onClick={onAddGroup}
            className="flex items-center justify-center min-h-[80px] bg-[var(--surface-alt)] border-2 border-dashed border-[var(--border)] rounded-[var(--radius-lg)] text-sm text-[var(--text-tertiary)] cursor-pointer transition-all duration-150 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-soft)]"
          >
            + Add Group
          </button>
        )}
        <style>{`
          .bookmark-grid {
            grid-template-columns: repeat(var(--columns, 3), 1fr);
          }
          @media (max-width: 768px) {
            .bookmark-grid { grid-template-columns: 1fr; }
          }
          @media (max-width: 1024px) and (min-width: 769px) {
            .bookmark-grid { grid-template-columns: repeat(2, 1fr); }
          }
        `}</style>
      </div>
    </DragDropContext>
  );
}
