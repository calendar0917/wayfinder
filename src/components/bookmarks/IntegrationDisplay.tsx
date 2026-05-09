"use client";

import type { IntegrationFieldResult } from "@/hooks/useIntegration";

interface IntegrationDisplayProps {
  fields: IntegrationFieldResult[];
  display: "inline" | "badge" | "card";
  fieldTypes?: Record<string, string>;
  loading?: boolean;
  error?: string | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes < 1024 * 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  return `${(bytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)} TB`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

function formatBitrate(bytesPerSec: number): string {
  if (bytesPerSec < 1024) return `${bytesPerSec} B/s`;
  if (bytesPerSec < 1024 * 1024) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  if (bytesPerSec < 1024 * 1024 * 1024) return `${(bytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`;
  return `${(bytesPerSec / (1024 * 1024 * 1024)).toFixed(1)} GB/s`;
}

function formatNumber(n: number): string {
  if (Math.abs(n) >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function statusColor(value: unknown): string {
  const s = String(value).toLowerCase().trim();
  if (["running", "active", "online", "up", "healthy", "ok", "true", "1", "yes"].includes(s)) return "green";
  if (["stopped", "error", "offline", "down", "unhealthy", "false", "0", "no", "exited", "dead"].includes(s)) return "red";
  return "yellow";
}

function temperatureColor(value: number): string {
  if (value < 40) return "green";
  if (value < 70) return "yellow";
  return "red";
}

function renderTypedValue(value: unknown, type: string): React.ReactNode {
  if (value === null || value === undefined) return "";
  const num = typeof value === "number" ? value : Number(value);
  const isNum = !isNaN(num);

  switch (type) {
    case "percent": {
      const pct = isNum ? num : 0;
      const clamped = Math.max(0, Math.min(100, pct));
      return (
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block w-12 h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
            <span className="block h-full bg-[var(--accent)] rounded-full" style={{ width: `${clamped}%` }} />
          </span>
          <span>{isNum ? pct.toFixed(pct % 1 === 0 ? 0 : 1) : String(value)}%</span>
        </span>
      );
    }
    case "status": {
      const color = statusColor(value);
      return (
        <span className="inline-flex items-center gap-1">
          <span className={`inline-block w-2 h-2 rounded-full ${color === "green" ? "bg-green-500" : color === "red" ? "bg-red-500" : "bg-yellow-500"}`} />
          <span>{String(value)}</span>
        </span>
      );
    }
    case "bytes":
      return isNum ? formatBytes(num) : String(value);
    case "duration":
      return isNum ? formatDuration(num) : String(value);
    case "bitrate":
      return isNum ? formatBitrate(num) : String(value);
    case "temperature": {
      return (
        <span className="inline-flex items-center gap-1">
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${isNum ? (temperatureColor(num) === "green" ? "bg-green-500" : temperatureColor(num) === "yellow" ? "bg-yellow-500" : "bg-red-500") : "bg-gray-400"}`} />
          <span>{isNum ? `${num.toFixed(1)}°C` : String(value)}</span>
        </span>
      );
    }
    case "number":
      return isNum ? formatNumber(num) : String(value);
    default:
      if (typeof value === "number") {
        if (Number.isInteger(value)) return value.toLocaleString();
        return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
      }
      return String(value);
  }
}

export default function IntegrationDisplay({
  fields,
  display,
  fieldTypes,
  loading,
  error,
}: IntegrationDisplayProps) {
  if (error) return null;
  if (loading) {
    if (display === "badge") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-semibold rounded bg-gray-500/15 text-gray-500 dark:text-gray-400 shrink-0 animate-pulse">
          ...
        </span>
      );
    }
    if (display === "card") {
      return (
        <div className="mt-1 pt-1 border-t border-[var(--border)]">
          <div className="h-3 w-24 bg-[var(--surface-alt)] rounded animate-pulse" />
        </div>
      );
    }
    return <span className="text-xs text-[var(--text-tertiary)] animate-pulse">...</span>;
  }

  const nonEmpty = fields.filter((f) => {
    if (f.value === null || f.value === undefined) return false;
    return String(f.value) !== "";
  });
  if (nonEmpty.length === 0) return null;

  if (display === "badge") {
    const first = nonEmpty[0];
    const type = fieldTypes?.[first.path] || "text";
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-semibold rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0"
        title={first.label ? `${first.label}: ${String(first.value)}` : String(first.value)}
      >
        {first.label ? <span className="mr-0.5">{first.label}</span> : null}
        {renderTypedValue(first.value, type)}
      </span>
    );
  }

  if (display === "card") {
    return (
      <div className="mt-1 pt-1 border-t border-[var(--border)] space-y-0.5">
        {nonEmpty.map((f) => {
          const type = fieldTypes?.[f.path] || "text";
          return (
            <div key={f.path} className="text-[0.7rem] text-[var(--text-secondary)] leading-tight">
              {f.label ? (
                <>
                  <span className="font-medium text-[var(--text)]">{f.label}</span>{" "}
                  {renderTypedValue(f.value, type)}
                </>
              ) : (
                renderTypedValue(f.value, type)
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // inline
  return (
    <span className="text-xs text-[var(--text-secondary)] inline-flex items-center gap-1 flex-wrap">
      {nonEmpty.map((f, i) => {
        const type = fieldTypes?.[f.path] || "text";
        return (
          <span key={f.path} className="inline-flex items-center gap-0.5">
            {i > 0 && <span> · </span>}
            {f.label ? <span className="font-medium text-[var(--text)]">{f.label}</span> : null}
            {f.label ? " " : null}
            {renderTypedValue(f.value, type)}
          </span>
        );
      })}
    </span>
  );
}
