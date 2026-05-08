"use client";

import { useState, useCallback } from "react";
import type { Group } from "@/types/config";
import BookmarkCard from "./BookmarkCard";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";

interface BookmarkGroupProps {
  group: Group;
  editMode?: boolean;
  onDeleteBookmark?: (groupName: string, bookmarkName: string) => void;
  onAddBookmark?: (groupName: string) => void;
  onDeleteGroup?: (groupName: string) => void;
  onReorderBookmark?: (groupName: string, fromIndex: number, toIndex: number) => void;
}

export default function BookmarkGroup({
  group,
  editMode = false,
  onDeleteBookmark,
  onAddBookmark,
  onDeleteGroup,
  onReorderBookmark,
}: BookmarkGroupProps) {
  const [collapsed, setCollapsed] = useState(group.collapsed);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      if (!result.destination || result.source.index === result.destination.index) return;
      onReorderBookmark?.(group.name, result.source.index, result.destination.index);
    },
    [group.name, onReorderBookmark]
  );

  return (
    <div className="bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-4 stagger-item">
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={toggleCollapse}
          className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] cursor-pointer bg-transparent border-none p-0 hover:text-[var(--accent)] transition-colors duration-150"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`transition-transform duration-150 ${collapsed ? "-rotate-90" : ""}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          {group.name}
        </button>
        <span className="text-xs text-[var(--text-tertiary)]">
          {group.bookmarks.length}
        </span>
        {editMode && (
          <div className="ml-auto flex items-center gap-1">
            {onAddBookmark && (
              <button
                onClick={() => onAddBookmark(group.name)}
                className="px-2 py-1 text-xs font-medium text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent)] rounded-[4px] cursor-pointer transition-all duration-150 hover:bg-[var(--accent-soft-hover)]"
              >
                + Add
              </button>
            )}
            {onDeleteGroup && (
              <button
                onClick={() => onDeleteGroup(group.name)}
                className="px-2 py-1 text-xs font-semibold text-white bg-[var(--error)] border-none rounded-[4px] cursor-pointer transition-all duration-150 hover:shadow-[0_2px_8px_rgba(250,82,82,0.3)]"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      {!collapsed && (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId={group.name} isDropDisabled={!editMode}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="grid gap-2">
                {group.bookmarks.map((bookmark, index) => (
                  <Draggable
                    key={`${group.name}-${bookmark.name}-${index}`}
                    draggableId={`${group.name}-${index}`}
                    index={index}
                    isDragDisabled={!editMode}
                  >
                    {(dragProvided, snapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={{
                          ...dragProvided.draggableProps.style,
                          opacity: snapshot.isDragging ? 0.8 : 1,
                        }}
                      >
                        <BookmarkCard
                          bookmark={bookmark}
                          editMode={editMode}
                          onDelete={
                            onDeleteBookmark
                              ? (name) => onDeleteBookmark(group.name, name)
                              : undefined
                          }
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}
      {group.groups?.length > 0 && !collapsed && (
        <div className="mt-3 pl-2 border-l-2 border-[var(--border)] flex flex-col gap-3">
          {group.groups.map((sub) => (
            <BookmarkGroup
              key={sub.name}
              group={sub}
              editMode={editMode}
              onDeleteBookmark={onDeleteBookmark}
              onAddBookmark={onAddBookmark}
              onDeleteGroup={onDeleteGroup}
              onReorderBookmark={onReorderBookmark}
            />
          ))}
        </div>
      )}
    </div>
  );
}
