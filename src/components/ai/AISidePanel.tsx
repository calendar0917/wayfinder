"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Markdown from "react-markdown";
import { useToast } from "@/components/ui/ToastProvider";

interface Message {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  toolName?: string;
  toolSuccess?: boolean;
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
  initialMessage?: string;
}

const SUGGESTED_PROMPTS = [
  "Add a bookmark to YouTube",
  "Change theme to dark",
  "Update the page title",
  "Add a new group called Social",
  "Change search engine to DuckDuckGo",
  "Add a notes widget",
];

function ToolCard({ name, success, result }: { name: string; success: boolean; result: string }) {
  return (
    <div className={`px-3 py-2 rounded-[var(--radius-sm)] border text-xs ${
      success
        ? "bg-[var(--success-soft)] border-[var(--success)] text-[var(--success)]"
        : "bg-[var(--error-soft)] border-[var(--error)] text-[var(--error)]"
    }`}>
      <div className="flex items-center gap-1.5 mb-0.5">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {success ? (
            <path d="M20 6L9 17l-5-5" />
          ) : (
            <>
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </>
          )}
        </svg>
        <span className="font-semibold">{name}</span>
      </div>
      {result && <div className="opacity-80">{result}</div>}
    </div>
  );
}

export default function AISidePanel({ open, onClose, onConfigUpdate, authenticated, initialMessage }: AISidePanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastInitialRef = useRef("");
  const clearPendingRef = useRef(false);
  const messagesRef = useRef<Message[]>([]);
  const { toast } = useToast();

  // Keep ref in sync with state
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  useEffect(() => {
    if (open && authenticated) inputRef.current?.focus();
  }, [open, authenticated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open && !authenticated) setMessages([]);
  }, [open, authenticated]);

  // Handle initialMessage from CommandPalette
  useEffect(() => {
    if (initialMessage && initialMessage !== lastInitialRef.current && !streaming) {
      lastInitialRef.current = initialMessage;
      sendMessage(initialMessage);
    }
  }, [initialMessage, streaming]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset initial message tracking when panel closes
  useEffect(() => {
    if (!open) lastInitialRef.current = "";
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    const msg = text.trim();
    if (!msg || streaming) return;

    if (!authenticated) {
      setMessages((prev) => [...prev, { role: "system", content: "Please login first to use AI. Click Settings or go to /login." }]);
      return;
    }

    setInput("");
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "user", content: msg }]);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const history = messagesRef.current.filter(m => m.role !== "system");
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...history, { role: "user", content: msg }] }),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorMsg = "AI request failed";
        try { const err = await res.json(); errorMsg = err.error || errorMsg; } catch { /* ignore */ }
        setMessages((prev) => [...prev, { role: "system", content: errorMsg }]);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setMessages((prev) => [...prev, { role: "system", content: "No response stream received." }]);
        return;
      }

      let assistantContent = "";
      let hasContent = false;
      let configModified = false;
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      const decoder = new TextDecoder();
      let buffer = "";

      function processLine(line: string) {
        if (!line.startsWith("data: ")) return;
        try {
          const event = JSON.parse(line.slice(6)) as ToolEvent;
          if (event.type === "text" && event.content) {
            hasContent = true;
            assistantContent += event.content;
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "assistant", content: assistantContent };
              return updated;
            });
          } else if (event.type === "tool_executing") {
            setMessages((prev) => [...prev, { role: "tool", content: "...", toolName: event.name, toolSuccess: false }]);
          } else if (event.type === "tool_result") {
            if (event.success) configModified = true;
            setMessages((prev) => {
              const updated = [...prev];
              for (let i = updated.length - 1; i >= 0; i--) {
                if (updated[i].role === "tool" && updated[i].content === "...") {
                  updated[i] = {
                    role: "tool",
                    content: event.result || "",
                    toolName: updated[i].toolName,
                    toolSuccess: event.success ?? true,
                  };
                  break;
                }
              }
              return updated;
            });
          } else if (event.type === "config_updated") {
            onConfigUpdate?.();
          } else if (event.type === "error") {
            setMessages((prev) => {
              const updated = [...prev];
              updated[updated.length - 1] = { role: "system", content: event.content || "Stream error" };
              return updated;
            });
          }
        } catch {
          // skip malformed events
        }
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) processLine(line);
      }

      // Flush any remaining buffered content
      buffer += decoder.decode();
      if (buffer) {
        for (const line of buffer.split("\n")) processLine(line);
      }

      if (configModified) {
        onConfigUpdate?.();
      }

      if (!hasContent) {
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: "system", content: "AI returned no response. Check your API key and model settings." };
          return updated;
        });
      }
    } catch (err) {
      // Distinguish user-initiated abort from connection errors
      if (err instanceof DOMException && err.name === "AbortError") {
        if (clearPendingRef.current) {
          clearPendingRef.current = false;
        } else {
          setMessages((prev) => [...prev, { role: "system", content: "Generation stopped." }]);
        }
      } else {
        setMessages((prev) => [...prev, { role: "system", content: "Connection error. Please try again." }]);
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  }, [streaming, authenticated, onConfigUpdate]);

  const stopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
  }, []);

  const clearConversation = useCallback(() => {
    if (streaming) {
      clearPendingRef.current = true;
      abortControllerRef.current?.abort();
    }
    setMessages([]);
    setInput("");
    toast("Conversation cleared", "success");
  }, [streaming, toast]);

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
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
          <h2 className="text-sm font-semibold text-[var(--text)]">AI Assistant</h2>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                title="Clear conversation"
                className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-[var(--radius-sm)] text-[var(--text-secondary)] transition-colors duration-150 hover:bg-[var(--surface-hover)] hover:text-[var(--text)] cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
          {!authenticated && messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-1">Login required</p>
              <p className="text-xs text-[var(--text-tertiary)]">Authenticate in Settings to use AI features.</p>
            </div>
          )}
          {authenticated && messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 py-8">
              <p className="text-sm text-[var(--text-tertiary)] text-center">
                Ask me to add bookmarks, change layout, or update settings.
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-[90%]">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full bg-[var(--accent-soft)] text-[var(--accent)] border border-[var(--accent)] hover:bg-[var(--accent-soft-hover)] transition-colors duration-150 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "tool" ? (
                <ToolCard name={msg.toolName || "tool"} success={msg.toolSuccess ?? true} result={msg.content === "..." ? "" : msg.content} />
              ) : (
                <div
                  className={`max-w-[90%] px-3 py-2 rounded-[var(--radius-md)] text-sm ${
                    msg.role === "user"
                      ? "bg-[var(--accent)] text-white whitespace-pre-wrap"
                      : msg.role === "system"
                        ? "bg-[var(--warning-soft)] text-[var(--warning)] border border-[var(--warning)] whitespace-pre-wrap"
                        : "bg-[var(--surface-alt)] text-[var(--text)] border border-[var(--border)] ai-markdown"
                  }`}
                >
                  {msg.role === "assistant" && msg.content ? (
                    <Markdown>{msg.content}</Markdown>
                  ) : msg.content ? (
                    msg.content
                  ) : (
                    <span className="inline-block w-2 h-4 bg-[var(--text-tertiary)] animate-pulse" />
                  )}
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="px-4 py-3 border-t border-[var(--border)]">
          <form
            onSubmit={(e) => { e.preventDefault(); sendMessage(input); }}
            className="flex gap-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={authenticated ? "Type a message..." : "Login to chat..."}
              className="flex-1 px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-50 placeholder:text-[var(--text-tertiary)]"
            />
            {streaming ? (
              <button
                type="button"
                onClick={stopGeneration}
                className="px-3 py-2 bg-[var(--error-soft)] text-[var(--error)] border border-[var(--error)] rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--error)] hover:text-white"
              >
                Stop
              </button>
            ) : (
              <button
                type="submit"
                disabled={!input.trim()}
                className="px-3 py-2 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-all duration-150 hover:bg-[var(--accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send
              </button>
            )}
          </form>
        </div>
      </div>
    </>
  );
}
