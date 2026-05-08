"use client";

import { useState, useRef, useEffect, useCallback } from "react";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ToolEvent {
  type: string;
  content?: string;
  name?: string;
  success?: boolean;
  result?: string;
}

interface AISidePanelProps {
  open: boolean;
  onClose: () => void;
  onConfigUpdate?: () => void;
  authenticated: boolean;
}

export default function AISidePanel({ open, onClose, onConfigUpdate, authenticated }: AISidePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && authenticated) inputRef.current?.focus();
  }, [open, authenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show login hint when auth state changes while panel is open
  useEffect(() => {
    if (open && !authenticated) {
      setMessages([]);
    }
  }, [open, authenticated]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || streaming) return;

    if (!authenticated) {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "Please login first to use AI. Click Settings or go to /login." },
      ]);
      return;
    }

    const userMsg = input.trim();
    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages.filter(m => m.role !== "system"), { role: "user", content: userMsg }] }),
      });

      if (!res.ok) {
        let errorMsg = "AI request failed";
        try {
          const err = await res.json();
          errorMsg = err.error || errorMsg;
        } catch { /* ignore */ }
        setMessages((prev) => [
          ...prev,
          { role: "system", content: errorMsg },
        ]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => [
          ...prev,
          { role: "system", content: "No response stream received." },
        ]);
        return;
      }

      let assistantContent = "";
      let hasContent = false;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

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
            const event = JSON.parse(line.slice(6)) as ToolEvent;
            if (event.type === "text" && event.content) {
              hasContent = true;
              assistantContent += event.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return updated;
              });
            } else if (event.type === "config_updated") {
              onConfigUpdate?.();
            } else if (event.type === "error") {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "system",
                  content: event.content || "Stream error",
                };
                return updated;
              });
            }
          } catch {
            // skip malformed events
          }
        }
      }

      // If stream ended with no content at all, show a message
      if (!hasContent) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = {
            role: "system",
            content: "AI returned no response. Check your API key and model settings.",
          };
          return updated;
        });
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "system", content: "Connection error. Please try again." },
      ]);
    } finally {
      setStreaming(false);
    }
  }, [input, messages, streaming, authenticated, onConfigUpdate]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-[rgba(var(--bg-rgb),0.6)] backdrop-blur-[4px] z-[100] animate-[fadeIn_0.15s_ease]"
          onClick={onClose}
        />
      )}
      {/* Panel */}
      <div
        className="fixed top-0 right-0 h-full w-[400px] max-w-full bg-[var(--surface)] border-l border-[var(--border)] shadow-[var(--shadow-lg)] z-[100] flex flex-col transition-transform duration-200 ease-out"
        style={{
          transform: open ? "translateX(0)" : "translateX(100%)",
          animation: open ? "slideInRight 0.2s cubic-bezier(0.16, 1, 0.3, 1)" : undefined,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">AI Assistant</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {!authenticated && messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Login required</p>
              <p className="text-xs text-[var(--text-tertiary)]">
                Authenticate in Settings to use AI features.
              </p>
            </div>
          )}
          {authenticated && messages.length === 0 && (
            <p className="text-sm text-[var(--text-tertiary)] text-center py-8">
              Ask me to add bookmarks, change layout, or update settings.
            </p>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[90%] px-3 py-2 rounded-[var(--radius-md)] text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-[var(--accent)] text-white"
                    : msg.role === "system"
                      ? "bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning)]"
                      : "bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)]"
                }`}
              >
                {msg.content || (
                  <span className="inline-block w-2 h-4 bg-[var(--text-tertiary)] animate-pulse" />
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Input */}
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage();
            }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={authenticated ? "Type a message..." : "Login to chat..."}
              className="flex-1 px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-50 placeholder:text-[var(--text-tertiary)]"
            />
            <button
              type="submit"
              disabled={streaming || !input.trim()}
              className="px-3 py-2 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {streaming ? "..." : "Send"}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
