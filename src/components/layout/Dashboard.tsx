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
    // Re-check auth status (may have changed if password was set/cleared)
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
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: loginPassword }),
    });
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
    [refreshConfig, authRequired, authenticated]
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
      <header className="flex justify-between items-center py-4 px-6 border-b border-border">
        <h1 className="text-xl font-semibold">
          {config.settings.title}
        </h1>
        <div className="flex gap-2 items-center">
          <button
            onClick={() => setPaletteOpen(true)}
            title="Search (Cmd+K)"
            className="bg-bg-secondary border border-border rounded-md py-1 px-3 cursor-pointer text-[0.8rem] font-medium text-text-secondary transition-all duration-150"
          >
            Search
          </button>
          <button
            onClick={() => {
              if (requireAuth()) return;
              setAiPanelOpen((v) => !v);
            }}
            title="AI Assistant"
            className={`border rounded-md py-1 px-3 cursor-pointer text-[0.8rem] font-medium transition-all duration-150 ${
              aiPanelOpen
                ? 'bg-accent text-white border-accent'
                : 'bg-bg-secondary text-text-secondary border-border'
            }`}
          >
            AI
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
              className="bg-bg-secondary border border-border rounded-md py-1 px-3 cursor-pointer text-[0.8rem] font-medium text-text-secondary transition-all duration-150"
            >
              Settings
            </button>
          )}
          {authRequired && !authenticated && (
            <button onClick={() => setShowLogin(true)} className="bg-accent text-white rounded-md py-1 px-3 cursor-pointer text-[0.8rem] font-medium">
              Login
            </button>
          )}
          {authRequired && authenticated && (
            <button onClick={handleLogout} className="bg-bg-secondary border border-border rounded-md py-1 px-3 cursor-pointer text-[0.8rem] font-medium text-text-secondary transition-all duration-150">
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="p-6 max-w-screen-xl mx-auto">
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
            // Re-check auth status in case password was set
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
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-[200]" onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
            className="bg-card border border-border rounded-xl p-6 w-[300px] flex flex-col gap-2 shadow-[0_8px_32px_rgba(0,0,0,0.2)]"
          >
            <h2 className="text-base font-semibold m-0 mb-3 text-center">
              Login
            </h2>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              className="w-full py-2 px-2.5 bg-bg-secondary border border-border rounded-md text-[0.85rem] text-text outline-none"
            />
            {loginError && (
              <div className="text-red-500 text-[0.8rem] mb-2">
                {loginError}
              </div>
            )}
            <div className="flex gap-2">
              <button type="submit" className="bg-accent text-white rounded-md py-1.5 px-3.5 cursor-pointer text-[0.85rem] font-medium flex-1">Login</button>
              <button type="button" onClick={() => { setShowLogin(false); setLoginError(""); }} className="bg-bg-secondary text-text border border-border rounded-md py-1.5 px-3.5 cursor-pointer text-[0.85rem] flex-1">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
