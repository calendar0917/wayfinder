"use client";

import { useState, useEffect, useRef } from "react";
import { getFaviconUrl } from "@/lib/favicon";

interface BookmarkEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; url: string; icon: string; description: string; tags: string[] }) => void;
  initial?: { name?: string; url?: string; icon?: string; description?: string; tags?: string[] };
  title?: string;
}

export default function BookmarkEditModal({
  open,
  onClose,
  onSave,
  initial,
  title = "Add Bookmark",
}: BookmarkEditModalProps) {
  const [name, setName] = useState(initial?.name || "");
  const [url, setUrl] = useState(initial?.url || "");
  const [icon, setIcon] = useState(initial?.icon || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [tagsStr, setTagsStr] = useState((initial?.tags || []).join(", "));
  const nameRef = useRef<HTMLInputElement>(null);
  const iconTouchedRef = useRef(false);

  useEffect(() => {
    if (open) {
      iconTouchedRef.current = false;
      setName(initial?.name || "");
      setUrl(initial?.url || "");
      setIcon(initial?.icon || "");
      setDescription(initial?.description || "");
      setTagsStr((initial?.tags || []).join(", "));
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, initial]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    const tags = tagsStr
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    onSave({ name: name.trim(), url: url.trim(), icon: icon.trim(), description: description.trim(), tags });
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-[rgba(var(--bg-rgb),0.6)] backdrop-blur-[4px] z-[200] animate-[fadeIn_0.15s_ease]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[420px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
            <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Name *</label>
              <input
                ref={nameRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="GitHub"
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">URL *</label>
              <input
                value={url}
                onChange={(e) => {
                  const newUrl = e.target.value;
                  setUrl(newUrl);
                  if (!iconTouchedRef.current) {
                    setIcon(getFaviconUrl(newUrl));
                  }
                }}
                placeholder="https://github.com"
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Icon URL</label>
              <input
                value={icon}
                onChange={(e) => {
                  iconTouchedRef.current = true;
                  setIcon(e.target.value);
                }}
                placeholder="https://github.com/favicon.ico"
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Description</label>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Short description"
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Tags</label>
              <input
                value={tagsStr}
                onChange={(e) => setTagsStr(e.target.value)}
                placeholder="search, github (comma separated)"
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !url.trim()}
                className="px-4 py-2 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-accent)] hover:-translate-y-px active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
