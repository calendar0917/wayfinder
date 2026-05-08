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
      <div className="flex flex-col gap-2 py-2.5 px-3 bg-card border border-accent rounded-lg">
        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
        <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
        <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} placeholder="Icon URL" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
        <div className="flex gap-1.5">
          <button onClick={handleSave} className="bg-accent text-white rounded px-3 py-1 text-[0.8rem] cursor-pointer">Save</button>
          <button onClick={() => setEditing(false)} className="bg-bg-secondary text-text border border-border rounded px-3 py-1 text-[0.8rem] cursor-pointer">Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2.5 py-2 px-3 bg-card border border-border rounded-lg transition-colors duration-150 ${!editMode ? 'hover:bg-card-hover' : ''}`}>
      {editMode ? (
        <div className="flex items-center gap-2 flex-1">
          <BookmarkIcon icon={bookmark.icon} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{bookmark.name}</div>
            {bookmark.description && <div className="text-xs text-text-secondary truncate">{bookmark.description}</div>}
          </div>
          <button onClick={() => setEditing(true)} className="bg-accent text-white rounded py-0.5 px-2 text-xs cursor-pointer">Edit</button>
          <button onClick={deleteBookmark} className="bg-red-600 text-white rounded py-0.5 px-2 text-xs cursor-pointer">Delete</button>
        </div>
      ) : (
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 flex-1 min-w-0">
          <BookmarkIcon icon={bookmark.icon} />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{bookmark.name}</div>
            {bookmark.description && <div className="text-xs text-text-secondary truncate">{bookmark.description}</div>}
          </div>
          {bookmark.shortcut && <kbd className="text-[0.7rem] py-px px-1 bg-bg-secondary border border-border rounded-sm text-text-secondary">{bookmark.shortcut}</kbd>}
        </a>
      )}
    </div>
  );
}
