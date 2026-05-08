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
        <div className="flex flex-col gap-2 animate-pulse">
          <div className="h-4 bg-surface-alt rounded w-2/3" />
          <div className="h-1.5 bg-surface-alt rounded-full w-full" />
          <div className="h-4 bg-surface-alt rounded w-1/2" />
          <div className="h-1.5 bg-surface-alt rounded-full w-full" />
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      <div className="flex flex-col gap-3">
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
            <span className="text-[0.875rem] text-text-secondary">Uptime</span>
            <span className="text-[0.875rem] font-medium">{data.uptime.formatted}</span>
          </div>
        )}
        {showCpuTemp && data.cpuTemp.celsius !== null && (
          <div className="flex justify-between">
            <span className="text-[0.875rem] text-text-secondary">CPU Temp</span>
            <span className="text-[0.875rem] font-medium">{data.cpuTemp.celsius}°C</span>
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
  const barColor = percent > 80 ? "bg-error" : percent > 60 ? "bg-warning" : "bg-accent";
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-[0.875rem] text-text-secondary">{label}</span>
        <span className="text-[0.875rem] font-medium">{value}</span>
      </div>
      <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ${barColor}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}
