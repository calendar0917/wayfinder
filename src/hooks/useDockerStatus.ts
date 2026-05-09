"use client";

import { useState, useEffect, useRef } from "react";
import type { Bookmark } from "@/types/config";

interface ContainerStatus {
  id: string;
  name: string;
  state: string;
  status: string;
}

export interface DockerStatusResult {
  state: "running" | "exited" | "restarting" | "paused" | "unknown";
  status: string;
}

const DEFAULT_POLL_INTERVAL = 30_000; // 30 seconds
const dockerCache = new Map<string, { result: DockerStatusResult; timestamp: number }>();
const CACHE_DURATION = 10_000; // 10 seconds

export function useDockerStatus(bookmarks: Bookmark[]) {
  const [statuses, setStatuses] = useState<Record<string, DockerStatusResult>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dockerBookmarks = bookmarks.filter(
    (b) => b.server === "docker" && b.container
  );

  // Derive a stable key from container names
  const containerKey = dockerBookmarks.map((b) => b.container).sort().join(",");

  useEffect(() => {
    if (dockerBookmarks.length === 0) {
      setStatuses({});
      return;
    }

    let cancelled = false;

    async function fetchDockerStatus() {
      try {
        const res = await fetch("/api/docker/status");
        if (!res.ok || cancelled) return;
        const data = await res.json();

        const containerMap = new Map<string, ContainerStatus>();
        for (const c of data.containers || []) {
          containerMap.set(c.name, c);
        }

        const result: Record<string, DockerStatusResult> = {};
        for (const b of dockerBookmarks) {
          if (cancelled) return;
          // Check cache first
          const cached = dockerCache.get(b.container);
          if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            result[b.container] = cached.result;
            continue;
          }

          const container = containerMap.get(b.container);
          const statusResult: DockerStatusResult = container
            ? {
                state: (["running", "exited", "restarting", "paused"].includes(container.state)
                  ? container.state
                  : "unknown") as DockerStatusResult["state"],
                status: container.status,
              }
            : { state: "exited", status: "Not found" };

          dockerCache.set(b.container, { result: statusResult, timestamp: Date.now() });
          result[b.container] = statusResult;
        }
        if (!cancelled) setStatuses(result);
      } catch {
        // Docker status unavailable — keep previous state
      }
    }

    // Initial fetch
    fetchDockerStatus();

    // Poll at interval
    intervalRef.current = setInterval(fetchDockerStatus, DEFAULT_POLL_INTERVAL);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerKey]);

  return { statuses };
}
