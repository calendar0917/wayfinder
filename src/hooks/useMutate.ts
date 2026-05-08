"use client";

import { useCallback } from "react";
import type { SafeConfig } from "@/types/config";
import { useToast } from "@/components/ui/ToastProvider";

type Theme = "auto" | "light" | "dark";

export function useMutate(deps: {
  setConfig: (c: SafeConfig) => void;
  setAuthenticated: (a: boolean) => void;
  applyTheme: (t: Theme) => void;
  fetchConfig: () => Promise<void>;
}) {
  const { toast } = useToast();

  const mutate = useCallback(
    async (operation: string, args: Record<string, unknown>) => {
      const res = await fetch("/api/config/mutate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operation, arguments: args }),
      });
      if (res.status === 401) {
        deps.setAuthenticated(false);
        toast("Unauthorized — please login.", "error");
        return { success: false, result: "Unauthorized — please login." };
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

  return mutate;
}
