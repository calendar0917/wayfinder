"use client";

import { useState } from "react";

interface AddGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
}

export default function AddGroupModal({ open, onClose, onSubmit }: AddGroupModalProps) {
  const [groupName, setGroupName] = useState("");

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;
    onSubmit(groupName.trim());
    setGroupName("");
  };

  return (
    <>
      <div className="fixed inset-0 bg-[rgba(var(--bg-rgb),0.6)] backdrop-blur-[4px)] z-[200] animate-[fadeIn_0.15s_ease]" onClick={onClose} />
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div className="w-full max-w-[360px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]" onClick={(e) => e.stopPropagation()}>
          <div className="px-5 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)]">Add Group</h3>
          </div>
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <input
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Group name"
              className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer hover:bg-[var(--surface-hover)]">Cancel</button>
              <button type="submit" disabled={!groupName.trim()} className="px-4 py-2 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed">Create</button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
