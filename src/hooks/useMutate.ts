"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ui/ToastProvider";

function handleUnauthorized() {
  window.location.href = "/login";
}

export function useMutate(deps: {
  setAuthenticated: (a: boolean) => void;
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
        toast("Session expired — redirecting to login.", "error");
        handleUnauthorized();
        return { success: false, result: "Unauthorized" };
      }
      const data = await res.json();
      if (data.success) {
        await deps.fetchConfig();
        toast(data.result || "Done", "success");
      } else if (data.result) {
        toast(data.result, "error");
      }
      return data;
    },
    [deps, toast]
  );

  return { mutate };
}
