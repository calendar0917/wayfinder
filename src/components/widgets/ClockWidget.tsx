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

  if (!now) return <WidgetCard>...</WidgetCard>;

  const dateOpts: Intl.DateTimeFormatOptions = {
    dateStyle: (format.dateStyle as Intl.DateTimeFormatOptions["dateStyle"]) || "full",
  };
  const timeOpts: Intl.DateTimeFormatOptions = {
    timeStyle: (format.timeStyle as Intl.DateTimeFormatOptions["timeStyle"]) || "short",
  };

  return (
    <WidgetCard>
      <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
        {now.toLocaleDateString(locale, dateOpts)}
      </div>
      <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
        {now.toLocaleTimeString(locale, timeOpts)}
      </div>
    </WidgetCard>
  );
}
