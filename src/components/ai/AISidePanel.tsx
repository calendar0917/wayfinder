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
    <div style={panelStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: "0.9rem" }}>
          AI Assistant
        </span>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {messages.length > 0 && (
            <button onClick={onClear} style={clearBtnStyle} title="New Chat">
              Clear
            </button>
          )}
          <button onClick={onClose} style={closeBtnStyle}>
            x
          </button>
        </div>
      </div>

      <div style={messagesStyle}>
        {messages.length === 0 && (
          <div style={emptyStyle}>
            Ask me to add bookmarks, change themes, reorganize groups...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              ...bubbleStyle,
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              background:
                msg.role === "user" ? "var(--accent)" : "var(--bg-secondary)",
              color: msg.role === "user" ? "white" : "var(--text)",
            }}
          >
            {msg.content ||
              (loading && msg.role === "assistant" ? "..." : msg.content)}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputRowStyle}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={loading ? "Waiting for response..." : "Type a message..."}
          disabled={loading}
          style={inputStyle}
        />
        <button onClick={handleSend} disabled={loading} style={sendBtnStyle}>
          Send
        </button>
      </div>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  position: "fixed",
  right: 0,
  top: 0,
  bottom: 0,
  width: 380,
  background: "var(--card)",
  borderLeft: "1px solid var(--border)",
  display: "flex",
  flexDirection: "column",
  zIndex: 100,
  boxShadow: "var(--shadow-lg)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "12px 16px",
  borderBottom: "1px solid var(--border)",
};

const closeBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "1rem",
  fontWeight: 600,
  padding: "0 4px",
};

const clearBtnStyle: React.CSSProperties = {
  background: "none",
  border: "1px solid var(--border)",
  borderRadius: 4,
  color: "var(--text-secondary)",
  cursor: "pointer",
  fontSize: "0.7rem",
  padding: "2px 8px",
};

const messagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: 16,
  display: "flex",
  flexDirection: "column",
  gap: 10,
};

const emptyStyle: React.CSSProperties = {
  color: "var(--text-secondary)",
  fontSize: "0.85rem",
  textAlign: "center",
  marginTop: 40,
};

const bubbleStyle: React.CSSProperties = {
  padding: "8px 12px",
  borderRadius: 8,
  maxWidth: "85%",
  fontSize: "0.85rem",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  lineHeight: 1.5,
};

const inputRowStyle: React.CSSProperties = {
  padding: 12,
  borderTop: "1px solid var(--border)",
  display: "flex",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  flex: 1,
  background: "var(--bg-secondary)",
  border: "1px solid var(--border)",
  borderRadius: 6,
  padding: "8px 12px",
  fontSize: "0.85rem",
  color: "var(--text)",
  outline: "none",
  opacity: 1,
};

const sendBtnStyle: React.CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 6,
  padding: "8px 16px",
  cursor: "pointer",
  fontSize: "0.85rem",
  fontWeight: 500,
};
