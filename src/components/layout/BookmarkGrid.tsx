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
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, 1fr)`,
          gap: 16,
        }}
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
          style={{
            marginTop: 16,
            background: "none",
            border: "1px dashed var(--border)",
            borderRadius: 8,
            padding: "10px 16px",
            cursor: "pointer",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
            width: "100%",
            textAlign: "left",
          }}
        >
          + Add Group
        </button>
      )}

      {editMode && showAddGroup && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: "var(--card)",
            border: "1px solid var(--accent)",
            borderRadius: 8,
            display: "flex",
            gap: 8,
            alignItems: "center",
          }}
        >
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddGroup();
              if (e.key === "Escape") setShowAddGroup(false);
            }}
            placeholder="Group name"
            autoFocus
            style={{
              flex: 1,
              padding: "6px 8px",
              background: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              fontSize: "0.85rem",
              color: "var(--text)",
              outline: "none",
            }}
          />
          <button
            onClick={handleAddGroup}
            disabled={!newGroupName.trim()}
            style={{
              background: "var(--accent)",
              color: "white",
              border: "none",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
              opacity: newGroupName.trim() ? 1 : 0.4,
            }}
          >
            Add
          </button>
          <button
            onClick={() => { setShowAddGroup(false); setNewGroupName(""); }}
            style={{
              background: "var(--bg-secondary)",
              color: "var(--text)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              padding: "6px 14px",
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </>
  );
}
