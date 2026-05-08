"use client";

import { WidgetCard } from "@/components/ui/WidgetCard";

interface GreetingWidgetProps {
  config: Record<string, unknown>;
}

export function GreetingWidget({ config }: GreetingWidgetProps) {
  const text = (config.text as string) || "Welcome!";
  return (
    <WidgetCard>
      <div className="text-[1.25rem] font-semibold">{text}</div>
    </WidgetCard>
  );
}
