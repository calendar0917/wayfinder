"use client";

import { WidgetCard } from "@/components/ui/WidgetCard";

interface GreetingWidgetProps {
  config: Record<string, unknown>;
}

export function GreetingWidget({ config }: GreetingWidgetProps) {
  const text = (config.text as string) || "Welcome!";
  return (
    <WidgetCard>
      <div style={{ fontSize: "1.25rem", fontWeight: 500 }}>{text}</div>
    </WidgetCard>
  );
}
