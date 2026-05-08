"use client";

import type { IntegrationFieldResult } from "@/hooks/useIntegration";

interface IntegrationDisplayProps {
  fields: IntegrationFieldResult[];
  display: "inline" | "badge" | "card";
  loading?: boolean;
  error?: string | null;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    if (Number.isInteger(value)) return value.toLocaleString();
    return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
  return String(value);
}

export default function IntegrationDisplay({
  fields,
  display,
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
    // inline
    return <span className="text-xs text-[var(--text-tertiary)] animate-pulse">...</span>;
  }

  const nonEmpty = fields.filter((f) => formatValue(f.value) !== "");
  if (nonEmpty.length === 0) return null;

  if (display === "badge") {
    const first = nonEmpty[0];
    const val = formatValue(first.value);
    const text = first.label ? `${first.label}: ${val}` : val;
    return (
      <span
        className="inline-flex items-center px-1.5 py-0.5 text-[0.6rem] font-semibold rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0"
        title={text}
      >
        {text.length > 16 ? text.slice(0, 14) + "..." : text}
      </span>
    );
  }

  if (display === "card") {
    return (
      <div className="mt-1 pt-1 border-t border-[var(--border)] space-y-0.5">
        {nonEmpty.map((f) => (
          <div key={f.path} className="text-[0.7rem] text-[var(--text-secondary)] leading-tight">
            {f.label ? (
              <>
                <span className="font-medium text-[var(--text)]">{f.label}</span>{" "}
                {formatValue(f.value)}
              </>
            ) : (
              formatValue(f.value)
            )}
          </div>
        ))}
      </div>
    );
  }

  // inline — single line of "label: value · label: value"
  const parts = nonEmpty.map((f) => {
    const val = formatValue(f.value);
    return f.label ? `${f.label}: ${val}` : val;
  });
  return (
    <span className="text-xs text-[var(--text-secondary)]">
      {parts.join(" · ")}
    </span>
  );
}
