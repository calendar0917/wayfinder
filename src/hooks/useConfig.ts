"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SafeConfig } from "@/types/config";

type Theme = "auto" | "light" | "dark";

function resolveTheme(t: Theme): string {
  if (t === "auto") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return t;
}

export function useConfig() {
  const [config, setConfig] = useState<SafeConfig | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const initialLoadDone = useRef(false);

  const applyTheme = useCallback((t: Theme) => {
    document.documentElement.setAttribute("data-theme", resolveTheme(t));
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const [cfgRes, authRes] = await Promise.all([
        fetch("/api/config", { cache: "no-store" }),
        fetch("/api/auth/status", { cache: "no-store" }),
      ]);
      const cfg = await cfgRes.json();
      const auth = await authRes.json();
      setConfig(cfg);
      setAuthRequired(auth.authRequired);
      setAuthenticated(auth.authenticated);
      applyTheme(cfg?.settings?.theme || "auto");
      try { localStorage.setItem("homepage-config", JSON.stringify(cfg)); } catch {}
    } catch {
      // will retry
    }
  }, [applyTheme]);

  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;
    fetchConfig();
  }, [fetchConfig]);

  const canEdit = !authRequired || authenticated;

  return { config, setConfig, authenticated, setAuthenticated, authRequired, canEdit, fetchConfig, applyTheme };
}
