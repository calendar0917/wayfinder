"use client";

import { WidgetCard } from "@/components/ui/WidgetCard";

interface LogoWidgetProps {
  config: Record<string, unknown>;
}

export function LogoWidget({ config }: LogoWidgetProps) {
  const src = config.src as string;
  const alt = (config.alt as string) || "Logo";
  const width = (config.width as number) || 200;

  if (!src) return null;

  return (
    <WidgetCard>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        className="block"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
        }}
      />
    </WidgetCard>
  );
}
