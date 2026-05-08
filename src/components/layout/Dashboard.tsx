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
      const res = await fetch("/api/config/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, arguments: args }),
      });
      if (res.status === 401) {
        setAuthenticated(false);
        setShowLogin(true);
        return null;
      }
      const data = await res.json();
      if (data.success) refreshConfig();
      return data;
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
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 24px",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <h1 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
          {config.settings.title}
        </h1>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => setPaletteOpen(true)}
            title="Search (Cmd+K)"
            style={headerBtnStyle}
          >
            Search
          </button>
          <button
            onClick={() => {
              if (requireAuth()) return;
              setAiPanelOpen((v) => !v);
            }}
            title="AI Assistant"
            style={{
              ...headerBtnStyle,
              background: aiPanelOpen ? "var(--accent)" : "var(--bg-secondary)",
              color: aiPanelOpen ? "white" : "var(--text-secondary)",
              borderColor: aiPanelOpen ? "var(--accent)" : "var(--border)",
            }}
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
              style={headerBtnStyle}
            >
              Settings
            </button>
          )}
          {authRequired && !authenticated && (
            <button onClick={() => setShowLogin(true)} style={loginBtnStyle}>
              Login
            </button>
          )}
          {authRequired && authenticated && (
            <button onClick={handleLogout} style={headerBtnStyle}>
              Logout
            </button>
          )}
        </div>
      </header>

      <main style={{ padding: "24px", maxWidth: 1200, margin: "0 auto" }}>
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
        <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget) setShowLogin(false); }}>
          <form
            onSubmit={(e) => { e.preventDefault(); handleLogin(); }}
            style={loginFormStyle}
          >
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: "0 0 12px", textAlign: "center" }}>
              Login
            </h2>
            <input
              type="password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              style={loginInputStyle}
            />
            {loginError && (
              <div style={{ color: "#ef4444", fontSize: "0.8rem", marginBottom: 8 }}>
                {loginError}
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={primaryBtnStyle}>Login</button>
              <button type="button" onClick={() => { setShowLogin(false); setLoginError(""); }} style={secondaryBtnStyle}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

const headerBtnStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "4px 12px",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 500,
  color: "var(--text-secondary)",
  transition: "all 0.15s",
};

const loginBtnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 6,
  padding: "4px 12px",
  cursor: "pointer",
  fontSize: "0.8rem",
  fontWeight: 500,
};

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.5)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  zIndex: 200,
};

const loginFormStyle: React.CSSProperties = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  padding: 24,
  width: 300,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
};

const loginInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  fontSize: "0.85rem",
  color: "var(--text)",
  outline: "none",
  boxSizing: "border-box",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 6,
  padding: "6px 14px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: 500,
  flex: 1,
};

const secondaryBtnStyle: React.CSSProperties = {
  background: "var(--bg-secondary)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "6px 14px",
  cursor: "pointer",
  fontSize: "0.85rem",
  flex: 1,
};
