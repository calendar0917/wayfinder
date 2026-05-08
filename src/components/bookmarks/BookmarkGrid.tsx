"use client";

import type { Group } from "@/types/config";
import BookmarkGroup from "./BookmarkGroup";

interface BookmarkGridProps {
  groups: Group[];
  columns: number;
  editMode?: boolean;
  onDeleteBookmark?: (groupName: string, bookmarkName: string) => void;
  onAddBookmark?: (groupName: string) => void;
  onDeleteGroup?: (groupName: string) => void;
  onReorderBookmark?: (groupName: string, fromIndex: number, toIndex: number) => void;
}

export default function BookmarkGrid({
  groups,
  columns,
  editMode = false,
  onDeleteBookmark,
  onAddBookmark,
  onDeleteGroup,
  onReorderBookmark,
}: BookmarkGridProps) {
  return (
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
          onDeleteGroup={onDeleteGroup}
          onReorderBookmark={onReorderBookmark}
        />
      ))}
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
  );
}
