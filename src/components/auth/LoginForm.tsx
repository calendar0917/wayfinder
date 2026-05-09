"use client";

import { useEffect, useState } from "react";

export default function LoginForm() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [noAuthNeeded, setNoAuthNeeded] = useState(false);
  const [isDefaultPassword, setIsDefaultPassword] = useState(false);

  useEffect(() => {
    fetch("/api/auth/status")
      .then((r) => r.json())
      .then((auth) => {
        if (!auth.authRequired) {
          setNoAuthNeeded(true);
          window.location.href = "/";
        }
        if (auth.isDefaultPassword) {
          setIsDefaultPassword(true);
        }
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.error || "Login failed");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  if (noAuthNeeded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="text-sm text-[var(--text-tertiary)]">Redirecting...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg)] p-6">
      <div
        className="w-full max-w-sm bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-lg)]"
        style={{ animation: "modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)" }}
      >
        <h1 className="text-lg font-bold text-[var(--text)] mb-1">Login</h1>
        <p className="text-sm text-[var(--text-secondary)] mb-4">
          Enter your password to access the dashboard.
        </p>
        {isDefaultPassword && (
          <div className="mb-4 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-[var(--radius-sm)] text-xs text-amber-700 dark:text-amber-300">
            Default password is <strong>admin</strong>. Please change it in Settings after login.
          </div>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            className="w-full px-2.5 py-2 bg-[var(--surface-alt)] border border-[var(--border)] rounded-[var(--radius-sm)] text-sm text-[var(--text)] outline-none transition-all duration-150 focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)] disabled:opacity-50 placeholder:text-[var(--text-tertiary)]"
          />
          {error && (
            <p className="text-xs text-[var(--error)]">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="px-4 py-2 bg-[var(--accent)] text-white border-none rounded-[var(--radius-sm)] text-sm font-semibold cursor-pointer transition-all duration-150 shadow-[var(--shadow-sm)] hover:bg-[var(--accent-hover)] hover:shadow-[var(--shadow-accent)] hover:-translate-y-px active:translate-y-0 active:shadow-[var(--shadow-sm)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
