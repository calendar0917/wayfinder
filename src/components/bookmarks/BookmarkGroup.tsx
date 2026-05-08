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
    <div style={{ gridColumn: "span 1" }}>
      {/* Group header */}
      <div style={headerStyle}>
        {group.icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={group.icon}
            alt=""
            width={20}
            height={20}
            style={{ borderRadius: 4 }}
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
            style={renameInputStyle}
          />
        ) : (
          <h2
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: "0.95rem", fontWeight: 600, cursor: "pointer" }}
          >
            {group.name}
          </h2>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={chevronBtnStyle}
        >
          <span style={{ transform: collapsed ? "rotate(-90deg)" : "none", display: "inline-block", transition: "transform 0.15s" }}>
            v
          </span>
        </button>
        {editMode && !renaming && (
          <div style={{ display: "flex", gap: 4, marginLeft: "auto" }}>
            <button onClick={() => setRenaming(true)} title="Rename" style={actionLinkStyle}>
              Rename
            </button>
            {confirmDelete ? (
              <>
                <button onClick={handleDeleteGroup} style={dangerLinkStyle}>Confirm</button>
                <button onClick={() => setConfirmDelete(false)} style={actionLinkStyle}>Cancel</button>
              </>
            ) : (
              <button onClick={() => setConfirmDelete(true)} title="Delete group" style={dangerLinkStyle}>
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {!collapsed && (
        <>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
              style={addBtnStyle}
            >
              + Add Bookmark
            </button>
          )}
          {editMode && showAdd && (
            <div style={addFormStyle}>
              <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Name *" style={inputStyle} />
              <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="URL *" style={inputStyle} />
              <input value={addIcon} onChange={(e) => setAddIcon(e.target.value)} placeholder="Icon URL" style={inputStyle} />
              <input value={addDesc} onChange={(e) => setAddDesc(e.target.value)} placeholder="Description" style={inputStyle} />
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  onClick={handleAddBookmark}
                  disabled={!addName.trim() || !addUrl.trim()}
                  style={{ ...primaryBtnStyle, opacity: (!addName.trim() || !addUrl.trim()) ? 0.4 : 1 }}
                >
                  Add
                </button>
                <button onClick={() => setShowAdd(false)} style={secondaryBtnStyle}>Cancel</button>
              </div>
            </div>
          )}
          {group.groups?.map((sub) => (
            <div key={sub.name} style={{ marginLeft: 16, marginTop: 8 }}>
              <BookmarkGroup group={sub} editMode={editMode} onConfigChange={onConfigChange} />
            </div>
          ))}
        </>
      )}
    </div>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 8,
  marginBottom: 8,
  userSelect: "none",
};

const renameInputStyle: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 600,
  background: "var(--bg-secondary)",
  border: "1px solid var(--accent)",
  borderRadius: 4,
  padding: "1px 6px",
  color: "var(--text)",
  outline: "none",
};

const chevronBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--text-secondary)",
  fontSize: "0.7rem",
  padding: 0,
  lineHeight: 1,
};

const actionLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.7rem",
  color: "var(--accent)",
  padding: 0,
};

const dangerLinkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  cursor: "pointer",
  fontSize: "0.7rem",
  color: "#dc2626",
  padding: 0,
};

const addBtnStyle: React.CSSProperties = {
  marginTop: 4,
  background: "none",
  border: "1px dashed var(--border)",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
  fontSize: "0.8rem",
  color: "var(--text-secondary)",
  width: "100%",
  textAlign: "left",
};

const addFormStyle: React.CSSProperties = {
  marginTop: 4,
  padding: "10px 12px",
  background: "var(--card)",
  border: "1px solid var(--accent)",
  borderRadius: 8,
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "6px 8px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  fontSize: "0.8rem",
  color: "var(--text)",
  outline: "none",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 4,
  padding: "4px 12px",
  fontSize: "0.8rem",
  cursor: "pointer",
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 4,
  padding: "4px 12px",
  fontSize: "0.8rem",
  cursor: "pointer",
};
