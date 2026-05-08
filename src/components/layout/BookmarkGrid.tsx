"use client";

import { useState } from "react";
import type { Group } from "@/types/config";
import { BookmarkGroup } from "@/components/bookmarks/BookmarkGroup";
import { mutate as mutateApi } from "@/lib/mutate";

interface BookmarkGridProps {
  groups: Group[];
  columns: number;
  editMode: boolean;
  onConfigChange: () => void;
}

export function BookmarkGrid({
  groups,
  columns,
  editMode,
  onConfigChange,
}: BookmarkGridProps) {
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) return;
    const result = await mutateApi("add_group", { name: newGroupName.trim() });
    if (result) onConfigChange();
    setNewGroupName("");
    setShowAddGroup(false);
  };

  return (
    <>
      <div
        className="grid gap-4"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {groups.map((group) => (
          <BookmarkGroup
            key={group.name}
            group={group}
            editMode={editMode}
            onConfigChange={onConfigChange}
          />
        ))}
      </div>

      {editMode && !showAddGroup && (
        <button
          onClick={() => setShowAddGroup(true)}
          className="mt-4 bg-transparent border border-dashed border-border rounded-lg px-4 py-2.5 cursor-pointer text-sm text-text-secondary w-full text-left"
        >
          + Add Group
        </button>
      )}

      {editMode && showAddGroup && (
        <div className="mt-4 p-3 bg-card border border-accent rounded-lg flex gap-2 items-center">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddGroup();
              if (e.key === "Escape") setShowAddGroup(false);
            }}
            placeholder="Group name"
            autoFocus
            className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-[0.85rem] text-text outline-none"
          />
          <button
            onClick={handleAddGroup}
            disabled={!newGroupName.trim()}
            className={`bg-accent text-white border-0 rounded px-3.5 py-1.5 text-[0.85rem] cursor-pointer ${
              newGroupName.trim() ? "opacity-100" : "opacity-40"
            }`}
          >
            Add
          </button>
          <button
            onClick={() => { setShowAddGroup(false); setNewGroupName(""); }}
            className="bg-bg-secondary text-text border border-border rounded px-3.5 py-1.5 text-[0.85rem] cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
