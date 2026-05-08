"use client";

import { useEffect, useState } from "react";
import { WidgetCard } from "@/components/ui/WidgetCard";

interface ClockWidgetProps {
  config: Record<string, unknown>;
}

export function ClockWidget({ config }: ClockWidgetProps) {
  const [now, setNow] = useState<Date | null>(null);
  const format = (config.format as Record<string, string>) || {};
  const locale = (config.locale as string) || "en";

  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!now) {
    return (
      <WidgetCard>
        <div className="flex flex-col gap-1 animate-pulse">
          <div className="h-3 bg-surface-alt rounded w-3/4" />
          <div className="h-6 bg-surface-alt rounded w-1/2" />
        </div>
      </WidgetCard>
    );
  }

  const dateOpts: Intl.DateTimeFormatOptions = {
    dateStyle: (format.dateStyle as Intl.DateTimeFormatOptions["dateStyle"]) || "full",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    timeStyle: (format.timeStyle as Intl.DateTimeFormatOptions["timeStyle"]) || "short",
  };

  return (
    <WidgetCard>
      <div className="flex flex-col gap-0.5">
        <div className="text-[0.875rem] text-text-secondary">
          {now.toLocaleDateString(locale, dateOpts)}
        </div>
        <div className="text-[1.75rem] font-bold tracking-tight text-text leading-tight">
          {now.toLocaleTimeString(locale, timeOpts)}
        </div>
      </div>
    </WidgetCard>
  );
}
