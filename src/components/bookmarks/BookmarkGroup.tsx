"use client";

import { useState, useCallback } from "react";
import type { Group, Bookmark } from "@/types/config";
import type { StatusResult } from "@/hooks/useStatusCheck";
import type { DockerStatusResult } from "@/hooks/useDockerStatus";
import type { IntegrationResult } from "@/hooks/useIntegration";
import BookmarkCard from "./BookmarkCard";
import { Droppable, Draggable } from "@hello-pangea/dnd";

interface BookmarkGroupProps {
  group: Group;
  editMode?: boolean;
  onDeleteBookmark?: (groupName: string, bookmarkName: string) => void;
  onAddBookmark?: (groupName: string) => void;
  onEditBookmark?: (groupName: string, bookmark: Bookmark) => void;
  onDeleteGroup?: (groupName: string) => void;
  statuses?: Map<string, StatusResult>;
  dockerStatuses?: Record<string, DockerStatusResult>;
  integrationResults?: Map<string, IntegrationResult>;
  activeTag?: string | null;
}

export default function BookmarkGroup({
  group,
  editMode = false,
  onDeleteBookmark,
  onAddBookmark,
  onEditBookmark,
  onDeleteGroup,
  statuses,
  dockerStatuses,
  integrationResults,
  activeTag,
}: BookmarkGroupProps) {
  const [collapsed, setCollapsed] = useState(group.collapsed);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const filteredBookmarks = activeTag
    ? group.bookmarks.filter((b) => b.tags.includes(activeTag))
    : group.bookmarks;

  const filteredCount = filteredBookmarks.length;
  const totalCount = group.bookmarks.length;

  // Hide group entirely if tag filter results in empty
  if (activeTag && filteredCount === 0) return null;

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
          {activeTag ? `${filteredCount}/${totalCount}` : totalCount}
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
                onClick={() => {
                  if (confirm(`Delete group "${group.name}" and all its bookmarks?`)) {
                    onDeleteGroup(group.name);
                  }
                }}
                className="px-2 py-1 text-xs font-semibold text-white bg-[var(--error)] border-none rounded-[4px] cursor-pointer transition-all duration-150 hover:shadow-[0_2px_8px_rgba(250,82,82,0.3)]"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
      {!collapsed && (
        <Droppable droppableId={group.name} isDropDisabled={!editMode}>
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className={`grid gap-2 transition-colors duration-150 ${snapshot.isDraggingOver && editMode ? "bg-[var(--accent-soft)] rounded-[var(--radius-sm)] p-1 -m-1" : ""}`}
            >
              {filteredBookmarks.map((bookmark, index) => {
                const originalIndex = group.bookmarks.indexOf(bookmark);
                return (
                  <Draggable
                    key={`${group.name}-bm-${originalIndex}`}
                    draggableId={`${group.name}-bm-${originalIndex}`}
                    index={originalIndex}
                    isDragDisabled={!editMode}
                  >
                    {(dragProvided, dragSnapshot) => (
                      <div
                        ref={dragProvided.innerRef}
                        {...dragProvided.draggableProps}
                        {...dragProvided.dragHandleProps}
                        style={dragProvided.draggableProps.style}
                        className={dragSnapshot.isDragging ? "ring-2 ring-[var(--accent)] rounded-[var(--radius-sm)]" : ""}
                      >
                        <BookmarkCard
                          bookmark={bookmark}
                          editMode={editMode}
                          onDelete={
                            onDeleteBookmark
                              ? (name) => onDeleteBookmark(group.name, name)
                              : undefined
                          }
                          onEdit={
                            onEditBookmark
                              ? () => onEditBookmark(group.name, bookmark)
                              : undefined
                          }
                          statusResult={statuses?.get(bookmark.url)}
                          dockerStatus={bookmark.container ? dockerStatuses?.[bookmark.container] : undefined}
                          integrationResult={bookmark.integration ? integrationResults?.get(bookmark.name) : undefined}
                        />
                      </div>
                    )}
                  </Draggable>
                );
              })}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
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
              onEditBookmark={onEditBookmark}
              onDeleteGroup={onDeleteGroup}
              statuses={statuses}
              dockerStatuses={dockerStatuses}
              integrationResults={integrationResults}
              activeTag={activeTag}
            />
          ))}
        </div>
      )}
    </div>
  );
}
