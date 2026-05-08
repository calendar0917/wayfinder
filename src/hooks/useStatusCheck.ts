"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Bookmark } from "@/types/config";

export interface StatusResult {
  status: "up" | "down" | "error" | "checking" | "unknown";
  responseTime?: number;
  statusCode?: number;
}

const statusCache = new Map<string, { result: StatusResult; timestamp: number }>();
const CACHE_DURATION = 60_000;

export function useStatusCheck(bookmarks: Bookmark[]) {
  const [statuses, setStatuses] = useState<Map<string, StatusResult>>(new Map());
  const pendingRef = useRef<Set<string>>(new Set());
  const checkedRef = useRef<string>("");

  // Derive a stable key from the bookmark URLs that need checking
  const checkableUrls = bookmarks
    .filter((b) => b.statusCheck)
    .map((b) => b.url)
    .sort()
    .join(",");
  const stableKey = checkableUrls;

  const checkStatus = useCallback(async (url: string): Promise<StatusResult> => {
    const cached = statusCache.get(url);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.result;
    }

    try {
      const res = await fetch("/api/status-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) return { status: "error" };
      const data = await res.json();
      const result: StatusResult = {
        status: data.status,
        responseTime: data.responseTime,
        statusCode: data.statusCode,
      };
      statusCache.set(url, { result, timestamp: Date.now() });
      return result;
    } catch {
      return { status: "error" };
    }
  }, []);

  useEffect(() => {
    if (!stableKey) return;
    // Skip if we've already checked this exact set of URLs
    if (stableKey === checkedRef.current) {
      // Still populate status from cache
      const toCheck = bookmarks.filter((b) => b.statusCheck);
      if (toCheck.length > 0) {
        const cached = new Map<string, StatusResult>();
        for (const b of toCheck) {
          const entry = statusCache.get(b.url);
          if (entry) cached.set(b.url, entry.result);
        }
        if (cached.size > 0) setStatuses(cached);
      }
      return;
    }
    checkedRef.current = stableKey;

    const toCheck = bookmarks.filter((b) => b.statusCheck);
    if (toCheck.length === 0) return;

    const uncached = toCheck.filter(
      (b) => !statusCache.has(b.url) || Date.now() - statusCache.get(b.url)!.timestamp >= CACHE_DURATION
    );

    let running = 0;
    let index = 0;
    const MAX_CONCURRENT = 5;

    function processNext() {
      while (running < MAX_CONCURRENT && index < uncached.length) {
        const b = uncached[index++];
        if (pendingRef.current.has(b.url)) continue;
        running++;
        pendingRef.current.add(b.url);

        setStatuses((prev) => {
          const next = new Map(prev);
          next.set(b.url, { status: "checking" });
          return next;
        });

        checkStatus(b.url).then((result) => {
          pendingRef.current.delete(b.url);
          setStatuses((prev) => {
            const next = new Map(prev);
            next.set(b.url, result);
            return next;
          });
          running--;
          processNext();
        });
      }
    }
    processNext();
  }, [stableKey, checkStatus]); // eslint-disable-line react-hooks/exhaustive-deps

  return { statuses, checkStatus };
}
