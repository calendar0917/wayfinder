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
  code: number;
}

const weatherIcons: Record<string, string> = {
  clear: "☀️",
  cloudy: "⛅",
  overcast: "☁️",
  fog: "🌫️",
  drizzle: "🌦️",
  rain: "🌧️",
  snow: "🌨️",
  thunder: "⛈️",
};

function getWeatherIcon(code: number): string {
  if (code === 0) return weatherIcons.clear;
  if (code <= 3) return weatherIcons.cloudy;
  if (code <= 48) return weatherIcons.fog;
  if (code <= 57) return weatherIcons.drizzle;
  if (code <= 67) return weatherIcons.rain;
  if (code <= 77) return weatherIcons.snow;
  if (code <= 82) return weatherIcons.rain;
  if (code <= 86) return weatherIcons.snow;
  if (code <= 99) return weatherIcons.thunder;
  return weatherIcons.cloudy;
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
          code: c?.weather_code ?? 0,
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
        if (result) onConfigChange?.();
        setDetecting(false);
      },
      () => {
        setDetecting(false);
      }
    );
  };

  if (!lat || !lon) {
    return (
      <WidgetCard>
        <div className="text-[0.875rem] text-text-secondary mb-3">
          Weather not configured
        </div>
        <button
          onClick={handleDetectLocation}
          disabled={detecting}
          className="bg-accent-soft text-accent rounded-lg px-3 py-1.5 text-[0.8rem] font-medium cursor-pointer transition-all duration-150 hover:bg-accent-soft-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {detecting ? "Detecting..." : "Use my location"}
        </button>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      {weather ? (
        <div className="flex items-center gap-3">
          <span className="text-3xl leading-none">{getWeatherIcon(weather.code)}</span>
          <div>
            <div className="text-[1.75rem] font-bold tracking-tight leading-tight">
              {weather.temperature}°{units === "imperial" ? "F" : "C"}
            </div>
            <div className="text-[0.8rem] text-text-secondary">
              {weather.description} · Wind: {weather.windspeed} {units === "imperial" ? "mph" : "km/h"}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1 animate-pulse">
          <div className="h-8 bg-surface-alt rounded w-1/3" />
          <div className="h-4 bg-surface-alt rounded w-2/3" />
        </div>
      )}
    </WidgetCard>
  );
}
