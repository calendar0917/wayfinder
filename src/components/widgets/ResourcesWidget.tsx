"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/ui/WidgetCard";

interface Resources {
  cpu: { percent: number };
  memory: { total: number; used: number; percent: number };
  uptime: { formatted: string };
  cpuTemp: { celsius: number | null };
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function ProgressBar({ value, threshold = 80 }: { value: number; threshold?: number }) {
  const level = value >= threshold ? "danger" : value >= threshold * 0.7 ? "warning" : "normal";
  const color =
    level === "danger"
      ? "var(--error)"
      : level === "warning"
        ? "var(--warning)"
        : "var(--accent)";
  return (
    <div className="h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{ width: `${Math.min(value, 100)}%`, background: color }}
      />
    </div>
  );
}

export default function ResourcesWidget() {
  const [resources, setResources] = useState<Resources | null>(null);

  useEffect(() => {
    function fetchResources() {
      fetch("/api/system")
        .then((r) => r.json())
        .then((data) => {
          if (data.cpu) setResources(data);
        })
        .catch(() => {});
    }
    fetchResources();
    const id = setInterval(fetchResources, 3000);
    return () => clearInterval(id);
  }, []);

  if (!resources) {
    return (
      <WidgetCard>
        <div className="text-sm text-[var(--text-tertiary)]">Loading resources...</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">CPU</span>
            <span className="text-xs font-bold text-[var(--text)]">
              {resources.cpu.percent}%
            </span>
          </div>
          <ProgressBar value={resources.cpu.percent} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-[var(--text-secondary)]">Memory</span>
            <span className="text-xs font-bold text-[var(--text)]">
              {resources.memory.percent}%
            </span>
          </div>
          <ProgressBar value={resources.memory.percent} />
        </div>
        {resources.cpuTemp.celsius !== null && (
          <div className="flex flex-col gap-1 col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--text-secondary)]">CPU Temp</span>
              <span className="text-xs font-bold text-[var(--text)]">
                {resources.cpuTemp.celsius}°C
              </span>
            </div>
            <ProgressBar value={(resources.cpuTemp.celsius / 100) * 100} threshold={85} />
          </div>
        )}
        <div className="flex flex-col gap-1 col-span-1">
          <span className="text-xs font-medium text-[var(--text-secondary)]">Uptime</span>
          <span className="text-xs font-bold text-[var(--text)]">
            {resources.uptime.formatted}
          </span>
        </div>
      </div>
    </WidgetCard>
  );
}
