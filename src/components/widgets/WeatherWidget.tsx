"use client";

import { useEffect, useState } from "react";
import { WidgetCard } from "@/components/ui/WidgetCard";

interface WeatherWidgetProps {
  config: Record<string, unknown>;
}

interface WeatherData {
  temperature: number;
  windspeed: number;
  description: string;
}

export function WeatherWidget({ config }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
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

  if (!lat || !lon) {
    return (
      <WidgetCard>
        <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
          Weather not configured
        </div>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      {weather ? (
        <>
          <div style={{ fontSize: "1.5rem", fontWeight: 600 }}>
            {weather.temperature}°{units === "imperial" ? "F" : "C"}
          </div>
          <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
            {weather.description} · Wind: {weather.windspeed}{" "}
            {units === "imperial" ? "mph" : "km/h"}
          </div>
        </>
      ) : (
        <div style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>Loading...</div>
      )}
    </WidgetCard>
  );
}

function weatherCodeToText(code: number): string {
  const map: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Rime fog", 51: "Light drizzle", 53: "Moderate drizzle",
    55: "Dense drizzle", 61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow",
    80: "Rain showers", 81: "Moderate showers", 82: "Violent showers",
    95: "Thunderstorm", 96: "Thunderstorm + hail", 99: "Heavy hail storm",
  };
  return map[code] ?? "Unknown";
}
