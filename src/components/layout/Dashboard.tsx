"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SafeConfig } from "@/types/config";
import { WidgetRow } from "./WidgetRow";
import { BookmarkGrid } from "./BookmarkGrid";
import { CommandPalette } from "@/components/command-palette/CommandPalette";
import { AISidePanel } from "@/components/ai/AISidePanel";
import { EditModeToggle } from "@/components/editing/EditModeToggle";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SettingsDialog } from "@/components/editing/SettingsDialog";
import { mutate } from "@/lib/mutate";

interface DashboardProps {
  config: SafeConfig;
}

export function Dashboard({ config: initialConfig }: DashboardProps) {
  const [config, setConfig] = useState(initialConfig);
  const [editMode, setEditMode] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [aiMessages, setAiMessages] = useState<
    Array<{ role: string; content: string }>
  >([]);
  const [aiLoading, setAiLoading] = useState(false);

  const messagesRef = useRef(aiMessages);
  messagesRef.current = aiMessages;

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setAuthRequired(data.authRequired);
        setAuthenticated(data.authenticated);
      })
      .catch(() => {});

    const handleAuthRequired = () => {
      setAuthenticated(false);
      setShowLogin(true);
    };
    window.addEventListener("auth-required", handleAuthRequired);
    return () => window.removeEventListener("auth-required", handleAuthRequired);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setPaletteOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const refreshConfig = useCallback(async () => {
    const res = await fetch("/api/config");
    if (res.ok) {
      setConfig(await res.json());
    }
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((data) => {
        setAuthRequired(data.authRequired);
        setAuthenticated(data.authenticated);
      })
      .catch(() => {});
  }, []);

  const handleLogin = async () => {
    setLoginError("");
    setLoginLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
    setLoginLoading(false);
    const data = await res.json();
    if (data.success) {
      setAuthenticated(true);
      setShowLogin(false);
      setLoginPassword("");
    } else {
      setLoginError(data.error || "Login failed");
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setAuthenticated(false);
    setEditMode(false);
  };

  const requireAuth = (): boolean => {
    if (!authRequired || authenticated) return false;
    setShowLogin(true);
    return true;
  };

  const handleMutate = useCallback(
    async (operation: string, args: Record<string, unknown>) => {
      const result = await mutate(operation, args, () => {
        setAuthenticated(false);
        setShowLogin(true);
      });
      if (result && result.success) refreshConfig();
      return result;
    },
    [refreshConfig]
  );

  const handleAiMessage = useCallback(
    async (message: string) => {
      const pendingMessages = [
        ...messagesRef.current,
        { role: "user", content: message },
      ];
      setAiMessages(pendingMessages);
      setAiPanelOpen(true);
      setAiLoading(true);

      try {
        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: pendingMessages }),
        });

        if (res.status === 401) {
          setAuthenticated(false);
          setShowLogin(true);
          setAiMessages((prev) => [
            ...prev,
            { role: "assistant", content: "Please log in to use AI features." },
          ]);
          setAiLoading(false);
          return;
        }
        if (!res.ok) throw new Error("AI request failed");

        const reader = res.body?.getReader();
        if (!reader) return;
        const decoder = new TextDecoder();
        let assistantContent = "";
        setAiMessages((prev) => [
          ...prev,
          { role: "assistant", content: "" },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const text = decoder.decode(value);
          for (const line of text.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "text") {
                assistantContent += data.content;
                updateLastAssistant(assistantContent);
              }
              if (data.type === "tool_executing") {
                assistantContent += `\n> ${data.name}...`;
                updateLastAssistant(assistantContent);
              }
              if (data.type === "tool_result") {
                const tag = data.success ? "[OK]" : "[FAIL]";
                assistantContent += ` ${tag} ${data.result}`;
                updateLastAssistant(assistantContent);
                if (data.success) refreshConfig();
              }
              if (data.type === "config_updated") {
                refreshConfig();
              }
              if (data.type === "error") {
                assistantContent += `\nError: ${data.content}`;
                updateLastAssistant(assistantContent);
              }
            } catch {
              // skip malformed SSE lines
            }
          }
        }
      } catch {
        setAiMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last?.role === "assistant") {
            next[next.length - 1] = {
              ...last,
              content: "Error: Failed to get AI response",
            };
          } else {
            next.push({
              role: "assistant",
              content: "Error: Failed to get AI response",
            });
          }
          return next;
        });
      } finally {
        setAiLoading(false);
      }
    },
    [refreshConfig]
  );

  function updateLastAssistant(content: string) {
    setAiMessages((prev) => {
      const next = [...prev];
      next[next.length - 1] = { role: "assistant", content };
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-bg">
      <header className="sticky top-0 z-10 bg-bg/80 backdrop-blur-sm border-b border-border">
        <div className="flex justify-between items-center py-3 px-6 max-w-screen-xl mx-auto">
          <h1 className="text-[1.125rem] font-bold tracking-tight">
            {config.settings.title}
          </h1>
          <div className="flex gap-1.5 items-center">
            <button
              onClick={() => setPaletteOpen(true)}
              title="Search (Cmd+K)"
              className="inline-flex items-center gap-1.5 bg-surface-alt border border-border rounded-lg py-1.5 px-3 cursor-pointer text-[0.8rem] font-medium text-text-secondary transition-all duration-150 hover:bg-surface-hover hover:border-border-hover"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <span className="max-sm:hidden">Search</span>
            </button>
            <button
              onClick={() => {
                if (requireAuth()) return;
                setAiPanelOpen((v) => !v);
              }}
              title="AI Assistant"
              className={`inline-flex items-center gap-1.5 rounded-lg py-1.5 px-3 cursor-pointer text-[0.8rem] font-medium transition-all duration-150 ${
                aiPanelOpen
                  ? 'bg-accent-soft text-accent border border-accent'
                  : 'bg-surface-alt text-text-secondary border border-border hover:bg-surface-hover hover:border-border-hover'
              }`}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M12 2a7 7 0 0 1 7 7c0 2.38-1.19 4.47-3 5.74V17a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1v-2.26C6.19 13.47 5 11.38 5 9a7 7 0 0 1 7-7z"/><line x1="9" y1="21" x2="15" y2="21"/>
              </svg>
              <span className="max-sm:hidden">AI</span>
            </button>
            <EditModeToggle
              enabled={editMode}
              onToggle={(v) => {
                if (v && requireAuth()) return;
                setEditMode(v);
              }}
            />
            <ThemeToggle theme={config.settings.theme} onChange={refreshConfig} />
            {editMode && (
              <button
                onClick={() => setSettingsOpen(true)}
                title="Settings"
                className="inline-flex items-center gap-1.5 bg-surface-alt border border-border rounded-lg py-1.5 px-3 cursor-pointer text-[0.8rem] font-medium text-text-secondary transition-all duration-150 hover:bg-surface-hover hover:border-border-hover"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                <span className="max-sm:hidden">Settings</span>
              </button>
            )}
            {authRequired && !authenticated && (
              <button onClick={() => setShowLogin(true)} className="bg-accent text-white rounded-lg py-1.5 px-3 cursor-pointer text-[0.8rem] font-medium transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent">
                Login
              </button>
            )}
            {authRequired && authenticated && (
              <button onClick={handleLogout} className="bg-surface-alt text-text-secondary border border-border rounded-lg py-1.5 px-3 cursor-pointer text-[0.8rem] font-medium transition-all duration-150 hover:bg-surface-hover hover:border-border-hover">
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="p-6 max-w-screen-xl mx-auto animate-[fadeInUp_0.3s_cubic-bezier(0.16,1,0.3,1)]">
        <WidgetRow widgets={config.widgets} editMode={editMode} onConfigChange={refreshConfig} />
        <BookmarkGrid
          groups={config.groups}
          columns={config.settings.layout.columns}
          editMode={editMode}
          onConfigChange={refreshConfig}
        />
      </main>

      {paletteOpen && (
        <CommandPalette
          groups={config.groups}
          searchEngine={config.settings.search.engine}
          customUrl={config.settings.search.customUrl}
          onClose={() => setPaletteOpen(false)}
          onAiMessage={(msg) => {
            if (requireAuth()) return;
            setPaletteOpen(false);
            handleAiMessage(msg);
          }}
        />
      )}

      {aiPanelOpen && (
        <AISidePanel
          messages={aiMessages}
          loading={aiLoading}
          onClose={() => setAiPanelOpen(false)}
          onSend={handleAiMessage}
          onClear={() => setAiMessages([])}
        />
      )}

      {settingsOpen && (
        <SettingsDialog
          currentApiKey={config.settings.apiKey}
          currentApiBase={config.settings.apiBase}
          currentAiModel={config.settings.aiModel}
          onClose={() => setSettingsOpen(false)}
          onConfigChange={() => {
            refreshConfig();
            fetch("/api/auth/status")
              .then((r) => r.json())
              .then((data) => {
                setAuthRequired(data.authRequired);
                setAuthenticated(data.authenticated);
              })
              .catch(() => {});
          }}
        />
      )}

      {showLogin && (
        <div className="fixed inset-0 bg-black/30 flex justify-center items-center z-[200] animate-[fadeIn_0.15s_ease]" onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
            className="bg-surface border border-border rounded-2xl p-6 w-[320px] flex flex-col gap-4 shadow-lg animate-[modalIn_0.2s_cubic-bezier(0.16,1,0.3,1)]"
          >
            <h2 className="text-[1rem] font-semibold m-0 text-center">
              Login
            </h2>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full py-2.5 px-3 bg-surface-alt border border-border rounded-lg text-[0.875rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            />
            {loginError && (
              <div className="text-error text-[0.8rem] bg-error-soft rounded-lg py-1.5 px-2.5">
                {loginError}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={loginLoading} className="bg-accent text-white rounded-lg py-2 px-3.5 cursor-pointer text-[0.85rem] font-medium flex-1 transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
                {loginLoading ? "Logging in..." : "Login"}
              </button>
              <button type="button" onClick={() => { setShowLogin(false); setLoginError(""); }} className="bg-surface text-text border border-border rounded-lg py-2 px-3.5 cursor-pointer text-[0.85rem] font-medium flex-1 transition-all duration-150 hover:bg-surface-hover">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
