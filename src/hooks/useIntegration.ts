"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { BookmarkIntegration, IntegrationField } from "@/types/config";
import { resolvePath } from "@/lib/json-path";

export interface IntegrationFieldResult {
  path: string;
  label: string;
  value: unknown;
}

export interface IntegrationResult {
  fields: IntegrationFieldResult[];
  loading: boolean;
  error: string | null;
}

interface CacheEntry {
  result: IntegrationFieldResult[];
  timestamp: number;
}

const integrationCache = new Map<string, CacheEntry>();

function extractFields(data: unknown, fields: IntegrationField[]): IntegrationFieldResult[] {
  return fields.map((f) => ({
    path: f.path,
    label: f.label,
    value: resolvePath(data, f.path),
  }));
}

export function useIntegration(
  integrations: Array<{ key: string; config: BookmarkIntegration }>
) {
  const [results, setResults] = useState<Map<string, IntegrationResult>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const fetchData = useCallback(async (key: string, config: BookmarkIntegration) => {
    const cacheTtl = Math.min(config.pollInterval * 500, 30_000);
    const cached = integrationCache.get(key);
    if (cached && Date.now() - cached.timestamp < cacheTtl) {
      const extracted = cached.result;
      setResults((prev) => {
        const next = new Map(prev);
        next.set(key, { fields: extracted, loading: false, error: null });
        return next;
      });
      return;
    }

    setResults((prev) => {
      const next = new Map(prev);
      const existing = prev.get(key);
      next.set(key, { fields: existing?.fields || [], loading: true, error: null });
      return next;
    });

    try {
      const res = await fetch("/api/integration/proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookmarkName: key }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setResults((prev) => {
          const next = new Map(prev);
          const existing = prev.get(key);
          next.set(key, { fields: existing?.fields || [], loading: false, error: err.error || "Request failed" });
          return next;
        });
        return;
      }
      const { data } = await res.json();
      const extracted = extractFields(data, config.fields);
      integrationCache.set(key, { result: extracted, timestamp: Date.now() });
      setResults((prev) => {
        const next = new Map(prev);
        next.set(key, { fields: extracted, loading: false, error: null });
        return next;
      });
    } catch {
      setResults((prev) => {
        const next = new Map(prev);
        const existing = prev.get(key);
        next.set(key, { fields: existing?.fields || [], loading: false, error: "Network error" });
        return next;
      });
    }
  }, []);

  const stableKey = integrations.map((i) => {
    const fieldsKey = i.config.fields.map((f) => `${f.path}:${f.type}`).join(";");
    return `${i.key}:${i.config.endpoint}:${i.config.pollInterval}:${fieldsKey}`;
  }).join(",");

  useEffect(() => {
    for (const timer of timersRef.current.values()) clearTimeout(timer);
    timersRef.current.clear();

    if (integrations.length === 0) return;

    for (const { key, config } of integrations) {
      fetchData(key, config).then(() => {
        const scheduleNext = () => {
          const timer = setTimeout(() => {
            fetchData(key, config).then(scheduleNext);
          }, config.pollInterval * 1000);
          timersRef.current.set(key, timer);
        };
        scheduleNext();
      });
    }

    return () => {
      for (const timer of timersRef.current.values()) clearTimeout(timer);
      timersRef.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stableKey]);

  return { results };
}
