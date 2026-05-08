"use client";

import { useState, useEffect, useRef } from "react";
import type { Settings } from "@/types/config";
import { useToast } from "@/components/ui/ToastProvider";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (changes: { operation: string; arguments: Record<string, unknown> }[]) => void;
  onLogout?: () => void;
  authenticated: boolean;
}

export default function SettingsDialog({
  open,
  onClose,
  settings,
  onSave,
  onLogout,
  authenticated,
}: SettingsDialogProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(settings.title);
  const [columns, setColumns] = useState(settings.layout.columns);
  const [searchEngine, setSearchEngine] = useState(settings.search.engine);
  const [customUrl, setCustomUrl] = useState(settings.search.customUrl);
  const [theme, setTheme] = useState(settings.theme);
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState(settings.apiKey === "***" ? "" : settings.apiBase);
  const [aiModel, setAiModel] = useState(settings.apiKey === "***" ? "" : settings.aiModel);
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(settings.title);
    setColumns(settings.layout.columns);
    setSearchEngine(settings.search.engine);
    setCustomUrl(settings.search.customUrl);
    setTheme(settings.theme);
    setApiKey("");
    setApiBase(settings.apiKey === "***" ? settings.apiBase : "");
    setAiModel(settings.apiKey === "***" ? settings.aiModel : "");
    setNewPassword("");
  }, [settings, open]);

  async function handleSave() {
    setSaving(true);
    const mutations: { operation: string; arguments: Record<string, unknown> }[] = [];

    if (title !== settings.title) {
      // Title needs full config PUT, handled separately
      mutations.push({ operation: "update_title", arguments: { title } });
    }
    if (columns !== settings.layout.columns) {
      mutations.push({ operation: "change_layout", arguments: { columns } });
    }
    if (searchEngine !== settings.search.engine || customUrl !== settings.search.customUrl) {
      mutations.push({ operation: "update_search", arguments: { engine: searchEngine, customUrl } });
    }
    if (theme !== settings.theme) {
      mutations.push({ operation: "change_theme", arguments: { theme } });
    }
    if (apiKey || apiBase || aiModel) {
      const aiArgs: Record<string, unknown> = {};
      if (apiKey) aiArgs.apiKey = apiKey;
      if (apiBase) aiArgs.apiBase = apiBase;
      if (aiModel) aiArgs.aiModel = aiModel;
      mutations.push({ operation: "update_ai_settings", arguments: aiArgs });
    }
    if (newPassword && newPassword.length >= 4) {
      mutations.push({ operation: "set_password", arguments: { password: newPassword } });
    }

    if (mutations.length > 0) {
      onSave(mutations);
    }
    setSaving(false);
    onClose();
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-[rgba(var(--bg-rgb),0.6)] backdrop-blur-[4px)] z-[200] animate-[fadeIn_0.15s_ease]"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 overflow-y-auto">
        <div
          className="w-full max-w-[480px] my-8 bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h2 className="text-base font-bold text-[var(--text)]">Settings</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="px-5 py-4 flex flex-col gap-4 max-h-[70vh] overflow-y-auto">
            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Dashboard Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            {/* Columns */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                Columns ({columns})
              </label>
              <input
                type="range"
                min={1}
                max={6}
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="w-full accent-[var(--accent)]"
              />
            </div>
            {/* Search Engine */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Search Engine</label>
              <select
                value={searchEngine}
                onChange={(e) => setSearchEngine(e.target.value)}
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              >
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="google">Google</option>
                <option value="bing">Bing</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {searchEngine === "custom" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Custom Search URL</label>
                <input
                  value={customUrl}
                  onChange={(e) => setCustomUrl(e.target.value)}
                  placeholder="https://example.com/search?q="
                  className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            )}
            {/* Theme */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Theme</label>
              <div className="flex gap-2">
                {(["auto", "light", "dark"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={`px-3 py-1.5 text-xs font-medium border rounded-[var(--radius-sm)] cursor-pointer transition-all duration-150 ${
                      theme === t
                        ? "bg-[var(--accent-soft)] text-[var(--accent)] border-[var(--accent)]"
                        : "bg-[var(--surface-alt)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)]"
                    }`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* AI Settings */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">AI Provider</label>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={settings.apiKey === "***" ? "Configured (leave blank to keep)" : "Not set"}
                  className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">API Base URL</label>
                <input
                  value={apiBase}
                  onChange={(e) => setApiBase(e.target.value)}
                  placeholder={settings.apiKey === "***" ? settings.apiBase : "https://api.openai.com/v1"}
                  className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Model</label>
                <input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder={settings.apiKey === "***" ? settings.aiModel : "e.g. gpt-4o, deepseek-v3"}
                  className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">
                {settings.passwordHash ? "Change Password" : "Set Password"}
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 4 characters"
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
              />
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--border)]" />

            {/* Import/Export */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Bookmarks</label>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/config/export");
                      if (!res.ok) { toast("Export failed", "error"); return; }
                      const blob = await res.blob();
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `homepage-bookmarks-${new Date().toISOString().split("T")[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast("Bookmarks exported", "success");
                    } catch { toast("Export failed", "error"); }
                  }}
                  className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]"
                >
                  Export JSON
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]"
                >
                  Import JSON
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      const text = await file.text();
                      const data = JSON.parse(text);
                      const res = await fetch("/api/config/import", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ groups: data.groups, mode: "merge" }),
                      });
                      const result = await res.json();
                      if (result.success) {
                        toast(result.result, "success");
                        onSave([]);
                      } else {
                        toast(result.error || "Import failed", "error");
                      }
                    } catch { toast("Invalid JSON file", "error"); }
                    e.target.value = "";
                  }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
            {authenticated && onLogout ? (
              <button
                onClick={() => { onLogout(); onClose(); }}
                className="px-4 py-2 bg-[var(--error-soft)] text-[var(--error)] border border-[var(--error)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--error)] hover:text-white"
              >
                Logout
              </button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-all duration-150 shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-accent)] hover:-translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
