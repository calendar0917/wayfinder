"use client";

import { useState, useCallback } from "react";
import type { Bookmark } from "@/types/config";
import WidgetRow from "@/components/layout/WidgetRow";
import BookmarkGrid from "@/components/bookmarks/BookmarkGrid";
import BookmarkEditModal from "@/components/bookmarks/BookmarkEditModal";
import AISidePanel from "@/components/ai/AISidePanel";
import CommandPalette from "@/components/command-palette/CommandPalette";
import EditModeToggle from "@/components/editing/EditModeToggle";
import SettingsDialog from "@/components/editing/SettingsDialog";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useConfig } from "@/hooks/useConfig";
import { useMutate } from "@/hooks/useMutate";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useStatusCheck } from "@/hooks/useStatusCheck";
import type { Group } from "@/types/config";

type Theme = "auto" | "light" | "dark";

function flattenBookmarks(groups: Group[]): Bookmark[] {
  const result: Bookmark[] = [];
  function walk(groups: Group[]) {
    for (const g of groups) {
      result.push(...g.bookmarks);
      if (g.groups) walk(g.groups);
    }
  }
  walk(groups);
  return result;
}

export default function Dashboard() {
  const { config, setConfig, authenticated, setAuthenticated, canEdit, fetchConfig, applyTheme } = useConfig();

  const [editMode, setEditMode] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Bookmark modal state
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [bookmarkModalGroup, setBookmarkModalGroup] = useState<string | null>(null);
  const [bookmarkModalInitial, setBookmarkModalInitial] = useState<{
    name?: string; url?: string; icon?: string; description?: string; tags?: string[]; statusCheck?: boolean;
  } | undefined>(undefined);
  const [bookmarkModalMode, setBookmarkModalMode] = useState<"add" | "edit">("add");

  // Add group modal
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const mutate = useMutate({ setConfig, setAuthenticated, applyTheme, fetchConfig });

  // Flatten all bookmarks recursively for status checking
  const allBookmarks = config ? flattenBookmarks(config.groups) : [];
  const { statuses } = useStatusCheck(allBookmarks);

  useKeyboard(
    { aiOpen, paletteOpen, settingsOpen },
    { setAiOpen, setPaletteOpen, setSettingsOpen, authenticated },
    config?.groups
  );

  const handleThemeChange = useCallback(
    async (theme: Theme) => {
      applyTheme(theme);
      if (authenticated) await mutate("change_theme", { theme });
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

  const handleReorderBookmark = useCallback(
    async (groupName: string, fromIndex: number, toIndex: number) => {
      await mutate("reorder_bookmark", { group: groupName, fromIndex, toIndex });
    },
    [mutate]
  );

  const handleUndo = useCallback(async () => {
    try {
      const res = await fetch("/api/config/undo", { method: "POST" });
      if (res.status === 401) { setAuthenticated(false); return; }
      const data = await res.json();
      if (data.success) fetchConfig();
    } catch { /* ignore */ }
  }, [fetchConfig, setAuthenticated]);

  // --- Bookmark modal handlers ---
  const openAddBookmark = useCallback((groupName: string) => {
    setBookmarkModalGroup(groupName);
    setBookmarkModalInitial(undefined);
    setBookmarkModalMode("add");
    setBookmarkModalOpen(true);
  }, []);

  const openEditBookmark = useCallback((groupName: string, bookmark: Bookmark) => {
    setBookmarkModalGroup(groupName);
    setBookmarkModalInitial({
      name: bookmark.name,
      url: bookmark.url,
      icon: bookmark.icon,
      description: bookmark.description,
      tags: bookmark.tags,
      statusCheck: bookmark.statusCheck,
    });
    setBookmarkModalMode("edit");
    setBookmarkModalOpen(true);
  }, []);

  const handleBookmarkModalSave = useCallback(
    async (data: { name: string; url: string; icon: string; description: string; tags: string[]; statusCheck?: boolean }) => {
      if (!bookmarkModalGroup) return;
      setBookmarkModalOpen(false);
      if (bookmarkModalMode === "edit" && bookmarkModalInitial?.name) {
        await mutate("update_bookmark", {
          name: bookmarkModalInitial.name,
          group: bookmarkModalGroup,
          newName: data.name !== bookmarkModalInitial.name ? data.name : undefined,
          url: data.url !== bookmarkModalInitial.url ? data.url : undefined,
          icon: data.icon !== bookmarkModalInitial.icon ? data.icon : undefined,
          description: data.description !== bookmarkModalInitial.description ? data.description : undefined,
          tags: JSON.stringify(data.tags) !== JSON.stringify(bookmarkModalInitial.tags) ? data.tags : undefined,
          statusCheck: data.statusCheck !== bookmarkModalInitial.statusCheck ? data.statusCheck : undefined,
        });
      } else {
        await mutate("add_bookmark", { ...data, group: bookmarkModalGroup });
      }
    },
    [bookmarkModalGroup, bookmarkModalMode, bookmarkModalInitial, mutate]
  );

  // --- Add group handler ---
  const handleAddGroup = useCallback(async () => {
    setAddGroupOpen(true);
  }, []);

  const handleAddGroupSubmit = useCallback(async () => {
    if (!newGroupName.trim()) return;
    setAddGroupOpen(false);
    await mutate("add_group", { name: newGroupName.trim() });
    setNewGroupName("");
  }, [newGroupName, mutate]);

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
          if (res.status === 401) { setAuthenticated(false); return; }
          const data = await res.json();
          if (data.version) { setConfig(data); applyTheme(data.settings?.theme || "auto"); }
          continue;
        }
        const result = await mutate(m.operation, m.arguments);
        if (m.operation === "set_password" && result.success) await fetchConfig();
      }
    },
    [config, mutate, applyTheme, fetchConfig, setConfig, setAuthenticated]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    fetchConfig();
  }, [fetchConfig, setAuthenticated]);

  const handleAiChat = useCallback(async (message: string): Promise<string> => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
    });
    if (res.status === 401) { setAuthenticated(false); return "Please login first."; }
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
  }, [setAuthenticated]);

  if (!config) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <header className="sticky top-0 z-10 bg-[var(--bg)] border-b border-[var(--border)]">
          <div className="max-w-screen-xl mx-auto px-6 h-12 flex items-center gap-3">
            <div className="w-32 h-5 bg-[var(--surface-hover)] rounded animate-pulse mr-auto" />
            <div className="w-20 h-7 bg-[var(--surface-hover)] rounded-[var(--radius-sm)] animate-pulse" />
          </div>
        </header>
        <main className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
          <div className="flex gap-4">
            <div className="w-40 h-20 bg-[var(--surface-hover)] rounded-[var(--radius-md)] animate-pulse" />
            <div className="w-56 h-20 bg-[var(--surface-hover)] rounded-[var(--radius-md)] animate-pulse" />
            <div className="w-32 h-20 bg-[var(--surface-hover)] rounded-[var(--radius-md)] animate-pulse" />
            <div className="w-40 h-20 bg-[var(--surface-hover)] rounded-[var(--radius-md)] animate-pulse" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="h-40 bg-[var(--surface-hover)] rounded-[var(--radius-lg)] animate-pulse" />
            <div className="h-40 bg-[var(--surface-hover)] rounded-[var(--radius-lg)] animate-pulse" />
            <div className="h-40 bg-[var(--surface-hover)] rounded-[var(--radius-lg)] animate-pulse" />
          </div>
        </main>
      </div>
    );
  }

  const currentTheme = (config.settings.theme || "auto") as Theme;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <header className="sticky top-0 z-10 bg-[var(--bg)] border-b border-[var(--border)]">
        <div className="max-w-screen-xl mx-auto px-6 h-12 flex items-center gap-3">
          <h1 className="text-[1.25rem] font-bold tracking-tight text-[var(--text)] mr-auto">
            {config.settings.title}
          </h1>
          <div className="flex items-center gap-2 header-actions">
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
            <ThemeToggle theme={currentTheme} onChange={handleThemeChange} />
            {canEdit && <EditModeToggle active={editMode} onToggle={() => setEditMode((p) => !p)} />}
            {canEdit && (
              <button
                onClick={handleUndo}
                title="Undo last change"
                className="bg-[var(--surface-alt)] text-[var(--text-secondary)] border border-[var(--border)] rounded-[var(--radius-sm)] px-2.5 py-1.5 text-xs cursor-pointer transition-all duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] hover:border-[var(--border-hover)]"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="1 4 1 10 7 10" /><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                </svg>
              </button>
            )}
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

      <main className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col gap-6">
        {config.widgets.length > 0 && (
          <WidgetRow widgets={config.widgets} title={config.settings.title} editMode={editMode && canEdit} onRemoveWidget={(i) => mutate("remove_widget", { index: i })} onAddWidget={() => mutate("add_widget", { type: "notes" })} />
        )}
        <BookmarkGrid
          groups={config.groups}
          columns={config.settings.layout.columns}
          editMode={editMode && canEdit}
          onDeleteBookmark={handleDeleteBookmark}
          onAddBookmark={openAddBookmark}
          onEditBookmark={openEditBookmark}
          onDeleteGroup={handleDeleteGroup}
          onAddGroup={handleAddGroup}
          onReorderBookmark={handleReorderBookmark}
          statuses={statuses}
        />
      </main>

      <AISidePanel open={aiOpen} onClose={() => setAiOpen(false)} onConfigUpdate={fetchConfig} authenticated={authenticated} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={config.groups} searchEngine={config.settings.search.engine} customUrl={config.settings.search.customUrl} authenticated={authenticated} onAiChat={handleAiChat} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={config.settings} onSave={handleSettingsSave} onLogout={handleLogout} authenticated={authenticated} />

      {/* Bookmark add/edit modal */}
      <BookmarkEditModal
        open={bookmarkModalOpen}
        onClose={() => setBookmarkModalOpen(false)}
        onSave={handleBookmarkModalSave}
        initial={bookmarkModalInitial}
        title={bookmarkModalMode === "edit" ? "Edit Bookmark" : `Add Bookmark to ${bookmarkModalGroup || ""}`}
      />

      {/* Add group simple modal */}
      {addGroupOpen && (
        <>
          <div className="fixed inset-0 bg-[rgba(var(--bg-rgb),0.6)] backdrop-blur-[4px)] z-[200] animate-[fadeIn_0.15s_ease]" onClick={() => setAddGroupOpen(false)} />
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="w-full max-w-[360px] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]" onClick={(e) => e.stopPropagation()}>
              <div className="px-5 py-3 border-b border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--text)]">Add Group</h3>
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); handleAddGroupSubmit(); }}
                className="p-5 flex flex-col gap-3"
              >
                <input
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="Group name"
                  className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] placeholder:text-[var(--text-tertiary)]"
                  autoFocus
                />
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setAddGroupOpen(false)} className="px-4 py-2 bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm font-medium cursor-pointer hover:bg-[var(--surface-hover)]">Cancel</button>
                  <button type="submit" disabled={!newGroupName.trim()} className="px-4 py-2 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed">Create</button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
