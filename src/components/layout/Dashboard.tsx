"use client";

import { useState, useCallback } from "react";
import type { Bookmark } from "@/types/config";
import WidgetRow from "@/components/layout/WidgetRow";
import BookmarkGrid from "@/components/bookmarks/BookmarkGrid";
import BookmarkEditModal from "@/components/bookmarks/BookmarkEditModal";
import AddGroupModal from "@/components/bookmarks/AddGroupModal";
import AISidePanel from "@/components/ai/AISidePanel";
import CommandPalette from "@/components/command-palette/CommandPalette";
import EditModeToggle from "@/components/editing/EditModeToggle";
import SettingsDialog from "@/components/editing/SettingsDialog";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { useConfig } from "@/hooks/useConfig";
import { useMutate } from "@/hooks/useMutate";
import { useKeyboard } from "@/hooks/useKeyboard";
import { useStatusCheck } from "@/hooks/useStatusCheck";
import { useDockerStatus } from "@/hooks/useDockerStatus";
import { useIntegration } from "@/hooks/useIntegration";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { Group, SafeConfig } from "@/types/config";

type Theme = "auto" | "light" | "dark";

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function predictConfig(
  config: SafeConfig,
  operation: string,
  args: Record<string, unknown>
): SafeConfig | null {
  const next = deepClone(config);
  try {
    switch (operation) {
      case "add_bookmark": {
        const groupName = (args.group as string) || next.groups[0]?.name;
        const group = next.groups.find((g) => g.name === groupName);
        if (!group) return null;
        if (!group.bookmarks) group.bookmarks = [];
        group.bookmarks.push({
          name: args.name as string,
          url: args.url as string,
          icon: (args.icon as string) || "",
          description: (args.description as string) || "",
          shortcut: "",
          tags: (args.tags as string[]) || [],
          server: (args.server as string) || "",
          container: (args.container as string) || "",
          statusCheck: (args.statusCheck as boolean) || false,
        });
        return next;
      }
      case "remove_bookmark": {
        for (const g of next.groups) {
          const idx = g.bookmarks?.findIndex((b) => b.name === args.name) ?? -1;
          if (idx >= 0) { g.bookmarks.splice(idx, 1); return next; }
        }
        return null;
      }
      case "update_bookmark": {
        for (const g of next.groups) {
          const b = g.bookmarks?.find((b) => b.name === args.name);
          if (b) {
            if (args.newName) b.name = args.newName as string;
            if (args.url) b.url = args.url as string;
            if (args.icon !== undefined) b.icon = args.icon as string;
            if (args.description !== undefined) b.description = args.description as string;
            if (args.tags !== undefined) b.tags = args.tags as string[];
            if (args.statusCheck !== undefined) b.statusCheck = args.statusCheck as boolean;
            return next;
          }
        }
        return null;
      }
      case "add_group": {
        next.groups.push({
          name: args.name as string,
          icon: "",
          collapsed: false,
          bookmarks: [],
          groups: [],
        });
        return next;
      }
      case "remove_group": {
        const idx = next.groups.findIndex((g) => g.name === args.name);
        if (idx >= 0) { next.groups.splice(idx, 1); return next; }
        return null;
      }
      case "rename_group": {
        const g = next.groups.find((g) => g.name === args.oldName);
        if (g) { g.name = args.newName as string; return next; }
        return null;
      }
      case "reorder_bookmark": {
        const group = next.groups.find((g) => g.name === args.group);
        if (!group?.bookmarks) return null;
        const from = args.fromIndex as number;
        const to = args.toIndex as number;
        const [bm] = group.bookmarks.splice(from, 1);
        group.bookmarks.splice(to, 0, bm);
        return next;
      }
      case "change_theme": {
        next.settings.theme = args.theme as Theme;
        return next;
      }
      case "update_title": {
        next.settings.title = args.title as string;
        return next;
      }
      case "update_search": {
        if (args.engine) next.settings.search.engine = args.engine as string;
        if (args.customUrl !== undefined) next.settings.search.customUrl = args.customUrl as string;
        return next;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

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
    integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string }>; display: string; pollInterval: number };
  } | undefined>(undefined);
  const [bookmarkModalMode, setBookmarkModalMode] = useState<"add" | "edit">("add");

  // Add group modal
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  const { mutate, optimisticMutate } = useMutate({ setConfig, setAuthenticated, applyTheme, fetchConfig });

  // Flatten all bookmarks recursively for status checking
  const allBookmarks = config ? flattenBookmarks(config.groups) : [];
  const { statuses } = useStatusCheck(allBookmarks);
  const { statuses: dockerStatuses } = useDockerStatus(allBookmarks);
  const integrationBookmarks = allBookmarks.filter((b) => b.integration).map((b) => ({ key: b.name, config: b.integration! }));
  const { results: integrationResults } = useIntegration(integrationBookmarks);

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
      if (!config) return;
      const predicted = predictConfig(config, "remove_bookmark", { name: bookmarkName, group: groupName });
      if (predicted) await optimisticMutate("remove_bookmark", { name: bookmarkName, group: groupName }, predicted);
      else await mutate("remove_bookmark", { name: bookmarkName, group: groupName });
    },
    [config, mutate, optimisticMutate]
  );

  const handleDeleteGroup = useCallback(
    async (groupName: string) => {
      if (!config) return;
      const predicted = predictConfig(config, "remove_group", { name: groupName });
      if (predicted) await optimisticMutate("remove_group", { name: groupName }, predicted);
      else await mutate("remove_group", { name: groupName });
    },
    [config, mutate, optimisticMutate]
  );

  const handleReorderBookmark = useCallback(
    async (groupName: string, fromIndex: number, toIndex: number) => {
      if (!config) return;
      const predicted = predictConfig(config, "reorder_bookmark", { group: groupName, fromIndex, toIndex });
      if (predicted) await optimisticMutate("reorder_bookmark", { group: groupName, fromIndex, toIndex }, predicted);
      else await mutate("reorder_bookmark", { group: groupName, fromIndex, toIndex });
    },
    [config, mutate, optimisticMutate]
  );

  const handleUndo = useCallback(async () => {
    try {
      const res = await fetch("/api/config/undo", { method: "POST" });
      if (res.status === 401) { setAuthenticated(false); window.location.href = "/login"; return; }
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
      integration: bookmark.integration ? {
        endpoint: bookmark.integration.endpoint,
        headers: bookmark.integration.headers,
        fields: bookmark.integration.fields,
        display: bookmark.integration.display,
        pollInterval: bookmark.integration.pollInterval,
      } : undefined,
    });
    setBookmarkModalMode("edit");
    setBookmarkModalOpen(true);
  }, []);

  const handleBookmarkModalSave = useCallback(
    async (data: { name: string; url: string; icon: string; description: string; tags: string[]; statusCheck?: boolean; integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string }>; display: string; pollInterval: number } }) => {
      if (!bookmarkModalGroup || !config) return;
      setBookmarkModalOpen(false);
      if (bookmarkModalMode === "edit" && bookmarkModalInitial?.name) {
        const args = {
          name: bookmarkModalInitial.name,
          group: bookmarkModalGroup,
          newName: data.name !== bookmarkModalInitial.name ? data.name : undefined,
          url: data.url !== bookmarkModalInitial.url ? data.url : undefined,
          icon: data.icon !== bookmarkModalInitial.icon ? data.icon : undefined,
          description: data.description !== bookmarkModalInitial.description ? data.description : undefined,
          tags: JSON.stringify(data.tags) !== JSON.stringify(bookmarkModalInitial.tags) ? data.tags : undefined,
          statusCheck: data.statusCheck !== bookmarkModalInitial.statusCheck ? data.statusCheck : undefined,
        };
        const predicted = predictConfig(config, "update_bookmark", args);
        if (predicted) await optimisticMutate("update_bookmark", args, predicted);
        else await mutate("update_bookmark", args);
        // Handle integration changes
        const hadIntegration = !!bookmarkModalInitial.integration;
        const hasIntegration = !!data.integration;
        if (hasIntegration && !hadIntegration) {
          await mutate("configure_integration", {
            name: data.name,
            group: bookmarkModalGroup,
            endpoint: data.integration!.endpoint,
            headers: data.integration!.headers,
            fields: data.integration!.fields,
            display: data.integration!.display,
            pollInterval: data.integration!.pollInterval,
          });
        } else if (hasIntegration && hadIntegration) {
          await mutate("configure_integration", {
            name: data.name,
            group: bookmarkModalGroup,
            endpoint: data.integration!.endpoint,
            headers: data.integration!.headers,
            fields: data.integration!.fields,
            display: data.integration!.display,
            pollInterval: data.integration!.pollInterval,
          });
        } else if (!hasIntegration && hadIntegration) {
          await mutate("remove_integration", { name: data.name, group: bookmarkModalGroup });
        }
      } else {
        const args = { ...data, group: bookmarkModalGroup };
        const predicted = predictConfig(config, "add_bookmark", args);
        if (predicted) await optimisticMutate("add_bookmark", args, predicted);
        else await mutate("add_bookmark", args);
        // Configure integration after bookmark is added
        if (data.integration) {
          await mutate("configure_integration", {
            name: data.name,
            group: bookmarkModalGroup,
            endpoint: data.integration.endpoint,
            headers: data.integration.headers,
            fields: data.integration.fields,
            display: data.integration.display,
            pollInterval: data.integration.pollInterval,
          });
        }
      }
    },
    [bookmarkModalGroup, bookmarkModalMode, bookmarkModalInitial, config, mutate, optimisticMutate]
  );

  // --- Add group handler ---
  const handleAddGroup = useCallback(async () => {
    setAddGroupOpen(true);
  }, []);

  const handleAddGroupSubmit = useCallback(async (name: string) => {
    setAddGroupOpen(false);
    if (!config) return;
    const predicted = predictConfig(config, "add_group", { name });
    if (predicted) await optimisticMutate("add_group", { name }, predicted);
    else await mutate("add_group", { name });
  }, [config, mutate, optimisticMutate]);

  const handleSettingsSave = useCallback(
    async (mutations: { operation: string; arguments: Record<string, unknown> }[]) => {
      for (const m of mutations) {
        if (!config) { await mutate(m.operation, m.arguments); continue; }
        const predicted = predictConfig(config, m.operation, m.arguments);
        if (predicted) {
          const result = await optimisticMutate(m.operation, m.arguments, predicted);
          if (m.operation === "set_password" && result.success) await fetchConfig();
        } else {
          const result = await mutate(m.operation, m.arguments);
          if (m.operation === "set_password" && result.success) await fetchConfig();
        }
      }
    },
    [config, mutate, optimisticMutate, fetchConfig]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    window.location.href = "/login";
  }, [setAuthenticated]);

  const handleAiChat = useCallback(async (message: string): Promise<string> => {
    const res = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [{ role: "user", content: message }] }),
    });
    if (res.status === 401) { setAuthenticated(false); window.location.href = "/login"; return "Please login first."; }
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
    <ErrorBoundary>
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
          dockerStatuses={dockerStatuses}
          integrationResults={integrationResults}
        />
      </main>

      <AISidePanel open={aiOpen} onClose={() => setAiOpen(false)} onConfigUpdate={fetchConfig} authenticated={authenticated} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={config.groups} searchEngine={config.settings.search.engine} customUrl={config.settings.search.customUrl} authenticated={authenticated} onAiChat={handleAiChat} />
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} settings={config.settings} onSave={handleSettingsSave} onLogout={canEdit && authenticated ? handleLogout : undefined} authenticated={authenticated} />

      {/* Bookmark add/edit modal */}
      <BookmarkEditModal
        open={bookmarkModalOpen}
        onClose={() => setBookmarkModalOpen(false)}
        onSave={handleBookmarkModalSave}
        initial={bookmarkModalInitial}
        title={bookmarkModalMode === "edit" ? "Edit Bookmark" : `Add Bookmark to ${bookmarkModalGroup || ""}`}
      />

      {/* Add group modal */}
      <AddGroupModal open={addGroupOpen} onClose={() => setAddGroupOpen(false)} onSubmit={handleAddGroupSubmit} />
    </div>
    </ErrorBoundary>
  );
}
