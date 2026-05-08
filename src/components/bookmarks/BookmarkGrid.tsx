"use client";

import type { Group, Bookmark } from "@/types/config";
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
}: BookmarkGridProps) {
  function handleDragEnd(result: DropResult) {
    if (!result.destination) return;
    const groupName = result.source.droppableId;
    if (result.source.index !== result.destination.index) {
      onReorderBookmark?.(groupName, result.source.index, result.destination.index);
    }
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
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
