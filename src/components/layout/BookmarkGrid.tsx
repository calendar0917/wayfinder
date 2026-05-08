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
        className="grid gap-4 max-md:grid-cols-1 max-lg:grid-cols-2"
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
      >
        {groups.map((group, i) => (
          <div key={group.name} className="stagger-item" style={{ animationDelay: `${Math.min(i * 40, 280)}ms` }}>
            <BookmarkGroup
              group={group}
              editMode={editMode}
              onConfigChange={onConfigChange}
            />
          </div>
        ))}
      </div>

      {editMode && !showAddGroup && (
        <button
          onClick={() => setShowAddGroup(true)}
          className="mt-4 bg-transparent border border-dashed border-border rounded-lg px-4 py-2.5 cursor-pointer text-[0.875rem] text-text-secondary w-full text-left transition-colors duration-150 hover:border-accent hover:text-accent hover:bg-accent-soft"
        >
          + Add Group
        </button>
      )}

      {editMode && showAddGroup && (
        <div className="mt-4 p-3 bg-surface border border-accent rounded-lg flex gap-2 items-center animate-[scaleIn_0.15s_ease]">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddGroup();
              if (e.key === "Escape") setShowAddGroup(false);
            }}
            placeholder="Group name"
            autoFocus
            className="flex-1 px-2.5 py-1.5 bg-surface-alt border border-border rounded-lg text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
          <button
            onClick={handleAddGroup}
            disabled={!newGroupName.trim()}
            className="bg-accent text-white border-0 rounded-lg px-3.5 py-1.5 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Add
          </button>
          <button
            onClick={() => { setShowAddGroup(false); setNewGroupName(""); }}
            className="bg-surface text-text border border-border rounded-lg px-3.5 py-1.5 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 hover:bg-surface-hover"
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
