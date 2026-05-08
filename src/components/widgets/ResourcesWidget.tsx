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
        <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading...</div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              Uptime
            </span>
            <span style={{ fontSize: "0.875rem" }}>{data.uptime.formatted}</span>
          </div>
        )}
        {showCpuTemp && data.cpuTemp.celsius !== null && (
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
              CPU Temp
            </span>
            <span style={{ fontSize: "0.875rem" }}>{data.cpuTemp.celsius}°C</span>
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.875rem" }}>{value}</span>
      </div>
      <div
        style={{
          height: 4,
          background: "var(--border)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(percent, 100)}%`,
            background:
              percent > 80 ? "#ef4444" : percent > 60 ? "#f59e0b" : "var(--accent)",
            borderRadius: 2,
            transition: "width 0.3s",
          }}
        />
      </div>
    </div>
  );
}
