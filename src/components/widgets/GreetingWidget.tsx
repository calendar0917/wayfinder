"use client";

import WidgetCard from "@/components/ui/WidgetCard";

interface GreetingWidgetProps {
  title: string;
}

export default function GreetingWidget({ title }: GreetingWidgetProps) {
  const hour = new Date().getHours();
  let greeting: string;
  if (hour < 6) greeting = "Good night";
  else if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";

  return (
    <WidgetCard>
      <div className="flex flex-col gap-0.5">
        <span className="text-sm text-[var(--text-secondary)]">{greeting}</span>
        <span className="text-lg font-bold text-[var(--text)]">{title}</span>
      </div>
    </WidgetCard>
  );
}
