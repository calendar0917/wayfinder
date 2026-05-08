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
    <div>
      {/* Group header */}
      <div className="flex items-center gap-2 mb-2 select-none">
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
            onBlur={handleRename}
            autoFocus
            className="text-[0.95rem] font-semibold bg-bg-secondary border border-accent rounded py-px px-1.5 text-text outline-none"
          />
        ) : (
          <h2
            onClick={() => setCollapsed(!collapsed)}
            className="text-[0.95rem] font-semibold cursor-pointer"
          >
            {group.name}
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="bg-transparent cursor-pointer text-text-secondary text-[0.7rem] p-0 leading-none"
        >
          <span className="inline-block transition-transform duration-150" style={{ transform: collapsed ? "rotate(-90deg)" : "none" }}>
            v
          </span>
        </button>
        {editMode && !renaming && (
          <div className="flex gap-1 ml-auto">
            <button onClick={() => setRenaming(true)} title="Rename" className="bg-transparent cursor-pointer text-[0.7rem] text-accent p-0">
              Rename
            </button>
            {confirmDelete ? (
              <>
                <button onClick={handleDeleteGroup} className="bg-transparent cursor-pointer text-[0.7rem] text-red-600 p-0">Confirm</button>
                <button onClick={() => setConfirmDelete(false)} className="bg-transparent cursor-pointer text-[0.7rem] text-accent p-0">Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} title="Delete group" className="bg-transparent cursor-pointer text-[0.7rem] text-red-600 p-0">
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div className="flex flex-col gap-1">
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
              className="mt-1 bg-transparent border border-dashed border-border rounded-lg py-1.5 px-3 cursor-pointer text-[0.8rem] text-text-secondary w-full text-left"
            >
              + Add Bookmark
            </button>
          )}
          {editMode && showAdd && (
            <div className="mt-1 py-2.5 px-3 bg-card border border-accent rounded-lg flex flex-col gap-1.5">
              <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Name *" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
              <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="URL *" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
              <input value={addIcon} onChange={(e) => setAddIcon(e.target.value)} placeholder="Icon URL" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
              <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Description" className="w-full py-1.5 px-2 bg-bg-secondary border border-border rounded text-[0.8rem] text-text outline-none" />
              <div className="flex gap-1.5">
                <button
                  onClick={handleAddBookmark}
                  disabled={!addName.trim() || !addUrl.trim()}
                  className={`bg-accent text-white rounded px-3 py-1 text-[0.8rem] cursor-pointer ${(!addName.trim() || !addUrl.trim()) ? 'opacity-40' : ''}`}
                >
                  Add
                </button>
                <button onClick={() => setShowAdd(false)} className="bg-bg-secondary text-text border border-border rounded px-3 py-1 text-[0.8rem] cursor-pointer">Cancel</button>
              </div>
            </div>
          )}
          {group.groups?.map((sub) => (
            <div key={sub.name} className="ml-4 mt-2">
              <BookmarkGroup group={sub} editMode={editMode} onConfigChange={onConfigChange} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}
