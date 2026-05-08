"use client";

import { useEffect, useState } from "react";
import WidgetCard from "@/components/ui/WidgetCard";

interface WeatherData {
  temperature: number;
  windspeed: number;
  description: string;
  icon: string;
}

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch("/api/system")
      .then((r) => r.json())
      .then(() => {
        // Weather needs geolocation; fetch from open-meteo via a simple approach
        // For now, show placeholder if no weather API endpoint
      })
      .catch(() => {});
  }, []);

  // The weather data isn't exposed via a direct API endpoint,
  // so we render a simple version that could be expanded
  return (
    <WidgetCard>
      <div className="flex items-center gap-3">
        <span className="text-2xl">🌤</span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-[var(--text)]">Weather</span>
          <span className="text-xs text-[var(--text-secondary)]">
            Configure location for weather data
          </span>
        </div>
      </div>
    </WidgetCard>
  );
}
