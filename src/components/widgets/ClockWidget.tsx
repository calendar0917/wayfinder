"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/ui/WidgetCard";
import type { DateTimeConfig } from "@/types/config";

interface ClockWidgetProps {
  config: DateTimeConfig;
}

export default function ClockWidget({ config }: ClockWidgetProps) {
  const [now, setNow] = useState<Date | null>(null);
  const locale = config.locale || config.format?.locale || "en";

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!now) {
    return (
      <WidgetCard>
        <div className="text-[var(--text-tertiary)] text-sm">--:--</div>
      </WidgetCard>
    );
  }

  const dateStr = now.toLocaleDateString(locale, {
    dateStyle: (config.format?.dateStyle as Intl.DateTimeFormatOptions["dateStyle"]) || "full",
  });
  const timeStr = now.toLocaleTimeString(locale, {
    timeStyle: (config.format?.timeStyle as Intl.DateTimeFormatOptions["timeStyle"]) || "short",
  });

  return (
    <WidgetCard>
      <div className="flex flex-col gap-1">
        <span className="text-xl font-bold tracking-tight text-[var(--text)]">
          {timeStr}
        </span>
        <span className="text-xs text-[var(--text-secondary)]">
          {dateStr}
        </span>
      </div>
    </WidgetCard>
  );
}
