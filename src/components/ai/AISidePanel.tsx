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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !loading) {
      onSend(input.trim());
      setInput("");
    }
  };

  return (
    <div className="fixed right-0 top-0 bottom-0 w-[380px] bg-card border-l border-border flex flex-col z-[100] shadow-card-lg">
      <div className="flex justify-between items-center py-3 px-4 border-b border-border">
        <span className="font-semibold text-[0.9rem]">
          AI Assistant
        </span>
        <div className="flex gap-2 items-center">
          {messages.length > 0 && (
            <button onClick={onClear} className="bg-transparent border border-border rounded text-text-secondary cursor-pointer text-[0.7rem] py-0.5 px-2" title="New Chat">
              Clear
            </button>
          )}
          <button onClick={onClose} className="bg-transparent text-text-secondary cursor-pointer text-base font-semibold px-1">
            x
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5">
        {messages.length === 0 && (
          <div className="text-text-secondary text-[0.85rem] text-center mt-10">
            Ask me to add bookmarks, change themes, reorganize groups...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`py-2 px-3 rounded-lg max-w-[85%] text-[0.85rem] whitespace-pre-wrap break-words leading-[1.5] ${
              msg.role === "user"
                ? "self-end bg-accent text-white"
                : "self-start bg-bg-secondary text-text"
            }`}
          >
            {msg.content ||
              (loading && msg.role === "assistant" ? "..." : msg.content)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-border flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={loading ? "Waiting for response..." : "Type a message..."}
          disabled={loading}
          className="flex-1 bg-bg-secondary border border-border rounded-md py-2 px-3 text-[0.85rem] text-text outline-none"
        />
        <button onClick={handleSend} disabled={loading} className="bg-accent text-white rounded-md py-2 px-4 cursor-pointer text-[0.85rem] font-medium">
          Send
        </button>
      </div>
    </div>
  );
}
