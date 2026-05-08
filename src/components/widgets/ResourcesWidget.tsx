"use client";

import { useEffect, useState } from "react";
import { WidgetCard } from "@/components/ui/WidgetCard";

interface ResourcesWidgetProps {
  config: Record<string, unknown>;
}

interface SystemData {
  cpu: { percent: number };
  memory: { total: number; used: number; percent: number };
  uptime: { seconds: number; formatted: string };
  cpuTemp: { celsius: number | null };
}

export function ResourcesWidget({ config }: ResourcesWidgetProps) {
  const [data, setData] = useState<SystemData | null>(null);
  const showCpu = config.cpu !== false;
  const showMemory = config.memory !== false;
  const showUptime = config.uptime !== false;
  const showCpuTemp = config.cpuTemp === true;

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      try {
        const res = await fetch("/api/system");
        if (res.ok && mounted) {
          setData(await res.json());
        }
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (!data) {
    return (
      <WidgetCard>
        <div className="text-sm text-text-secondary">Loading...</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      <div className="flex flex-col gap-2">
        {showCpu && (
          <StatRow label="CPU" value={`${data.cpu.percent}%`} percent={data.cpu.percent} />
        )}
        {showMemory && (
          <StatRow
            label="Memory"
            value={`${data.memory.percent}%`}
            percent={data.memory.percent}
          />
        )}
        {showUptime && (
          <div className="flex justify-between">
            <span className="text-sm text-text-secondary">
              Uptime
            </span>
            <span className="text-sm">{data.uptime.formatted}</span>
          </div>
        )}
        {showCpuTemp && data.cpuTemp.celsius !== null && (
          <div className="flex justify-between">
            <span className="text-sm text-text-secondary">
              CPU Temp
            </span>
            <span className="text-sm">{data.cpuTemp.celsius}°C</span>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}

function StatRow({
  label,
  value,
  percent,
}: {
  label: string;
  value: string;
  percent: number;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1">
        <span className="text-sm text-text-secondary">
          {label}
        </span>
        <span className="text-sm">{value}</span>
      </div>
      <div className="h-1 bg-border rounded-sm overflow-hidden">
        <div
          className={`h-full rounded-sm transition-[width] duration-300 ${
            percent > 80 ? "bg-red-500" : percent > 60 ? "bg-amber-500" : "bg-accent"
          }`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
