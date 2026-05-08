"use client";

import { useState } from "react";
import { WidgetCard } from "@/components/ui/WidgetCard";

interface LogoWidgetProps {
  config: Record<string, unknown>;
}

export function LogoWidget({ config }: LogoWidgetProps) {
  const src = config.src as string;
  const alt = (config.alt as string) || "Logo";
  const width = (config.width as number) || 200;
  const [failed, setFailed] = useState(false);

  if (!src) return null;

  return (
    <WidgetCard>
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          width={width}
          className="block max-h-16"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="text-[0.8rem] text-text-tertiary">Image failed to load</div>
      )}
    </WidgetCard>
  );
}
