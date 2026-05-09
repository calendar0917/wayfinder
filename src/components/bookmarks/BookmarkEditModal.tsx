"use client";

import { useState, useEffect, useRef } from "react";
import { getFaviconUrl } from "@/lib/favicon";
import { searchIcons, getSimpleIconUrl } from "@/lib/simple-icons";
import { INTEGRATION_TEMPLATES } from "@/lib/integration-templates";
import type { IntegrationFieldType } from "@/types/config";

interface FieldEntry {
  path: string;
  label: string;
  type: IntegrationFieldType;
}

interface IntegrationFormData {
  endpoint: string;
  headersStr: string;
  fields: FieldEntry[];
  display: string;
  pollInterval: number;
}

interface BookmarkEditModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    name: string; url: string; icon: string; description: string; tags: string[];
    statusCheck?: boolean;
    integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string; type?: IntegrationFieldType }>; display: string; pollInterval: number };
  }) => void;
  initial?: {
    name?: string; url?: string; icon?: string; description?: string; tags?: string[];
    statusCheck?: boolean;
    integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string; type?: IntegrationFieldType }>; display: string; pollInterval: number };
  };
  title?: string;
}

const FIELD_TYPES: { value: IntegrationFieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "percent", label: "Percent" },
  { value: "status", label: "Status" },
  { value: "bytes", label: "Bytes" },
  { value: "duration", label: "Duration" },
  { value: "bitrate", label: "Bitrate" },
  { value: "temperature", label: "Temp" },
];

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
    fields: initial?.integration?.fields?.map((f) => ({ path: f.path, label: f.label, type: (f.type as IntegrationFieldType) || "text" })) || [],
    display: initial?.integration?.display || "inline",
    pollInterval: initial?.integration?.pollInterval || 60,
  });
  const nameRef = useRef<HTMLInputElement>(null);
  const iconTouchedRef = useRef(false);
  const [iconSearch, setIconSearch] = useState("");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    if (open) {
      iconTouchedRef.current = false;
      setShowIconPicker(false);
      setIconSearch("");
      setSelectedTemplate("");
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
        fields: initial?.integration?.fields?.map((f) => ({ path: f.path, label: f.label, type: (f.type as IntegrationFieldType) || "text" })) || [],
        display: initial?.integration?.display || "inline",
        pollInterval: initial?.integration?.pollInterval || 60,
      });
      setTimeout(() => nameRef.current?.focus(), 50);
    }
  }, [open, initial]);

  if (!open) return null;

  function applyTemplate(templateId: string) {
    const tmpl = INTEGRATION_TEMPLATES.find((t) => t.id === templateId);
    if (!tmpl) return;
    setIntegration((p) => ({
      ...p,
      endpoint: tmpl.endpoint,
      headersStr: tmpl.headers ? Object.entries(tmpl.headers).map(([k, v]) => `${k}: ${v}`).join("\n") : "",
      fields: tmpl.fields.map((f) => ({ path: f.path, label: f.label, type: f.type })),
      display: tmpl.display,
    }));
    setSelectedTemplate(templateId);
  }

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

    const fields = integration.fields.filter((f) => f.path.trim());
    if (fields.length === 0) return undefined;

    return {
      endpoint: integration.endpoint.trim(),
      headers,
      fields: fields.map((f) => ({ path: f.path.trim(), label: f.label.trim(), type: f.type })),
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

  function updateField(index: number, key: keyof FieldEntry, value: string) {
    setIntegration((p) => {
      const fields = [...p.fields];
      fields[index] = { ...fields[index], [key]: value };
      return { ...p, fields };
    });
  }

  function addField() {
    setIntegration((p) => ({ ...p, fields: [...p.fields, { path: "", label: "", type: "text" }] }));
  }

  function removeField(index: number) {
    setIntegration((p) => {
      const fields = [...p.fields];
      fields.splice(index, 1);
      return { ...p, fields };
    });
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
                  {/* Template picker */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Template</label>
                    <select
                      value={selectedTemplate}
                      onChange={(e) => applyTemplate(e.target.value)}
                      className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
                    >
                      <option value="">Custom (no template)</option>
                      {INTEGRATION_TEMPLATES.map((t) => (
                        <option key={t.id} value={t.id}>{t.icon} {t.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Endpoint URL</label>
                    <input
                      value={integration.endpoint}
                      onChange={(e) => setIntegration((p) => ({ ...p, endpoint: e.target.value }))}
                      placeholder="http://localhost:8096/Sessions?ActiveWithinMinutes=20"
                      className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                  {/* Structured fields */}
                  <div>
                    <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">Fields</label>
                    <div className="flex flex-col gap-1.5">
                      {integration.fields.map((field, i) => (
                        <div key={i} className="flex gap-1 items-center">
                          <input
                            value={field.path}
                            onChange={(e) => updateField(i, "path", e.target.value)}
                            placeholder="data.path"
                            className="flex-1 px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] placeholder:text-[var(--text-tertiary)]"
                          />
                          <input
                            value={field.label}
                            onChange={(e) => updateField(i, "label", e.target.value)}
                            placeholder="Label"
                            className="w-20 px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] placeholder:text-[var(--text-tertiary)]"
                          />
                          <select
                            value={field.type}
                            onChange={(e) => updateField(i, "type", e.target.value)}
                            className="px-2 py-1.5 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs text-[var(--text)] outline-none"
                          >
                            {FIELD_TYPES.map((ft) => (
                              <option key={ft.value} value={ft.value}>{ft.label}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => removeField(i)}
                            className="p-1 text-[var(--error)] hover:bg-[var(--error-soft)] rounded cursor-pointer bg-transparent border-none"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addField}
                        className="text-xs text-[var(--accent)] cursor-pointer bg-transparent border-none p-0 hover:underline w-fit"
                      >
                        + Add field
                      </button>
                    </div>
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
