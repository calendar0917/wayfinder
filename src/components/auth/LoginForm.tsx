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
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        autoFocus
        className="w-full px-2.5 py-2 border border-border rounded-md bg-bg-secondary text-text text-[0.85rem] outline-none"
      />
      {error && <div className="text-red-500 text-[0.8rem]">{error}</div>}
      <button type="submit" className="p-2 bg-accent text-white border-0 rounded-md text-[0.85rem] cursor-pointer">
        Login
      </button>
    </form>
  );
}
