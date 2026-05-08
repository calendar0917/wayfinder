"use client";

import { useState, useRef, useEffect } from "react";

interface AISidePanelProps {
  messages: Array<{ role: string; content: string }>;
  loading: boolean;
  onClose: () => void;
  onSend: (msg: string) => void;
  onClear: () => void;
}

export function AISidePanel({
  messages,
  loading,
  onClose,
  onSend,
  onClear,
}: AISidePanelProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 max-md:bg-black/40 z-[100] animate-[fadeIn_0.15s_ease]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 w-[380px] max-md:w-full bg-surface border-l border-border flex flex-col z-[100] shadow-lg animate-[slideInRight_0.2s_cubic-bezier(0.16,1,0.3,1)]">
        <div className="flex justify-between items-center py-3 px-4 border-b border-border">
          <span className="font-semibold text-[0.9375rem]">AI Assistant</span>
          <div className="flex gap-2 items-center">
            {messages.length > 0 && (
              <button onClick={onClear} className="bg-surface-alt border border-border rounded-lg text-text-secondary cursor-pointer text-[0.75rem] font-medium py-1 px-2.5 transition-colors duration-150 hover:bg-surface-hover hover:border-border-hover" title="New Chat">
                Clear
              </button>
            )}
            <button onClick={onClose} className="bg-transparent text-text-tertiary cursor-pointer p-1 rounded-lg transition-colors duration-150 hover:bg-surface-hover hover:text-text-secondary" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 && (
            <div className="text-text-tertiary text-[0.85rem] text-center mt-12 leading-relaxed">
              <div className="text-3xl mb-3">💬</div>
              Ask me to add bookmarks, change themes, reorganize groups...
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`py-2.5 px-3.5 rounded-xl max-w-[85%] text-[0.85rem] whitespace-pre-wrap break-words leading-[1.6] ${
                msg.role === "user"
                  ? "self-end bg-accent text-white"
                  : "self-start bg-surface-alt text-text"
              }`}
            >
              {msg.content ||
                (loading && msg.role === "assistant" ? (
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce [animation-delay:0ms]">·</span>
                    <span className="animate-bounce [animation-delay:150ms]">·</span>
                    <span className="animate-bounce [animation-delay:300ms]">·</span>
                  </span>
                ) : msg.content)}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 border-t border-border flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSend();
            }}
            placeholder={loading ? "Waiting for response..." : "Type a message..."}
            disabled={loading}
            className="flex-1 bg-surface-alt border border-border rounded-lg py-2 px-3 text-[0.85rem] text-text outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-50"
          />
          <button onClick={handleSend} disabled={loading} className="bg-accent text-white rounded-lg py-2 px-4 cursor-pointer text-[0.85rem] font-medium transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
            Send
          </button>
        </div>
      </div>
    </>
  );
}
