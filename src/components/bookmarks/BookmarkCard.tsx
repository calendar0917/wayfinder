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
    if (editName && editName !== bookmark.name) updates.newName = editName;
    if (editUrl && editUrl !== bookmark.url) updates.url = editUrl;
    if (editIcon !== (bookmark.icon || "")) updates.icon = editIcon;
    if (editDesc !== (bookmark.description || "")) updates.description = editDesc;
    const result = await mutateApi("update_bookmark", updates);
    if (result) onConfigChange();
    setEditing(false);
  };

  if (editMode && editing) {
    return (
      <div style={editCardStyle}>
        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" style={inputStyle} />
        <input value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" style={inputStyle} />
        <input value={editIcon} onChange={(e) => setEditIcon(e.target.value)} placeholder="Icon URL" style={inputStyle} />
        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} placeholder="Description" style={inputStyle} />
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={handleSave} style={primaryBtnStyle}>Save</button>
          <button onClick={() => setEditing(false)} style={secondaryBtnStyle}>Cancel</button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={cardStyle}
      onMouseEnter={(e) => { if (!editMode) e.currentTarget.style.background = "var(--card-hover)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "var(--card)"; }}
    >
      {editMode ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
          <BookmarkIcon icon={bookmark.icon} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={nameStyle}>{bookmark.name}</div>
            {bookmark.description && <div style={descStyle}>{bookmark.description}</div>}
          </div>
          <button onClick={() => setEditing(true)} style={editBtnStyle}>Edit</button>
          <button onClick={deleteBookmark} style={deleteBtnStyle}>Delete</button>
        </div>
      ) : (
        <a href={bookmark.url} target="_blank" rel="noopener noreferrer" style={linkStyle}>
          <BookmarkIcon icon={bookmark.icon} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={nameStyle}>{bookmark.name}</div>
            {bookmark.description && <div style={descStyle}>{bookmark.description}</div>}
          </div>
          {bookmark.shortcut && <kbd style={kbdStyle}>{bookmark.shortcut}</kbd>}
        </a>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "8px 12px",
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  transition: "background 0.15s",
};

const editCardStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  padding: "10px 12px",
  background: "var(--card)",
  border: "1px solid var(--accent)",
  borderRadius: 8,
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

const nameStyle: React.CSSProperties = {
  fontSize: "0.875rem",
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const descStyle: React.CSSProperties = {
  fontSize: "0.75rem",
  color: "var(--text-secondary)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const linkStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  flex: 1,
  minWidth: 0,
  textDecoration: "none",
};

const kbdStyle: React.CSSProperties = {
  fontSize: "0.7rem",
  padding: "1px 4px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 3,
  color: "var(--text-secondary)",
};

const editBtnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: "0.75rem",
  cursor: "pointer",
};

const deleteBtnStyle: React.CSSProperties = {
  background: "#dc2626",
  color: "white",
  border: "none",
  borderRadius: 4,
  padding: "2px 8px",
  fontSize: "0.75rem",
  cursor: "pointer",
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
