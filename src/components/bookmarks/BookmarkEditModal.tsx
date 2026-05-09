"use client";

import { useState, useEffect, useRef } from "react";
import { getFaviconUrl } from "@/lib/favicon";
import { searchIcons, getSimpleIconUrl } from "@/lib/simple-icons";

interface IntegrationFormData {
  endpoint: string;
  headersStr: string;
  fieldsStr: string;
  display: string;
  pollInterval: number;
}

interface BookmarkEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string; url: string; icon: string; description: string; tags: string[];
    statusCheck?: boolean;
    integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string }>; display: string; pollInterval: number };
  }) => void;
  initial?: {
    name?: string; url?: string; icon?: string; description?: string; tags?: string[];
    statusCheck?: boolean;
    integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string }>; display: string; pollInterval: number };
  };
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
  const [statusCheck, setStatusCheck] = useState(initial?.statusCheck || false);
  const [showIntegration, setShowIntegration] = useState(!!initial?.integration);
  const [integration, setIntegration] = useState<IntegrationFormData>({
    endpoint: initial?.integration?.endpoint || "",
    headersStr: initial?.integration?.headers
      ? Object.entries(initial.integration.headers).map(([k, v]) => `${k}: ${v}`).join("\n")
      : "",
    fieldsStr: initial?.integration?.fields
      ? initial.integration.fields.map((f) => f.label ? `${f.path}:${f.label}` : f.path).join(", ")
      : "",
    display: initial?.integration?.display || "inline",
    pollInterval: initial?.integration?.pollInterval || 60,
  });
  const nameRef = useRef<HTMLInputElement>(null);
  const iconTouchedRef = useRef(false);
  const [iconSearch, setIconSearch] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);

  useEffect(() => {
    if (open) {
      iconTouchedRef.current = false;
      setShowIconPicker(false);
      setIconSearch("");
      setName(initial?.name || "");
      setUrl(initial?.url || "");
      setIcon(initial?.icon || "");
      setDescription(initial?.description || "");
      setTagsStr((initial?.tags || []).join(", "));
      setStatusCheck(initial?.statusCheck || false);
      setShowIntegration(!!initial?.integration);
      setIntegration({
        endpoint: initial?.integration?.endpoint || "",
        headersStr: initial?.integration?.headers
          ? Object.entries(initial.integration.headers).map(([k, v]) => `${k}: ${v}`).join("\n")
          : "",
        fieldsStr: initial?.integration?.fields
          ? initial.integration.fields.map((f) => f.label ? `${f.path}:${f.label}` : f.path).join(", ")
          : "",
        display: initial?.integration?.display || "inline",
        pollInterval: initial?.integration?.pollInterval || 60,
      });
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, initial]);

  if (!open) return null;

  function parseIntegration() {
    if (!showIntegration || !integration.endpoint.trim()) return undefined;

    const headers: Record<string, string> = {};
    for (const line of integration.headersStr.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx < 0) continue;
      const key = trimmed.slice(0, colonIdx).trim();
      const val = trimmed.slice(colonIdx + 1).trim();
      if (key) headers[key] = val;
    }

    const fields: Array<{ path: string; label: string }> = [];
    for (const part of integration.fieldsStr.split(",")) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      const colonIdx = trimmed.indexOf(":");
      if (colonIdx >= 0) {
        fields.push({ path: trimmed.slice(0, colonIdx).trim(), label: trimmed.slice(colonIdx + 1).trim() });
      } else {
        fields.push({ path: trimmed, label: "" });
      }
    }

    if (fields.length === 0) return undefined;

    return {
      endpoint: integration.endpoint.trim(),
      headers,
      fields,
      display: integration.display,
      pollInterval: Math.max(5, Math.min(3600, integration.pollInterval)),
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;
    const tags = tagsStr.split(",").map((t) => t.trim()).filter(Boolean);
    onSave({ name: name.trim(), url: url.trim(), icon: icon.trim(), description: description.trim(), tags, statusCheck, integration: parseIntegration() });
  }

  return (
    <>
      <div
        className="fixed inset-0 bg-[rgba(var(--bg-rgb),0.6)] backdrop-blur-[4px)] z-[200] animate-[fadeIn_0.15s_ease]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <div
          className="w-full max-w-[420px] max-h-[85vh] overflow-y-auto bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] sticky top-0 bg-[var(--surface)] z-10">
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
              <div className="flex gap-1.5">
                <input
                  value={icon}
                  onChange={(e) => {
                    iconTouchedRef.current = true;
                    setIcon(e.target.value);
                  }}
                  placeholder="https://github.com/favicon.ico"
                  className="flex-1 px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                />
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowIconPicker(!showIconPicker)}
                    className="px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text-secondary)] cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)] whitespace-nowrap"
                  >
                    Pick
                  </button>
                  {showIconPicker && (
                    <div className="absolute right-0 top-full mt-1 w-64 max-h-60 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-md)] shadow-[var(--shadow-lg)] z-50 flex flex-col overflow-hidden">
                      <input
                        value={iconSearch}
                        onChange={(e) => setIconSearch(e.target.value)}
                        placeholder="Search icons..."
                        className="w-full px-3 py-2 bg-[var(--surface-alt)] border-b border-[var(--border)] text-sm text-[var(--text)] outline-none placeholder:text-[var(--text-tertiary)]"
                        autoFocus
                      />
                      <div className="overflow-y-auto flex-1 p-2">
                        {searchIcons(iconSearch).map((ic) => (
                          <button
                            key={ic.slug}
                            type="button"
                            onClick={() => {
                              iconTouchedRef.current = true;
                              setIcon(getSimpleIconUrl(ic.slug));
                              setShowIconPicker(false);
                              setIconSearch("");
                            }}
                            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-[var(--radius-sm)] text-sm text-[var(--text)] cursor-pointer transition-colors duration-100 hover:bg-[var(--surface-hover)] bg-transparent border-none"
                          >
                            <img
                              src={getSimpleIconUrl(ic.slug)}
                              alt=""
                              width={16}
                              height={16}
                              className="shrink-0"
                              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                            />
                            <span>{ic.name}</span>
                          </button>
                        ))}
                        {searchIcons(iconSearch).length === 0 && (
                          <span className="text-xs text-[var(--text-tertiary)] px-2 py-1">No icons found</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="statusCheck"
                checked={statusCheck}
                onChange={(e) => setStatusCheck(e.target.checked)}
                className="accent-[var(--accent)] w-3.5 h-3.5 cursor-pointer"
              />
              <label htmlFor="statusCheck" className="text-xs font-medium text-[var(--text-secondary)] cursor-pointer select-none">
                Monitor status (HTTP probe)
              </label>
            </div>

            {/* Integration section */}
            <div className="border-t border-[var(--border)] pt-3 mt-1">
              <button
                type="button"
                onClick={() => setShowIntegration(!showIntegration)}
                className="flex items-center gap-1.5 text-xs font-medium text-[var(--accent)] cursor-pointer bg-transparent border-none p-0 hover:underline"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${showIntegration ? "rotate-90" : ""}`}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
                Live Data Integration
              </button>
              {showIntegration && (
                <div className="mt-2 flex flex-col gap-2.5">
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Endpoint URL</label>
                    <input
                      value={integration.endpoint}
                      onChange={(e) => setIntegration((p) => ({ ...p, endpoint: e.target.value }))}
                      placeholder="http://localhost:8096/Sessions?ActiveWithinMinutes=20"
                      className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Fields (comma-separated paths, add :label)</label>
                    <input
                      value={integration.fieldsStr}
                      onChange={(e) => setIntegration((p) => ({ ...p, fieldsStr: e.target.value }))}
                      placeholder="data.playback.item.title:Now Playing, data.playback.item.album:Album"
                      className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Headers (key: value per line, use $&#123;VAR&#125; for secrets)</label>
                    <textarea
                      value={integration.headersStr}
                      onChange={(e) => setIntegration((p) => ({ ...p, headersStr: e.target.value }))}
                      placeholder={"X-Api-Key: ${JELLYFIN_API_KEY}"}
                      rows={2}
                      className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)] resize-y"
                    />
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Display</label>
                      <select
                        value={integration.display}
                        onChange={(e) => setIntegration((p) => ({ ...p, display: e.target.value }))}
                        className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none"
                      >
                        <option value="inline">Inline (replaces description)</option>
                        <option value="badge">Badge (pill next to name)</option>
                        <option value="card">Card (expands below)</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Poll (s)</label>
                      <input
                        type="number"
                        min={5}
                        max={3600}
                        value={integration.pollInterval}
                        onChange={(e) => setIntegration((p) => ({ ...p, pollInterval: Number(e.target.value) || 60 }))}
                        className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none"
                      />
                    </div>
                  </div>
                </div>
              )}
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
