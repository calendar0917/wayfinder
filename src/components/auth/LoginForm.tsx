"use client";

import { useState } from "react";

export function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        className="w-full px-3 py-2.5 border border-border rounded-lg bg-surface-alt text-text text-[0.875rem] outline-none transition-colors duration-150 focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
      />
      {error && <div className="text-error text-[0.8rem] bg-error-soft rounded-lg py-1.5 px-2.5">{error}</div>}
      <button type="submit" disabled={loading} className="py-2.5 bg-accent text-white border-0 rounded-lg text-[0.85rem] font-medium cursor-pointer transition-all duration-150 hover:bg-accent-hover hover:-translate-y-px hover:shadow-accent disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none">
        {loading ? "Logging in..." : "Login"}
      </button>
    </form>
  );
}
