"use client";

import { useState, useEffect, useRef } from "react";
import type { Settings } from "@/types/config";
import { useToast } from "@/components/ui/ToastProvider";
import { parseNetscapeBookmark } from "@/lib/bookmark-parser";
import { normalizeHomepageConfig, normalizeDashyConfig } from "@/lib/import-normalizers";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (changes: { operation: string; arguments: Record<string, unknown> }[]) => void;
  onImport?: () => void;
  onLogout?: () => void;
  authenticated: boolean;
}

type ImportFormat = "json" | "browser" | "homepage" | "dashy";

export default function SettingsDialog({
  open,
  onClose,
  settings,
  onSave,
  onImport,
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
  const [locale, setLocale] = useState(settings.locale || "en");
  const [apiKey, setApiKey] = useState("");
  const [apiBase, setApiBase] = useState(settings.apiBase || "");
  const [aiModel, setAiModel] = useState(settings.aiModel || "");
  const [customCss, setCustomCss] = useState(settings.customCss || "");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [importFormat, setImportFormat] = useState<ImportFormat>("json");

  useEffect(() => {
    setTitle(settings.title);
    setColumns(settings.layout.columns);
    setSearchEngine(settings.search.engine);
    setCustomUrl(settings.search.customUrl);
    setTheme(settings.theme);
    setLocale(settings.locale || "en");
    setApiKey("");
    setApiBase(settings.apiBase || "");
    setAiModel(settings.aiModel || "");
    setCustomCss(settings.customCss || "");
    setNewPassword("");
    setImportFormat("json");
  }, [settings, open]);

  async function handleSave() {
    setSaving(true);
    const mutations: { operation: string; arguments: Record<string, unknown> }[] = [];

    if (title !== settings.title) {
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
    if (locale !== (settings.locale || "en")) {
      mutations.push({ operation: "update_locale", arguments: { locale } });
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
    if (customCss !== (settings.customCss || "")) {
      mutations.push({ operation: "update_custom_css", arguments: { css: customCss } });
    }

    if (mutations.length > 0) {
      onSave(mutations);
    }
    setSaving(false);
    onClose();
  }

  async function handleImportFile(file: File) {
    try {
      const text = await file.text();

      if (importFormat === "json") {
        const data = JSON.parse(text);
        await doImport(data.groups, "merge");
      } else if (importFormat === "browser") {
        const groups = parseNetscapeBookmark(text);
        if (groups.length === 0) {
          toast("No bookmarks found in HTML file", "error");
          return;
        }
        const totalBookmarks = groups.reduce((acc, g) => acc + g.bookmarks.length, 0);
        await doImport(groups, "merge");
        toast(`Imported ${totalBookmarks} bookmarks from ${groups.length} groups`, "success");
      } else if (importFormat === "homepage") {
        const groups = normalizeHomepageConfig(text);
        if (groups.length === 0) {
          toast("No services found in Homepage YAML", "error");
          return;
        }
        await doImport(groups, "merge");
      } else if (importFormat === "dashy") {
        const groups = normalizeDashyConfig(text);
        if (groups.length === 0) {
          toast("No sections found in Dashy YAML", "error");
          return;
        }
        await doImport(groups, "merge");
      }
    } catch (e) {
      toast(`Import failed: ${e instanceof Error ? e.message : "Invalid file"}`, "error");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function doImport(groups: unknown[], mode: string) {
    const res = await fetch("/api/config/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groups, mode }),
    });
    const result = await res.json();
    if (result.success) {
      toast(result.result, "success");
      onSave([]);
      onImport?.();
    } else {
      toast(result.error || "Import failed", "error");
    }
  }

  const fileAccept = importFormat === "browser" ? ".html,.htm" : importFormat === "json" ? ".json" : ".yaml,.yml";

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
            {/* Locale */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-[var(--text-secondary)]">Language</label>
              <select
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
              >
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="de">Deutsch</option>
                <option value="fr">Français</option>
                <option value="es">Español</option>
                <option value="pt">Português</option>
                <option value="ru">Русский</option>
              </select>
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
                  placeholder="https://api.openai.com/v1"
                  className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-[var(--text-secondary)]">Model</label>
                <input
                  value={aiModel}
                  onChange={(e) => setAiModel(e.target.value)}
                  placeholder="e.g. gpt-4o, deepseek-v3"
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

            {/* Custom CSS */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Custom CSS</label>
              <textarea
                value={customCss}
                onChange={(e) => setCustomCss(e.target.value)}
                placeholder={":root { --accent: #10b981; }\n.bookmark-card { border-radius: 12px; }"}
                rows={4}
                className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-xs font-mono text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)] resize-y"
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
                      a.download = `wayfinder-bookmarks-${new Date().toISOString().split("T")[0]}.json`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast("Bookmarks exported", "success");
                    } catch { toast("Export failed", "error"); }
                  }}
                  className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]"
                >
                  Export JSON
                </button>
                <select
                  value={importFormat}
                  onChange={(e) => setImportFormat(e.target.value as ImportFormat)}
                  className="px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none"
                >
                  <option value="json">JSON (native)</option>
                  <option value="browser">Browser Bookmarks (HTML)</option>
                  <option value="homepage">Homepage (YAML)</option>
                  <option value="dashy">Dashy (YAML)</option>
                </select>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:border-[var(--border-hover)]"
                >
                  Import
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={fileAccept}
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    await handleImportFile(file);
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
