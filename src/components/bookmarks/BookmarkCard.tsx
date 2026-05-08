"use client";

import { useState } from "react";
import type { Bookmark } from "@/types/config";
import { BookmarkIcon } from "./BookmarkIcon";
import { mutate as mutateApi } from "@/lib/mutate";

interface BookmarkCardProps {
  bookmark: Bookmark;
  editMode: boolean;
  groupName: string;
  index: number;
  onConfigChange: () => void;
}

export function BookmarkCard({
  bookmark,
  editMode,
  groupName,
  index,
  onConfigChange,
}: BookmarkCardProps) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(bookmark.name);
  const [editUrl, setEditUrl] = useState(bookmark.url);
  const [editIcon, setEditIcon] = useState(bookmark.icon || "");
  const [editDesc, setEditDesc] = useState(bookmark.description || "");

  const deleteBookmark = async () => {
    const result = await mutateApi("remove_bookmark", { name: bookmark.name, group: groupName });
    if (result) onConfigChange();
  };

  const handleSave = async () => {
    const updates: Record<string, unknown> = {
      name: bookmark.name,
      group: groupName,
    };
    if (editName !== bookmark.name) updates.newName = editName;
    if (editUrl !== bookmark.url) updates.url = editUrl;
    if (editIcon !== (bookmark.icon || "")) updates.icon = editIcon;
    if (editDesc !== (bookmark.description || "")) updates.description = editDesc;
    const result = await mutateApi("update_bookmark", updates);
    if (result) onConfigChange();
    setEditing(false);
  };

  if (editMode && editing) {
    return (
      <div className="flex flex-col gap-2 py-2.5 px-3 bg-surface border border-accent rounded-lg animate-[scaleIn_0.15s_ease]">
        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
        <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
        <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} placeholder="Icon URL" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className="w-full py-1.5 px-2.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]" />
        <div className="flex gap-2">
          <button onClick={handleSave} className="bg-accent text-white rounded-lg px-3 py-1.5 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent">Save</button>
          <button onClick={() => setEditing(false)} className="bg-surface text-text border border-border rounded-lg px-3 py-1.5 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 hover:bg-surface-hover">Cancel</button>
        </div>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="flex items-center gap-2.5 py-2 px-3 bg-surface border border-border rounded-lg transition-all duration-150 hover:border-border-hover">
        <BookmarkIcon icon={bookmark.icon} />
        <div className="flex-1 min-w-0">
          <div className="text-[0.875rem] font-medium truncate">{bookmark.name}</div>
          {bookmark.description && <div className="text-[0.75rem] text-text-secondary truncate">{bookmark.description}</div>}
        </div>
        <button onClick={() => setEditing(true)} className="bg-accent-soft text-accent rounded-lg py-1 px-2.5 text-[0.75rem] font-medium cursor-pointer transition-all duration-150 hover:bg-accent-soft-hover">Edit</button>
        <button onClick={deleteBookmark} className="bg-error-soft text-error rounded-lg py-1 px-2.5 text-[0.75rem] font-medium cursor-pointer transition-all duration-150 hover:bg-error-soft">Delete</button>
      </div>
    );
  }

  return (
    <a
      href={bookmark.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 py-2 px-3 bg-surface border border-border rounded-lg transition-all duration-150 hover:bg-surface-hover hover:border-border-hover hover:shadow-sm group"
    >
      <BookmarkIcon icon={bookmark.icon} />
      <div className="flex-1 min-w-0">
        <div className="text-[0.875rem] font-medium truncate">{bookmark.name}</div>
        {bookmark.description && <div className="text-[0.75rem] text-text-secondary truncate">{bookmark.description}</div>}
      </div>
      {bookmark.shortcut && (
        <kbd className="text-[0.7rem] py-0.5 px-1.5 bg-surface-alt border border-border rounded-md text-text-tertiary font-mono">{bookmark.shortcut}</kbd>
      )}
    </a>
  );
}
