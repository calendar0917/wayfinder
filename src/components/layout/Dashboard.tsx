"use client";

import { useState, useEffect, useCallback } from "react";
import type { SafeConfig } from "@/types/config";
import WidgetRow from "@/components/layout/WidgetRow";
import BookmarkGrid from "@/components/bookmarks/BookmarkGrid";
import AISidePanel from "@/components/ai/AISidePanel";
import CommandPalette from "@/components/command-palette/CommandPalette";
import EditModeToggle from "@/components/editing/EditModeToggle";
import SettingsDialog from "@/components/editing/SettingsDialog";
import ThemeToggle from "@/components/ui/ThemeToggle";

type Theme = "auto" | "light" | "dark";

function resolveTheme(t: Theme): string {
  if (t === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return t;
}

export default function Dashboard() {
  const [config, setConfig] = useState<SafeConfig | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", resolveTheme(t));
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const [cfgRes, authRes] = await Promise.all([
        fetch("/api/config"),
        fetch("/api/auth/status"),
      ]);
      const cfg = await cfgRes.json();
      const auth = await authRes.json();
      setConfig(cfg);
      setAuthRequired(auth.authRequired);
      setAuthenticated(auth.authenticated);
      applyTheme(cfg?.settings?.theme || "auto");
      try { localStorage.setItem("homepage-config", JSON.stringify(cfg)); } catch {}
    } catch {
      // will retry
    }
  }, [applyTheme]);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const inInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";

      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((prev) => !prev);
        return;
      }
      if (e.key === "/" && !inInput) {
        e.preventDefault();
        setPaletteOpen(true);
        return;
      }
      if (e.key === "j" && (e.metaKey || e.ctrlKey) && authenticated) {
        e.preventDefault();
        setAiOpen((prev) => !prev);
        return;
      }
      if (e.key === "Escape") {
        if (aiOpen) { setAiOpen(false); return; }
        if (paletteOpen) { setPaletteOpen(false); return; }
        if (settingsOpen) { setSettingsOpen(false); return; }
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [aiOpen, paletteOpen, settingsOpen, authenticated]);

  // mutate with 401 handling
  const mutate = useCallback(
    async (operation: string, args: Record<string, unknown>) => {
      const res = await fetch("/api/config/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, arguments: args }),
      });
      if (res.status === 401) {
        setAuthenticated(false);
        return { success: false, result: "Unauthorized — please login." };
      }
      const data = await res.json();
      if (data.config) {
        setConfig(data.config);
        applyTheme(data.config.settings?.theme || "auto");
      } else {
        fetchConfig();
      }
      return data;
    },
    [fetchConfig, applyTheme]
  );

  const handleThemeChange = useCallback(
    async (theme: Theme) => {
      applyTheme(theme);
      if (authenticated) {
        await mutate("change_theme", { theme });
      }
    },
    [mutate, applyTheme, authenticated]
  );

  const handleDeleteBookmark = useCallback(
    async (groupName: string, bookmarkName: string) => {
      await mutate("remove_bookmark", { name: bookmarkName, group: groupName });
    },
    [mutate]
  );

  const handleDeleteGroup = useCallback(
    async (groupName: string) => {
      await mutate("remove_group", { name: groupName });
    },
    [mutate]
  );

  const handleAddBookmark = useCallback(
    async (groupName: string) => {
      const name = prompt("Bookmark name:");
      const url = prompt("Bookmark URL:");
      if (!name || !url) return;
      await mutate("add_bookmark", { name, url, group: groupName });
    },
    [mutate]
  );

  // settingsSave: always ends up calling mutate or config PUT (both require auth)
  const handleSettingsSave = useCallback(
    async (mutations: { operation: string; arguments: Record<string, unknown> }[]) => {
      for (const m of mutations) {
        if (m.operation === "update_title" || m.operation === "update_search") {
          const current = { ...config! };
          const settings: Record<string, unknown> = {
            title: current.settings.title,
            theme: current.settings.theme,
            layout: current.settings.layout,
            search: current.settings.search,
            apiKey: current.settings.apiKey,
            apiBase: current.settings.apiBase,
            aiModel: current.settings.aiModel,
            passwordHash: current.settings.passwordHash,
          };
          if (m.operation === "update_title") settings.title = m.arguments.title;
          if (m.operation === "update_search") settings.search = m.arguments;

          const res = await fetch("/api/config", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...current, settings }),
          });
          if (res.status === 401) {
            setAuthenticated(false);
            return;
          }
          const data = await res.json();
          if (data.version) { setConfig(data); applyTheme(data.settings?.theme || "auto"); }
          continue;
        }
        const result = await mutate(m.operation, m.arguments);
        // If password was set, set_password mutate auto-logs-in server-side
        if (m.operation === "set_password" && result.success) {
          await fetchConfig(); // refresh auth state since cookie was set
        }
      }
    },
    [config, mutate, applyTheme, fetchConfig]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    fetchConfig();
  }, [fetchConfig]);

  // AI chat from command palette
  const handleAiChat = useCallback(async (message: string): Promise<string> => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
    });
    if (res.status === 401) {
      setAuthenticated(false);
      return "Please login first.";
    }
    if (!res.ok) {
      try { const err = await res.json(); return err.error || "AI request failed"; } catch { return "AI request failed"; }
    }
    const reader = res.body?.getReader();
    if (!reader) return "No response stream";

    let result = "";
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === "text" && event.content) result += event.content;
        } catch { /* skip */ }
      }
    }
    return result || "No response.";
  }, []);

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-sm text-[var(--text-tertiary)]">Loading...</div>
      </div>
    );
  }

  const currentTheme = (config.settings.theme || "auto") as Theme;
  // canEdit: user has write access (either no password required, or logged in)
  const canEdit = !authRequired || authenticated;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="max-w-screen-xl mx-auto px-6 h-12 flex items-center gap-3">
          <h1 className="text-[1.25rem] font-bold tracking-tight text-[var(--text)] mr-auto">
            {config.settings.title}
          </h1>
          <div className="flex items-center gap-2 header-actions">
            {/* Search — always available */}
            <button
              onClick={() => setPaletteOpen(true)}
              className="bg-[var(--surface-alt)] text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)] flex items-center gap-1.5"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="btn-label">Search</span>
              <kbd className="hidden sm:inline-flex items-center px-1 py-0.5 text-[0.6rem] font-mono text-[var(--text-tertiary)] bg-[var(--surface)] border border-[var(--border)] rounded ml-1">/</kbd>
            </button>
            {/* Theme — always available (view-only toggle for non-auth) */}
            <ThemeToggle theme={currentTheme} onChange={handleThemeChange} />
            {/* Edit mode — only when authenticated */}
            {canEdit && (
              <EditModeToggle active={editMode} onToggle={() => setEditMode((p) => !p)} />
            )}
            {/* AI — only when authenticated */}
            {canEdit && (
              <button
                onClick={() => setAiOpen((p) => !p)}
                className="bg-[var(--surface-alt)] text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)] flex items-center gap-1"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a4 4 0 0 1 4 4c0 1.95-1.4 3.58-3.25 3.93V12h2.75a2.5 2.5 0 0 1 2.5 2.5V18a2 2 0 1 1-2 0v-3.5a.5.5 0 0 0-.5-.5h-7a.5.5 0 0 0-.5.5V18a2 2 0 1 1-2 0v-3.5a2.5 2.5 0 0 1 2.5-2.5h2.75V9.93A4.002 4.002 0 0 1 12 2z" />
                </svg>
                <span className="btn-label">AI</span>
              </button>
            )}
            {/* Settings / Login */}
            {canEdit ? (
              <button
                onClick={() => setSettingsOpen(true)}
                className="bg-[var(--surface-alt)] text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-medium cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span className="btn-label">Settings</span>
              </button>
            ) : (
              <a
                href="/login"
                className="bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] px-3 py-1.5 text-xs font-semibold no-underline cursor-pointer transition-all duration-150 hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-accent)] hover:-translate-y-px active:translate-y-0"
              >
                Login
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
        {config.widgets.length > 0 && (
          <WidgetRow widgets={config.widgets} title={config.settings.title} />
        )}
        <BookmarkGrid
          groups={config.groups}
          columns={config.settings.layout.columns}
          editMode={editMode && canEdit}
          onDeleteBookmark={handleDeleteBookmark}
          onAddBookmark={handleAddBookmark}
          onDeleteGroup={handleDeleteGroup}
        />
      </main>

      {/* Panels */}
      <AISidePanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onConfigUpdate={fetchConfig}
        authenticated={authenticated}
      />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        groups={config.groups}
        searchEngine={config.settings.search.engine}
        customUrl={config.settings.search.customUrl}
        authenticated={authenticated}
        onAiChat={handleAiChat}
      />
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        settings={config.settings}
        onSave={handleSettingsSave}
        onLogout={handleLogout}
        authenticated={authenticated}
      />
    </div>
  );
}
