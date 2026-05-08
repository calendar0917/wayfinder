"use client";

import { useEffect, useState } from "react";
import { WidgetCard } from "@/components/ui/WidgetCard";
import { weatherCodeToText } from "@/lib/weather";
import { mutate as mutateApi } from "@/lib/mutate";

interface WeatherWidgetProps {
  config: Record<string, unknown>;
  onConfigChange?: () => void;
}

interface WeatherData {
  temperature: number;
  windspeed: number;
  description: string;
}

export function WeatherWidget({ config, onConfigChange }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [detecting, setDetecting] = useState(false);
  const lat = config.latitude as number;
  const lon = config.longitude as number;
  const units = (config.units as string) || "metric";

  useEffect(() => {
    if (!lat || !lon) return;
    const tempUnit = units === "imperial" ? "fahrenheit" : "celsius";
    const windUnit = units === "imperial" ? "mph" : "kmh";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,wind_speed_10m&temperature_unit=${tempUnit}&wind_speed_unit=${windUnit}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const c = data.current;
        setWeather({
          temperature: c?.temperature_2m ?? 0,
          windspeed: c?.wind_speed_10m ?? 0,
          description: weatherCodeToText(c?.weather_code ?? 0),
        });
      })
      .catch(() => {});
  }, [lat, lon, units]);

  const handleDetectLocation = () => {
    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const result = await mutateApi("update_widget_config", {
          type: "weather",
          config: { latitude: pos.coords.latitude, longitude: pos.coords.longitude, units },
        });
        if (!result) {
          // Fallback: show coordinates for manual config
          alert(`Detected location: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}\nAdd these to your weather widget config.`);
        }
        onConfigChange?.();
        setDetecting(false);
      },
      () => {
        alert("Could not detect location. Please add latitude and longitude to config.");
        setDetecting(false);
      }
    );
  };

  if (!lat || !lon) {
    return (
      <WidgetCard>
        <div className="text-sm text-text-secondary mb-2">
          Weather not configured
        </div>
        <button
          onClick={handleDetectLocation}
          disabled={detecting}
          className="text-xs text-accent hover:text-accent-hover cursor-pointer disabled:opacity-40"
        >
          {detecting ? "Detecting..." : "Use my location"}
        </button>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      {weather ? (
        <>
          <div className="text-2xl font-semibold">
            {weather.temperature}°{units === "imperial" ? "F" : "C"}
          </div>
          <div className="text-sm text-text-secondary">
            {weather.description} · Wind: {weather.windspeed}{" "}
            {units === "imperial" ? "mph" : "km/h"}
          </div>
        </>
      ) : (
        <div className="text-sm text-text-secondary">Loading...</div>
      )}
    </WidgetCard>
  );
}
