"use client";

import { useState } from "react";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        if (onSuccess) {
          onSuccess();
        } else {
          window.location.href = "/";
        }
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Connection error");
    }
  };

  return (
    <form onSubmit={handleSubmit} style={formStyle}>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        style={inputStyle}
      />
      {error && <div style={errorStyle}>{error}</div>}
      <button type="submit" style={btnStyle}>
        Login
      </button>
    </form>
  );
}

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 10px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "var(--bg-secondary)",
  color: "var(--text)",
  fontSize: "0.85rem",
  outline: "none",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  color: "#ef4444",
  fontSize: "0.8rem",
};

const btnStyle: React.CSSProperties = {
  padding: "8px",
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 6,
  fontSize: "0.85rem",
  cursor: "pointer",
};
