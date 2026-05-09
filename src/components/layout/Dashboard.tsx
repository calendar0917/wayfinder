"use client";

import { useState, useCallback, useMemo } from "react";
import type { Bookmark, Group, Page, IntegrationFieldType } from "@/types/config";
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
  const { config, authenticated, setAuthenticated, canEdit, fetchConfig, applyTheme } = useConfig();

  const [editMode, setEditMode] = useState(false);
  const [activePage, setActivePage] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiInitialMessage, setAiInitialMessage] = useState("");

  // Bookmark modal state
  const [bookmarkModalOpen, setBookmarkModalOpen] = useState(false);
  const [bookmarkModalGroup, setBookmarkModalGroup] = useState<string | null>(null);
  const [bookmarkModalInitial, setBookmarkModalInitial] = useState<{
    name?: string; url?: string; icon?: string; description?: string; tags?: string[]; statusCheck?: boolean;
    integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string; type?: IntegrationFieldType }>; display: string; pollInterval: number };
  } | undefined>(undefined);
  const [bookmarkModalMode, setBookmarkModalMode] = useState<"add" | "edit">("add");

  // Add group modal
  const [addGroupOpen, setAddGroupOpen] = useState(false);

  // Widget type picker
  const [widgetPickerOpen, setWidgetPickerOpen] = useState(false);

  const { mutate } = useMutate({ setAuthenticated, fetchConfig });

  // Flatten all bookmarks recursively for status checking (memoized)
  const allBookmarks = useMemo(() => config ? flattenBookmarks(config.groups) : [], [config?.groups]);
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
    async (data: { name: string; url: string; icon: string; description: string; tags: string[]; statusCheck?: boolean; integration?: { endpoint: string; headers: Record<string, string>; fields: Array<{ path: string; label: string; type?: IntegrationFieldType }>; display: string; pollInterval: number } }) => {
      if (!bookmarkModalGroup) return;
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
        await mutate("update_bookmark", args);
        const hadIntegration = !!bookmarkModalInitial.integration;
        const hasIntegration = !!data.integration;
        if (hasIntegration) {
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
        await mutate("add_bookmark", args);
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
    [bookmarkModalGroup, bookmarkModalMode, bookmarkModalInitial, mutate]
  );

  // --- Add group handler ---
  const handleAddGroup = useCallback(async () => {
    setAddGroupOpen(true);
  }, []);

  const handleAddGroupSubmit = useCallback(async (name: string) => {
    setAddGroupOpen(false);
    await mutate("add_group", { name });
  }, [mutate]);

  const handleSettingsSave = useCallback(
    async (mutations: { operation: string; arguments: Record<string, unknown> }[]) => {
      for (const m of mutations) {
        await mutate(m.operation, m.arguments);
      }
    },
    [mutate]
  );

  const handleLogout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    window.location.href = "/login";
  }, [setAuthenticated]);

  const handleOpenAI = useCallback((message: string) => {
    setAiInitialMessage(message);
    setAiOpen(true);
  }, []);

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
      {config.settings.customCss && (
        <style dangerouslySetInnerHTML={{ __html: config.settings.customCss }} />
      )}
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
        {/* Page tabs */}
        {config.pages && config.pages.length > 0 && (
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {config.pages.map((page, i) => (
              <button
                key={page.name}
                onClick={() => setActivePage(i)}
                className={`px-4 py-1.5 text-sm font-medium rounded-t-[var(--radius-sm)] cursor-pointer transition-all duration-150 border-none ${
                  activePage === i
                    ? "bg-[var(--surface)] text-[var(--text)] border-b-2 border-b-[var(--accent)]"
                    : "bg-transparent text-[var(--text-secondary)] hover:text-[var(--text)] hover:bg-[var(--surface-hover)]"
                }`}
              >
                {page.name}
              </button>
            ))}
          </div>
        )}
        {config.widgets.length > 0 && (
          <WidgetRow widgets={config.widgets} title={config.settings.title} editMode={editMode && canEdit} onRemoveWidget={(i) => mutate("remove_widget", { index: i })} onAddWidget={() => setWidgetPickerOpen(true)} onConfigUpdate={fetchConfig} />
        )}
        <BookmarkGrid
          groups={config.pages && config.pages.length > 0
            ? config.groups.filter((g) => config.pages![activePage]?.groups?.includes(g.name))
            : config.groups}
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

      <AISidePanel open={aiOpen} onClose={() => { setAiOpen(false); setAiInitialMessage(""); }} onConfigUpdate={fetchConfig} authenticated={authenticated} initialMessage={aiInitialMessage} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} groups={config.groups} searchEngine={config.settings.search.engine} customUrl={config.settings.search.customUrl} authenticated={authenticated} onOpenAI={handleOpenAI} />
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

      {/* Widget type picker */}
      {widgetPickerOpen && (
        <>
          <div className="fixed inset-0 z-[200]" onClick={() => setWidgetPickerOpen(false)} />
          <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[201] bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-3 flex flex-col gap-1 min-w-[180px]">
            {([
              ["datetime", "Date & Time", "🕐"],
              ["greeting", "Greeting", "👋"],
              ["weather", "Weather", "🌤"],
              ["search", "Search Bar", "🔍"],
              ["notes", "Notes", "📝"],
              ["resources", "System Resources", "📊"],
              ["logo", "Logo", "🖼"],
            ] as const).map(([type, label, emoji]) => (
              <button
                key={type}
                onClick={() => {
                  mutate("add_widget", { type });
                  setWidgetPickerOpen(false);
                }}
                className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-sm)] text-sm text-[var(--text)] cursor-pointer transition-colors duration-100 hover:bg-[var(--surface-hover)] bg-transparent border-none w-full text-left"
              >
                <span>{emoji}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
    </ErrorBoundary>
  );
}
