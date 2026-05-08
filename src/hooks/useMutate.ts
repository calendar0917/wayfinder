"use client";

import { useCallback, useRef } from "react";
import type { SafeConfig } from "@/types/config";
import { useToast } from "@/components/ui/ToastProvider";

type Theme = "auto" | "light" | "dark";

function handleUnauthorized() {
  window.location.href = "/login";
}

export function useMutate(deps: {
  setConfig: (c: SafeConfig) => void;
  setAuthenticated: (a: boolean) => void;
  applyTheme: (t: Theme) => void;
  fetchConfig: () => Promise<void>;
}) {
  const { toast } = useToast();
  const snapshotRef = useRef<SafeConfig | null>(null);

  const mutate = useCallback(
    async (operation: string, args: Record<string, unknown>) => {
      const res = await fetch("/api/config/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, arguments: args }),
      });
      if (res.status === 401) {
        deps.setAuthenticated(false);
        toast("Session expired — redirecting to login.", "error");
        handleUnauthorized();
        return { success: false, result: "Unauthorized" };
      }
      const data = await res.json();
      if (data.config) {
        deps.setConfig(data.config);
        deps.applyTheme(data.config.settings?.theme || "auto");
      } else {
        deps.fetchConfig();
      }
      if (data.success) {
        toast(data.result || "Done", "success");
      } else if (data.result) {
        toast(data.result, "error");
      }
      return data;
    },
    [deps, toast]
  );

  const optimisticMutate = useCallback(
    async (
      operation: string,
      args: Record<string, unknown>,
      predictedConfig: SafeConfig
    ) => {
      snapshotRef.current = predictedConfig;

      deps.setConfig(predictedConfig);
      deps.applyTheme(predictedConfig.settings?.theme || "auto");

      try {
        const res = await fetch("/api/config/mutate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operation, arguments: args }),
        });
        if (res.status === 401) {
          deps.setAuthenticated(false);
          if (snapshotRef.current) deps.setConfig(snapshotRef.current);
          toast("Session expired — redirecting to login.", "error");
          handleUnauthorized();
          return { success: false, result: "Unauthorized" };
        }
        const data = await res.json();
        if (data.success) {
          if (data.config) {
            deps.setConfig(data.config);
            deps.applyTheme(data.config.settings?.theme || "auto");
          }
          toast(data.result || "Done", "success");
        } else {
          if (snapshotRef.current) deps.setConfig(snapshotRef.current);
          if (data.result) toast(data.result, "error");
        }
        return data;
      } catch {
        if (snapshotRef.current) deps.setConfig(snapshotRef.current);
        toast("Network error — changes reverted", "error");
        return { success: false, result: "Network error" };
      }
    },
    [deps, toast]
  );

  return { mutate, optimisticMutate };
}
