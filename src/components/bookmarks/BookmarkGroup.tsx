"use client";

import { useState } from "react";
import type { Group } from "@/types/config";
import { BookmarkCard } from "./BookmarkCard";
import { mutate as mutateApi } from "@/lib/mutate";

interface BookmarkGroupProps {
  group: Group;
  editMode: boolean;
  onConfigChange: () => void;
}

export function BookmarkGroup({
  group,
  editMode,
  onConfigChange,
}: BookmarkGroupProps) {
  const [collapsed, setCollapsed] = useState(group.collapsed ?? false);
  const [showAdd, setShowAdd] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(group.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [addName, setAddName] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addIcon, setAddIcon] = useState("");
  const [addDesc, setAddDesc] = useState("");

  const handleAddBookmark = async () => {
    if (!addName.trim() || !addUrl.trim()) return;
    const result = await mutateApi("add_bookmark", {
      name: addName.trim(),
      url: addUrl.trim(),
      icon: addIcon.trim(),
      description: addDesc.trim(),
      group: group.name,
    });
    if (result) onConfigChange();
    setAddName("");
    setAddUrl("");
    setAddIcon("");
    setAddDesc("");
    setShowAdd(false);
  };

  const handleRename = async () => {
    if (!newName.trim() || newName === group.name) { setRenaming(false); return; }
    const result = await mutateApi("rename_group", { oldName: group.name, newName: newName.trim() });
    if (result) onConfigChange();
    setRenaming(false);
  };

  const handleDeleteGroup = async () => {
    const result = await mutateApi("remove_group", { name: group.name });
    if (result) onConfigChange();
    setConfirmDelete(false);
  };

  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      {/* Group header */}
      <div className="flex items-center gap-2 mb-3 select-none">
        {group.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.icon}
            alt=""
            width={20}
            height={20}
            className="rounded"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
        {renaming ? (
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            onBlur={() => { if (newName.trim() && newName !== group.name) handleRename(); else setRenaming(false); }}
            autoFocus
            className="text-[0.9375rem] font-semibold bg-surface-alt border border-accent rounded-lg py-0.5 px-2 text-text outline-none focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
        ) : (
          <h2
            onClick={() => setCollapsed(!collapsed)}
            className="text-[0.9375rem] font-semibold cursor-pointer hover:text-accent transition-colors duration-150"
          >
            {group.name}
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="bg-transparent cursor-pointer text-text-tertiary p-0.5 hover:text-text-secondary transition-colors duration-150"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-transform duration-150"
            style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {editMode && !renaming && (
          <div className="flex gap-2 ml-auto">
            <button onClick={() => setRenaming(true)} title="Rename" className="bg-transparent cursor-pointer text-[0.75rem] text-accent font-medium p-0 hover:text-accent-hover transition-colors duration-150">
              Rename
            </button>
            {confirmDelete ? (
              <div className="flex gap-1.5 items-center animate-[fadeIn_0.15s_ease]">
                <button onClick={handleDeleteGroup} className="bg-transparent cursor-pointer text-[0.75rem] text-error font-medium p-0 hover:text-error transition-colors duration-150">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="bg-transparent cursor-pointer text-[0.75rem] text-text-tertiary font-medium p-0 hover:text-text-secondary transition-colors duration-150">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} title="Delete group" className="bg-transparent cursor-pointer text-[0.75rem] text-error font-medium p-0 hover:text-error transition-colors duration-150">
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="flex flex-col gap-1.5">
            {group.bookmarks?.map((bookmark, i) => (
              <BookmarkCard
                key={`${group.name}-${bookmark.name}-${i}`}
                bookmark={bookmark}
                editMode={editMode}
                groupName={group.name}
                index={i}
                onConfigChange={onConfigChange}
              />
            ))}
          </div>
          {editMode && !showAdd && (
            <button
              onClick={() => setShowAdd(true)}
              className="mt-2 bg-transparent border border-dashed border-border rounded-lg py-1.5 px-3 cursor-pointer text-[0.8rem] text-text-secondary w-full text-left transition-colors duration-150 hover:border-accent hover:text-accent hover:bg-accent-soft"
            >
              + Add Bookmark
            </button>
          )}
          {editMode && showAdd && (
            <div className="mt-2 py-2.5 px-3 bg-surface border border-accent rounded-lg flex flex-col gap-2 animate-[scaleIn_0.15s_ease]">
              <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Name *" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
              <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="URL *" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
              <input value={addIcon} onChange={(e) => setAddIcon(e.target.value)} placeholder="Icon URL" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
              <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Description" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
              <div className="flex gap-2">
                <button
                  onClick={handleAddBookmark}
                  disabled={!addName.trim() || !addUrl.trim()}
                  className="bg-accent text-white rounded-lg px-3 py-1.5 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  Add
                </button>
                <button onClick={() => setShowAdd(false)} className="bg-surface text-text border border-border rounded-lg px-3 py-1.5 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 hover:bg-surface-hover">Cancel</button>
              </div>
            </div>
          )}
          {group.groups?.map((sub) => (
            <div key={sub.name} className="ml-4 mt-3 pl-3 border-l-2 border-border">
              <BookmarkGroup group={sub} editMode={editMode} onConfigChange={onConfigChange} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
