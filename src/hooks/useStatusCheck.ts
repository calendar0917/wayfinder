"use client";

import { useState, useEffect, useRef } from "react";
import type { Bookmark } from "@/types/config";

export interface StatusResult {
  status: "up" | "down" | "error" | "checking" | "unknown";
  responseTime?: number;
  statusCode?: number;
}

const statusCache = new Map<string, { result: StatusResult; timestamp: number }>();
const CACHE_DURATION = 60_000;
const CACHE_MAX_AGE = 5 * 60_000; // 5 min max — evict stale entries on read

export function useStatusCheck(bookmarks: Bookmark[]) {
  const [statuses, setStatuses] = useState<Map<string, StatusResult>>(new Map());
  const checkedRef = useRef<string>("");

  const checkableUrls = bookmarks
    .filter((b) => b.statusCheck)
    .map((b) => b.url)
    .sort()
    .join(",");

  useEffect(() => {
    const now = Date.now();
    for (const [key, entry] of statusCache) {
      if (now - entry.timestamp > CACHE_MAX_AGE) statusCache.delete(key);
    }

    if (!checkableUrls) return;
    if (checkableUrls === checkedRef.current) {
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
    checkedRef.current = checkableUrls;

    const toCheck = bookmarks.filter((b) => b.statusCheck);
    if (toCheck.length === 0) return;

    const uncached = toCheck.filter(
      (b) => !statusCache.has(b.url) || Date.now() - statusCache.get(b.url)!.timestamp >= CACHE_DURATION
    );

    if (uncached.length === 0) {
      const cached = new Map<string, StatusResult>();
      for (const b of toCheck) {
        const entry = statusCache.get(b.url);
        if (entry) cached.set(b.url, entry.result);
      }
      setStatuses(cached);
      return;
    }

    // Mark all as checking
    setStatuses((prev) => {
      const next = new Map(prev);
      for (const b of uncached) {
        next.set(b.url, { status: "checking" });
      }
      return next;
    });

    fetch("/api/status-check/public")
      .then((res) => res.json())
      .then((data: Record<string, StatusResult>) => {
        const now = Date.now();
        const updated = new Map<string, StatusResult>();
        for (const b of toCheck) {
          const cached = statusCache.get(b.url);
          if (cached && now - cached.timestamp < CACHE_DURATION) {
            updated.set(b.url, cached.result);
          }
        }
        for (const [url, result] of Object.entries(data)) {
          const statusResult: StatusResult = {
            status: result.status as StatusResult["status"],
            responseTime: result.responseTime,
            statusCode: result.statusCode,
          };
          statusCache.set(url, { result: statusResult, timestamp: now });
          updated.set(url, statusResult);
        }
        setStatuses(updated);
      })
      .catch(() => {
        setStatuses((prev) => {
          const next = new Map(prev);
          for (const b of uncached) {
            next.set(b.url, { status: "error" });
          }
          return next;
        });
      });
  }, [checkableUrls]); // eslint-disable-line react-hooks/exhaustive-deps

  return { statuses };
}
