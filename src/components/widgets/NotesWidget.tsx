"use client";

import { useState, useCallback } from "react";
import WidgetCard from "@/components/ui/WidgetCard";

interface NotesWidgetProps {
  config?: { content?: string };
  onUpdate?: (content: string) => void;
}

export default function NotesWidget({ config, onUpdate }: NotesWidgetProps) {
  const [content, setContent] = useState(config?.content || "");
  const [editing, setEditing] = useState(false);

  const handleSave = useCallback(() => {
    setEditing(false);
    onUpdate?.(content);
  }, [content, onUpdate]);

  return (
    <WidgetCard>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Notes</span>
        <button
          onClick={() => editing ? handleSave() : setEditing(true)}
          className="text-xs text-[var(--accent)] bg-transparent border-none cursor-pointer hover:underline"
        >
          {editing ? "Save" : "Edit"}
        </button>
      </div>
      {editing ? (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full h-24 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] p-2 text-sm text-[var(--text)] outline-none resize-y focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
          placeholder="Write notes here..."
          autoFocus
        />
      ) : (
        <div className="text-sm text-[var(--text)] whitespace-pre-wrap min-h-[2rem]">
          {content || <span className="text-[var(--text-tertiary)] italic">No notes yet</span>}
        </div>
      )}
    </WidgetCard>
  );
}
